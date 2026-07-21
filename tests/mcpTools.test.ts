import test from "node:test";
import assert from "node:assert/strict";
import { callTool, listTools } from "../src/mcp/tools.ts";
import { getAnalytics, resetStateForTests } from "../src/services/offerService.ts";

test("MCP tool list exposes the beta tool surface", () => {
  const names = listTools().map((tool) => tool.name).sort();

  assert.deepEqual(names, [
    "claim_offer",
    "compare_offers",
    "get_integration_steps",
    "get_offer_details",
    "report_offer",
    "search_offers",
    "track_event"
  ]);
});

test("claim_offer requires explicit user approval", () => {
  resetStateForTests();

  assert.throws(
    () =>
      callTool("claim_offer", {
        offerId: "offer_courierloop_email_credits",
        userApproval: false
      }),
    /requires userApproval/
  );
});

test("MCP beta tools call backend workflows", () => {
  resetStateForTests();

  const comparison = callTool("compare_offers", {
    offerIds: ["offer_courierloop_email_credits", "offer_postmark_fixture"]
  }) as { rows: unknown[] };
  const integration = callTool("get_integration_steps", {
    offerId: "offer_courierloop_email_credits"
  }) as { envVars: string[] };
  const claim = callTool("claim_offer", {
    offerId: "offer_courierloop_email_credits",
    userApproval: true,
    sessionId: "mcp-test"
  }) as { offerId: string };
  const report = callTool("report_offer", {
    offerId: "offer_courierloop_email_credits",
    category: "quality",
    reason: "MCP test report",
    sessionId: "mcp-test"
  }) as { reason: string };
  const analytics = getAnalytics();

  assert.equal(comparison.rows.length, 2);
  assert.deepEqual(integration.envVars, ["COURIERLOOP_API_KEY"]);
  assert.equal(claim.offerId, "offer_courierloop_email_credits");
  assert.equal(report.reason, "MCP test report");
  assert.equal(analytics.totals.claim, 1);
  assert.equal(analytics.totals.report, 1);
});
