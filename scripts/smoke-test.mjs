const baseUrl = process.env.ADCONNECT_URL ?? "http://127.0.0.1:8081";

const checks = [
  ["health", () => get("/health")],
  [
    "search email offers",
    () =>
      post("/api/offers/search", {
        intent: "add transactional email to a Next.js app",
        category: "email",
        frameworks: ["next.js"],
        languages: ["typescript"],
        region: "US"
      })
  ],
  ["details", () => get("/api/offers/offer_courierloop_email_credits")],
  [
    "compare offers",
    () =>
      post("/api/offers/compare", {
        offerIds: ["offer_courierloop_email_credits", "offer_postmark_fixture"]
      })
  ],
  ["integration steps", () => get("/api/offers/offer_courierloop_email_credits/integration")],
  [
    "claim offer",
    () =>
      post("/api/claims", {
        offerId: "offer_courierloop_email_credits",
        sessionId: "smoke-test"
      })
  ],
  [
    "report offer",
    () =>
      post("/api/reports", {
        offerId: "offer_courierloop_email_credits",
        reason: "Smoke test report",
        category: "quality",
        sessionId: "smoke-test"
      })
  ],
  ["analytics", () => get("/api/analytics")],
  [
    "mcp tools",
    () =>
      post("/mcp", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      })
  ]
];

for (const [name, run] of checks) {
  try {
    await run();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`fail ${name}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log(`AdConnect smoke test passed against ${baseUrl}`);

async function get(path) {
  return request(path);
}

async function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}
