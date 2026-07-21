import {
  claimOffer,
  compareOffers,
  getIntegrationSteps,
  getOfferDetails,
  reportOffer,
  searchOffers,
  trackEvent
} from "../services/offerService.ts";
import type { ToolDefinition } from "../types.ts";

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "search_offers",
    description:
      "Find relevant sponsored and organic developer-tool offers for a user intent. Sponsored results must be disclosed and kept separate from organic options.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["intent"],
      properties: {
        intent: {
          type: "string",
          description: "The user's task or buying intent, such as 'add transactional email'."
        },
        category: {
          type: "string",
          enum: [
            "email",
            "hosting",
            "observability",
            "auth",
            "payments",
            "database",
            "analytics",
            "ci_cd",
            "security"
          ]
        },
        frameworks: {
          type: "array",
          items: { type: "string" },
          description: "Frameworks detected in the user's project or request."
        },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Languages detected in the user's project or request."
        },
        region: {
          type: "string",
          description: "Optional user or business region, such as US, EU, or GLOBAL."
        },
        includeOrganic: {
          type: "boolean",
          default: true,
          description: "Whether to return organic comparison options."
        },
        limit: {
          type: "number",
          default: 6,
          minimum: 1,
          maximum: 20
        }
      }
    }
  },
  {
    name: "get_offer_details",
    description:
      "Return offer terms, docs, setup notes, eligibility, disclosure text, and safe presentation guidance.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerId"],
      properties: {
        offerId: {
          type: "string",
          description: "The AdConnect offer id returned by search_offers."
        }
      }
    }
  },
  {
    name: "compare_offers",
    description:
      "Compare selected sponsored and organic vendors across developer-relevant criteria while keeping sponsorship visible.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerIds"],
      properties: {
        offerIds: {
          type: "array",
          items: { type: "string" },
          minItems: 2
        }
      }
    }
  },
  {
    name: "claim_offer",
    description:
      "Start an approved sponsored offer claim or signup handoff. Only call after explicit user approval.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerId", "userApproval"],
      properties: {
        offerId: {
          type: "string"
        },
        userApproval: {
          type: "boolean",
          description: "Must be true only after explicit user approval."
        },
        sessionId: {
          type: "string"
        },
        metadata: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  },
  {
    name: "get_integration_steps",
    description:
      "Return reviewed setup instructions, install command, environment variables, config files, and approval reminders.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerId"],
      properties: {
        offerId: {
          type: "string"
        }
      }
    }
  },
  {
    name: "track_event",
    description:
      "Record offer events for analytics and audit logs. Use this for impressions, inspection, claims, dismissals, reports, and conversions.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerId", "eventType"],
      properties: {
        offerId: {
          type: "string"
        },
        eventType: {
          type: "string",
          enum: ["impression", "inspect", "claim", "dismiss", "report", "conversion"]
        },
        sessionId: {
          type: "string"
        },
        metadata: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  },
  {
    name: "report_offer",
    description:
      "Record a user report for a misleading, unsafe, irrelevant, expired, or low-quality offer.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["offerId", "reason"],
      properties: {
        offerId: {
          type: "string"
        },
        category: {
          type: "string",
          default: "quality"
        },
        reason: {
          type: "string"
        },
        sessionId: {
          type: "string"
        },
        metadata: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  }
];

export function listTools(): ToolDefinition[] {
  return structuredClone(toolDefinitions);
}

export function callTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "search_offers":
      return searchOffers({
        intent: String(args.intent ?? ""),
        category: typeof args.category === "string" ? args.category : undefined,
        frameworks: asStringArray(args.frameworks),
        languages: asStringArray(args.languages),
        region: typeof args.region === "string" ? args.region : undefined,
        includeOrganic:
          typeof args.includeOrganic === "boolean" ? args.includeOrganic : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined
      });
    case "get_offer_details":
      return getOfferDetails(String(args.offerId ?? ""));
    case "compare_offers":
      return compareOffers({
        offerIds: asStringArray(args.offerIds) ?? []
      });
    case "claim_offer":
      if (args.userApproval !== true) {
        throw new Error("claim_offer requires userApproval: true after explicit user approval.");
      }
      return claimOffer({
        offerId: String(args.offerId ?? ""),
        userApproval: true,
        sessionId: typeof args.sessionId === "string" ? args.sessionId : undefined,
        metadata: isRecord(args.metadata) ? args.metadata : undefined
      });
    case "get_integration_steps":
      return getIntegrationSteps(String(args.offerId ?? ""));
    case "track_event":
      return trackEvent({
        offerId: String(args.offerId ?? ""),
        eventType: String(args.eventType ?? "") as never,
        sessionId: typeof args.sessionId === "string" ? args.sessionId : undefined,
        metadata: isRecord(args.metadata) ? args.metadata : undefined
      });
    case "report_offer":
      return reportOffer({
        offerId: String(args.offerId ?? ""),
        category: typeof args.category === "string" ? args.category : "quality",
        reason: String(args.reason ?? ""),
        sessionId: typeof args.sessionId === "string" ? args.sessionId : undefined,
        metadata: isRecord(args.metadata) ? args.metadata : undefined
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
