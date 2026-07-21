# AdConnect Product Flow

AdConnect is a beta product for reviewed sponsored developer-tool offers inside ChatGPT and Codex workflows. It turns developer intent into transparent vendor discovery, comparison, claims, and integration help while keeping paid placement labeled and under user control.

## Actors

- **Advertiser**: a developer-tool company that submits offers, docs, claims, targeting, integration metadata, and optional hosted connector actions.
- **AdConnect reviewer**: an operator or policy workflow that approves offer copy, links, claims, SDK instructions, and hosted connector scopes before publication.
- **User**: a developer asking ChatGPT or Codex for help choosing, comparing, or integrating a tool.
- **ChatGPT/Codex**: the assistant surface that calls AdConnect tools and presents results.
- **AdConnect MCP endpoint**: the tool layer that returns offers, details, comparisons, integration steps, and audit events.

## End-To-End Flow

1. The advertiser creates an offer in AdConnect.
2. The advertiser provides target intents, categories, frameworks, languages, regions, offer terms, docs, setup notes, and claim instructions.
3. If the offer includes a hosted connector, the advertiser declares allowed actions, required scopes, side effects, rate limits, and revocation behavior.
4. AdConnect reviews the offer before activation.
5. A user asks ChatGPT or Codex for a relevant tool or integration.
6. ChatGPT or Codex calls `search_offers` with intent and context.
7. AdConnect returns sponsored and organic options, plus relevance reasons and disclosure requirements.
8. ChatGPT or Codex presents sponsored offers in a separate labeled section.
9. If the user wants more detail, ChatGPT or Codex calls `get_offer_details`.
10. If the user wants a comparison, ChatGPT or Codex calls `compare_offers`.
11. If the user wants setup help, ChatGPT or Codex calls `get_integration_steps`.
12. If the user wants to redeem or start a signup, ChatGPT or Codex asks for approval and then calls `claim_offer`.
13. If the user dismisses or reports an offer, ChatGPT or Codex records the action and stops showing that offer in the session.
14. AdConnect exposes analytics and audit history to advertisers and operators.

## Operator Rules

- Do show sponsored options only when they match the user's stated task.
- Do label every paid placement as `Sponsored`.
- Do explain why each offer was shown.
- Do keep sponsored and organic rankings separate.
- Do ask for explicit approval before claims, signups, installs, purchases, telemetry export, hosted connector calls, or code changes.
- Do record impressions, inspections, claims, dismissals, reports, conversions, and integration events.
- Do honor dismissals and reports immediately within the session.
- Do not present a sponsored offer as an unbiased recommendation.
- Do not let advertiser claims override independent technical judgment.
- Do not call advertiser-hosted connectors unless they are approved and the user consents.

## Beta Success Criteria

AdConnect is ready for a marketable beta when a founder can show:

- An advertiser creating a reviewed offer.
- ChatGPT or Codex discovering that offer from a real developer intent.
- Sponsored and organic options displayed separately.
- Details, comparisons, reports, and dismissals working from the assistant flow.
- User-approved claim and integration-step flows.
- Advertiser analytics with enough fidelity to justify spend.
- Operator review and audit records for trust and safety.
