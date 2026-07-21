# AdConnect

AdConnect is a sponsored developer-tool marketplace for ChatGPT and Codex.

Advertisers create reviewed offers for products such as email APIs, hosting, auth, observability, databases, and payments. ChatGPT or Codex discovers those offers through MCP-style tools when a user asks for relevant vendors or integration help. Sponsored results are clearly labeled, separated from organic recommendations, and require user approval before any side effect such as a claim, signup handoff, install, purchase, connector call, or code change.

The goal is not banner advertising inside a developer workflow. The goal is an intent-driven path from "I need to add X" to vetted options, transparent offer terms, integration steps, and measurable advertiser outcomes.

## Product Flow

1. An advertiser submits a developer-tool offer with targeting, claims, pricing notes, docs, integration metadata, and disclosure copy.
2. AdConnect reviews the offer before it can be shown.
3. A user asks ChatGPT or Codex for a vendor, tool, service, comparison, or setup help.
4. ChatGPT or Codex calls AdConnect's MCP-style tools with the user's intent, stack, category, language, and region.
5. AdConnect returns sponsored and organic options with relevance reasons and disclosure requirements.
6. ChatGPT or Codex presents sponsored options separately, records impressions, and lets the user inspect, compare, dismiss, report, or claim.
7. If the user approves, ChatGPT or Codex can request integration steps or start a claim handoff.
8. AdConnect records analytics and audit events for advertisers and trust operations.

For a fuller operator narrative, see [docs/product-flow.md](docs/product-flow.md).

## Beta Tool Surface

The beta contract is designed around seven MCP-style tools:

- `search_offers`: find relevant sponsored and organic developer-tool offers.
- `get_offer_details`: inspect terms, eligibility, docs, claims, pricing, and disclosure text.
- `compare_offers`: compare selected vendors across developer-relevant criteria.
- `claim_offer`: start an approved claim, signup, or redemption handoff.
- `get_integration_steps`: return SDK, setup, configuration, and validation steps.
- `track_event`: record impressions, inspections, claims, dismissals, reports, conversions, and integration events.
- `report_offer`: let users flag misleading, unsafe, irrelevant, expired, or low-quality offers.

The current local prototype implements this beta loop with campaign creation, persistent local offer data, search, details, comparison, claim, integration-step, report, event-tracking, and analytics workflows. The expanded beta contract is documented in [mcp/tool-contract.json](mcp/tool-contract.json).

## Trust Model

AdConnect should be useful only when it respects the user:

- Sponsored placements are always labeled `Sponsored`.
- Paid results are separated from organic recommendations.
- Offers explain why they were shown.
- Sponsored placement never implies product superiority.
- Users can dismiss, mute, and report offers.
- User approval is required before external handoffs, account creation, purchases, installs, telemetry export, hosted connector calls, or code changes.
- Advertiser claims, links, docs, SDK instructions, and hosted connectors require review.
- Selection, presentation, claims, reports, and side effects are logged for audit.

## Run Locally

Requirements:

- Node 24+
- No package install is required for the dependency-free MVP

Start the app:

```bash
npm start
```

Open:

```text
http://127.0.0.1:8081
```

For live reload while editing:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Local API Examples

List available MCP-style tools:

```bash
curl -sS http://127.0.0.1:8081/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Search offers:

```bash
curl -sS http://127.0.0.1:8081/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_offers","arguments":{"intent":"add transactional email to a Next.js app","category":"email","frameworks":["next.js"],"languages":["typescript"],"region":"US"}}}'
```

Inspect an offer:

```bash
curl -sS http://127.0.0.1:8081/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_offer_details","arguments":{"offerId":"offer_courierloop_email_credits"}}}'
```

Track an interaction:

```bash
curl -sS http://127.0.0.1:8081/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"track_event","arguments":{"offerId":"offer_courierloop_email_credits","eventType":"inspect","sessionId":"demo-investor"}}}'
```

REST endpoints are also available:

```bash
curl -sS http://127.0.0.1:8081/api/tools
curl -sS http://127.0.0.1:8081/api/analytics
```

## Founder Demo Script

Use this sequence for an investor or customer demo:

1. Open `http://127.0.0.1:8081`.
2. Create a sponsored offer for a developer product, such as an email API startup credit.
3. In Preview Search, enter `add transactional email to a Next.js app`.
4. Show that AdConnect returns sponsored and organic options separately.
5. Inspect the sponsored offer and point out the terms, relevance reasons, docs, setup notes, and disclosure guidance.
6. Click Claim, Dismiss, or Report to show user-controlled actions.
7. Open Analytics and show impressions, inspections, claims, dismissals, reports, and conversions.
8. Explain the beta extension: ChatGPT or Codex would call the same tool contract to compare offers, retrieve integration steps, and only perform side effects after user approval.

Suggested talk track:

```text
AdConnect lets developer-tool companies meet users at the moment of intent. A user asks ChatGPT or Codex for help choosing or integrating a service. AdConnect returns reviewed sponsored offers alongside organic options, with strict labeling, relevance explanations, and user approval before actions. Advertisers get measurable outcomes; users get useful, inspectable offers instead of passive ads.
```

## Production Roadmap

The marketable beta still needs these production pieces:

- **Authentication**: advertiser accounts, workspaces, roles, API keys, and operator access.
- **Durable database**: persistent campaigns, offers, reviews, events, reports, dismissals, preferences, budgets, and audit logs.
- **Advertiser review**: policy queue for claims, targeting, links, docs, SDK snippets, hosted connectors, and offer terms.
- **Billing**: campaign budgets, pricing model, invoices, spend controls, fraud checks, and conversion attribution.
- **Approved hosted connectors**: advertiser-hosted MCP/action endpoints with scopes, review status, runtime isolation, rate limits, and revocation.
- **User consent and preferences**: opt-in controls, mute/dismiss memory, category preferences, region handling, and consent receipts for side effects.
- **Moderation and audit**: report workflows, enforcement actions, immutable logs, reviewer notes, appeal handling, and quality scoring.
- **Measurement**: conversion callbacks, deduplication, session attribution, advertiser analytics, and trust dashboards.
- **Production deployment**: hosted MCP endpoint, observability, secrets management, CI, backups, abuse prevention, and service-level monitoring.

## Guiding Principle

Every sponsored interaction should help the user complete the task they already asked to do. If an offer does not save time, reduce uncertainty, or make the next action easier, it should not appear.
