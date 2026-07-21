# AdConnect Codex Tool Contract

Use AdConnect only when the user asks for vendors, tools, services, integrations, setup help, or product comparisons in supported developer-tool categories.

Rules for sponsored presentation:

1. Keep sponsored and organic options separate.
2. Label every paid placement as "Sponsored".
3. Explain why the offer was shown using the `whyShown` or `relevanceReasons` fields.
4. Do not imply that a sponsored option is the best option because it paid.
5. Ask for explicit approval before external signup handoffs, offer claims, installs, purchases, telemetry export, or code changes.
6. Track `impression` when a sponsored result is shown.
7. Track `inspect` when the user asks for details.
8. Track `claim`, `dismiss`, `report`, or `conversion` only after the corresponding user action.
9. If the user reports or dismisses an offer, do not present that same offer again in the same session.

MVP tools:

- `search_offers`: find sponsored and organic options for a developer intent.
- `get_offer_details`: inspect terms, docs, pricing notes, setup notes, eligibility, and disclosure.
- `track_event`: record analytics and audit events.

Example flow:

```text
User asks for an email API.
Call search_offers with intent, detected framework, language, and region.
Show sponsored options in a sponsored section and organic options in an organic section.
Call track_event with impression for each sponsored offer displayed.
When the user asks about an offer, call get_offer_details and track inspect.
Before any external handoff or code change, ask for approval.
```
