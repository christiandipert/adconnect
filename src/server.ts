import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import {
  createSponsoredCampaign,
  getAnalytics,
  getOfferDetails,
  listCampaigns,
  listCategories,
  listOffers,
  searchOffers,
  trackEvent,
  ValidationError
} from "./services/offerService.ts";
import { callTool, listTools } from "./mcp/tools.ts";

const PORT = Number(process.env.PORT ?? 8081);
const HOST = process.env.HOST ?? "127.0.0.1";
const PUBLIC_DIR = resolve(process.cwd(), "public");

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    await routeRequest(request, response);
  } catch (error) {
    sendError(response, error);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AdConnect MVP running at http://${HOST}:${PORT}`);
  console.log(`MCP JSON-RPC endpoint: http://${HOST}:${PORT}/mcp`);
});

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/health" && request.method === "GET") {
    sendJson(response, { ok: true, service: "adconnect", timestamp: new Date().toISOString() });
    return;
  }

  if (url.pathname === "/api/categories" && request.method === "GET") {
    sendJson(response, { categories: listCategories() });
    return;
  }

  if (url.pathname === "/api/campaigns" && request.method === "GET") {
    sendJson(response, { campaigns: listCampaigns() });
    return;
  }

  if (url.pathname === "/api/campaigns" && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, createSponsoredCampaign(body as never), 201);
    return;
  }

  if (url.pathname === "/api/offers" && request.method === "GET") {
    sendJson(response, { offers: listOffers() });
    return;
  }

  if (url.pathname === "/api/offers/search" && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, searchOffers(body as never));
    return;
  }

  const offerDetailMatch = url.pathname.match(/^\/api\/offers\/([^/]+)$/);
  if (offerDetailMatch && request.method === "GET") {
    sendJson(response, getOfferDetails(decodeURIComponent(offerDetailMatch[1])));
    return;
  }

  if (url.pathname === "/api/events" && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, trackEvent(body as never), 201);
    return;
  }

  if (url.pathname === "/api/analytics" && request.method === "GET") {
    sendJson(response, getAnalytics());
    return;
  }

  if (url.pathname === "/api/tools" && request.method === "GET") {
    sendJson(response, { tools: listTools() });
    return;
  }

  const toolCallMatch = url.pathname.match(/^\/api\/tools\/([^/]+)$/);
  if (toolCallMatch && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, callTool(decodeURIComponent(toolCallMatch[1]), body as Record<string, unknown>));
    return;
  }

  if (url.pathname === "/mcp" && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, await handleMcpRequest(body));
    return;
  }

  if (request.method === "GET") {
    await serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, { error: "Not found" }, 404);
}

async function handleMcpRequest(body: unknown): Promise<unknown> {
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((item) => handleMcpMessage(item)));
    return responses.filter(Boolean);
  }

  return handleMcpMessage(body);
}

async function handleMcpMessage(message: unknown): Promise<unknown> {
  if (!isRecord(message)) {
    return mcpError(null, -32600, "Invalid JSON-RPC request");
  }

  const id = "id" in message ? message.id : null;
  const method = String(message.method ?? "");

  if (!("id" in message)) {
    return null;
  }

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "adconnect-mvp",
              version: "0.1.0"
            }
          }
        };
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: listTools()
          }
        };
      case "tools/call": {
        const params = isRecord(message.params) ? message.params : {};
        const name = String(params.name ?? "");
        const args = isRecord(params.arguments) ? params.arguments : {};
        const result = callTool(name, args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ],
            structuredContent: result
          }
        };
      }
      default:
        return mcpError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    return mcpError(id, -32000, error instanceof Error ? error.message : "Tool call failed");
  }
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, { error: "Forbidden" }, 403);
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    response.end(content);
  } catch {
    sendJson(response, { error: "Not found" }, 404);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new ValidationError("Request body is too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
}

function sendJson(response: ServerResponse, data: unknown, statusCode = 200): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data, null, 2));
}

function sendError(response: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) {
    sendJson(response, { error: error.message }, error.statusCode);
    return;
  }

  console.error(error);
  sendJson(response, { error: "Internal server error" }, 500);
}

function mcpError(id: unknown, code: number, message: string): unknown {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  };
}

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
