# AdConnect

AdConnect is a concept for opt-in, interactive sponsored business integrations inside Codex. The goal is not to place passive banner ads into a developer workflow. The goal is to let businesses expose useful, clearly disclosed offers and actions that Codex can access when a user asks for relevant tools, vendors, services, or integrations.

## Product Thesis

Developers do not need more ad inventory inside their tools. They need useful paths from intent to action.

AdConnect should make sponsored placements behave like agentic workflows:

- A user asks Codex for help with a real task.
- Codex detects that a product, service, or vendor recommendation may be useful.
- AdConnect returns relevant organic and sponsored options with clear disclosure.
- The user can inspect, compare, dismiss, claim, or use an offer.
- Codex can then help with setup, code changes, documentation lookup, or configuration when the user approves.

The product should feel closer to developer procurement and integration discovery than traditional advertising.

## Example User Flow

```text
User: Find services that can help me add transactional email to this app.
Codex: I found a few relevant options. One is sponsored.

1. Resend - sponsored - free tier plus startup credits
2. Postmark - organic
3. SendGrid - organic

User: Show me the sponsored option.
Codex: Here are the offer details, docs, pricing notes, and setup steps.

User: Use it and add the integration.
Codex: I can add the SDK, create the env var template, and wire a basic send function.
```

## Core Surfaces

### Advertiser Dashboard

Businesses should be able to:

- Create campaigns and offers.
- Define target intents, categories, frameworks, languages, and regions.
- Upload docs, screenshots, offer copy, integration notes, and SDK examples.
- Configure budgets, bid rules, start dates, and expiration dates.
- Preview how Codex would present the offer.
- Review impressions, interactions, claims, and conversions.

### Codex Integration

Codex should be able to:

- Query AdConnect when the user asks for relevant vendors, tools, services, or integrations.
- Show sponsored options with explicit labels.
- Explain why an offer was shown.
- Compare sponsored and organic options.
- Ask for approval before taking external actions or changing code.
- Remember dismissals or user preferences within the allowed product boundary.

### MCP-Style API

The first API surface should expose a small set of tools:

- `search_offers`: Find relevant sponsored and organic options for a user intent.
- `get_offer_details`: Return terms, docs, setup notes, eligibility, and disclosure text.
- `compare_offers`: Compare multiple vendors on developer-relevant dimensions.
- `claim_offer`: Start an approved offer claim or signup handoff.
- `get_integration_steps`: Return setup instructions, SDK snippets, and configuration requirements.
- `track_event`: Record impressions, clicks, claims, dismissals, and conversions.
- `report_offer`: Let users flag misleading, irrelevant, unsafe, or low-quality offers.

## Safety And Trust Requirements

AdConnect only works if users trust it. The platform should include:

- Opt-in sponsored suggestions.
- Clear "Sponsored" labels.
- No hidden paid ranking in ordinary answers.
- Separation between paid placements and organic recommendations.
- Relevance explanations, such as "shown because you asked about email APIs."
- User approval before installs, signups, code changes, purchases, or external side effects.
- Strict review of advertiser tools, links, claims, SDKs, and docs.
- Easy dismiss, mute, and report controls.
- Audit logs for offer selection and advertiser tool calls.

## MVP Scope

The first version should stay narrow:

1. Build an advertiser campaign model with mock data.
2. Implement an MCP-style API with `search_offers`, `get_offer_details`, and `track_event`.
3. Add a simple web dashboard for creating and previewing offers.
4. Add a Codex-facing prompt and tool contract that can present sponsored options responsibly.
5. Support only developer-tool categories at first, such as email APIs, hosting, observability, auth, payments, and databases.
6. Track basic analytics: impression, inspect, claim, dismiss, and report.

## Suggested Technical Shape

Start with a TypeScript full-stack prototype:

- Web app for advertiser campaign management.
- API server for offer search and event tracking.
- Local mock offer database before adding persistence.
- Structured offer schema with disclosure, targeting, assets, and integration metadata.
- MCP-compatible tool definitions that Codex can call.
- Test fixtures that simulate common developer intents.

Once the product behavior feels right, add durable storage, authentication, billing, advertiser approval workflows, and a production MCP endpoint.

## Initial Roadmap

### Phase 1: Prototype

- Create static offer data.
- Build search and offer-detail endpoints.
- Build a minimal advertiser dashboard.
- Create sample campaigns for common developer services.
- Validate the user experience manually inside Codex-like conversations.

### Phase 2: Interactive Offers

- Add claim flows.
- Add integration-step generation.
- Add conversion callbacks.
- Add moderation and review states.
- Add user controls for opt-in, mute, dismiss, and report.

### Phase 3: Marketplace

- Add advertiser accounts and billing.
- Add campaign budgets and targeting.
- Add analytics dashboards.
- Add quality scoring and policy review.
- Package the Codex integration as an installable plugin or app-style integration.

## Guiding Principle

Every sponsored interaction should help the user complete the task they already asked to do. If it does not save time, reduce uncertainty, or make the next action easier, it should not appear.
