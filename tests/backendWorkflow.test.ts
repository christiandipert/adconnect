import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  claimOffer,
  compareOffers,
  createSponsoredCampaign,
  getAnalytics,
  getIntegrationSteps,
  listClaims,
  listEvents,
  listReports,
  reportOffer,
  resetStateForTests,
  searchOffers
} from "../src/services/offerService.ts";

test("resetStateForTests seeds persisted data files from fixtures", () => {
  resetStateForTests();

  const campaignsPath = dataPath("campaigns.json");
  const offersPath = dataPath("offers.json");
  const campaigns = readJsonArray<{ id: string }>(campaignsPath);

  assert.equal(existsSync(campaignsPath), true);
  assert.equal(existsSync(offersPath), true);
  assert.ok(campaigns.some((campaign) => campaign.id === "camp_courierloop_email"));
  assert.equal(listClaims().length, 0);
  assert.equal(listReports().length, 0);
  assert.equal(listEvents().length, 0);
});

test("createSponsoredCampaign creates a searchable offer", () => {
  resetStateForTests();

  const created = createSponsoredCampaign({
    advertiserName: "Stackmail",
    campaignName: "Database notification beta",
    vendorName: "Stackmail",
    offerTitle: "Database-triggered email workflows",
    offerSummary:
      "Email workflow tooling for teams adding database-triggered user notifications.",
    category: "email",
    targetIntents: ["database email notifications", "user notification email"],
    frameworks: ["express"],
    languages: ["typescript"],
    regions: ["US"],
    budgetCents: 100000,
    bidCents: 125,
    offerUrl: "https://stackmail.example/beta",
    docsUrl: "https://docs.stackmail.example",
    pricingNotes: "Beta credits available for approved test accounts."
  });

  const result = searchOffers({
    intent: "database email notifications in an Express TypeScript app",
    category: "email",
    frameworks: ["express"],
    languages: ["typescript"],
    region: "US"
  });

  assert.equal(result.sponsored[0].id, created.offer.id);
});

test("claimOffer creates a claim record and tracked claim event", () => {
  resetStateForTests();

  const claim = claimOffer({
    offerId: "offer_courierloop_email_credits",
    sessionId: "claim-test-session",
    metadata: { source: "backend-test" }
  });
  const event = listEvents()[0];
  const analytics = getAnalytics();

  assert.equal(claim.offerId, "offer_courierloop_email_credits");
  assert.equal(claim.status, "pending_approval");
  assert.equal(claim.approvalRequired, true);
  assert.match(claim.handoffUrl, /adconnect_claim_id=/);
  assert.equal(listClaims()[0].id, claim.id);
  assert.equal(event.eventType, "claim");
  assert.equal(event.metadata?.claimId, claim.id);
  assert.equal(analytics.totals.claim, 1);
});

test("reportOffer creates a report record and tracked report event", () => {
  resetStateForTests();

  const report = reportOffer({
    offerId: "offer_launchgrid_previews",
    category: "misleading",
    reason: "The setup claim needs advertiser review.",
    sessionId: "report-test-session"
  });
  const event = listEvents()[0];
  const analytics = getAnalytics();

  assert.equal(report.offerId, "offer_launchgrid_previews");
  assert.equal(report.category, "misleading");
  assert.equal(report.status, "open");
  assert.equal(listReports()[0].id, report.id);
  assert.equal(event.eventType, "report");
  assert.equal(event.metadata?.reportId, report.id);
  assert.equal(analytics.totals.report, 1);
});

test("compareOffers returns category, sponsorship, pricing, env vars, effort, and disclosure", () => {
  resetStateForTests();

  const comparison = compareOffers({
    offerIds: ["offer_courierloop_email_credits", "offer_postmark_fixture"]
  });
  const courierLoop = comparison.rows.find(
    (row) => row.offerId === "offer_courierloop_email_credits"
  );
  const postmark = comparison.rows.find((row) => row.offerId === "offer_postmark_fixture");

  assert.equal(comparison.rows.length, 2);
  assert.equal(comparison.summary.sponsoredCount, 1);
  assert.equal(comparison.summary.organicCount, 1);
  assert.equal(courierLoop?.category, "email");
  assert.equal(courierLoop?.label, "Sponsored");
  assert.match(courierLoop?.pricingNotes ?? "", /usage-based/);
  assert.deepEqual(courierLoop?.envVars, ["COURIERLOOP_API_KEY"]);
  assert.equal(typeof courierLoop?.setupEffort.summary, "string");
  assert.match(postmark?.disclosure ?? "", /Organic result/);
});

test("getIntegrationSteps returns ordered setup plan and approval reminder", () => {
  resetStateForTests();

  const integration = getIntegrationSteps("offer_courierloop_email_credits");

  assert.equal(integration.installCommand, "npm install @courierloop/sdk");
  assert.deepEqual(integration.envVars, ["COURIERLOOP_API_KEY"]);
  assert.ok(integration.configFiles.includes("src/lib/email.ts"));
  assert.match(integration.approvalReminder, /explicit user approval/);
  assert.deepEqual(
    integration.steps.map((step) => step.order),
    integration.steps.map((_, index) => index + 1)
  );
  assert.ok(integration.steps.some((step) => step.approvalRequired));
});

function dataPath(fileName: string): string {
  return resolve(process.cwd(), "data", fileName);
}

function readJsonArray<T>(filePath: string): T[] {
  return JSON.parse(readFileSync(filePath, "utf8")) as T[];
}
