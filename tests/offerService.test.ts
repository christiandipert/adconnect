import test from "node:test";
import assert from "node:assert/strict";
import {
  createSponsoredCampaign,
  getAnalytics,
  getOfferDetails,
  resetStateForTests,
  searchOffers,
  trackEvent
} from "../src/services/offerService.ts";

test("searchOffers separates sponsored and organic results", () => {
  resetStateForTests();

  const result = searchOffers({
    intent: "add transactional email to a Next.js app",
    category: "email",
    frameworks: ["next.js"],
    languages: ["typescript"],
    region: "US"
  });

  assert.ok(result.sponsored.length >= 1);
  assert.ok(result.organic.length >= 1);
  assert.equal(result.sponsored[0].label, "Sponsored");
  assert.equal(result.organic[0].label, "Organic");
  assert.match(result.disclosure, /Sponsored offers are paid placements/);
});

test("getOfferDetails returns safety presentation guidance", () => {
  resetStateForTests();

  const details = getOfferDetails("offer_courierloop_email_credits");

  assert.equal(details.suggestedPresentation.label, "Sponsored");
  assert.match(details.suggestedPresentation.approvalReminder, /explicit approval/);
  assert.equal(details.offer.integration.requiredEnvVars[0], "COURIERLOOP_API_KEY");
});

test("trackEvent records analytics by offer", () => {
  resetStateForTests();

  const event = trackEvent({
    offerId: "offer_courierloop_email_credits",
    eventType: "inspect",
    sessionId: "test-session"
  });

  const analytics = getAnalytics();
  const courierLoop = analytics.byOffer.find(
    (row) => row.offerId === "offer_courierloop_email_credits"
  );

  assert.equal(event.eventType, "inspect");
  assert.equal(analytics.totals.inspect, 1);
  assert.equal(courierLoop?.counts.inspect, 1);
});

test("createSponsoredCampaign adds a searchable offer", () => {
  resetStateForTests();

  const created = createSponsoredCampaign({
    advertiserName: "Northstar Auth",
    campaignName: "Auth migration credits",
    vendorName: "Northstar Auth",
    offerTitle: "Hosted auth migration package",
    offerSummary:
      "Hosted login, OAuth, and user management migration support for product teams adding authentication.",
    category: "auth",
    targetIntents: ["auth", "login", "oauth"],
    frameworks: ["next.js"],
    languages: ["typescript"],
    regions: ["US", "GLOBAL"],
    budgetCents: 250000,
    bidCents: 140,
    offerUrl: "https://northstar-auth.example/migration",
    docsUrl: "https://docs.northstar-auth.example",
    pricingNotes: "Mock migration credits for MVP testing."
  });

  const result = searchOffers({
    intent: "add oauth login to a Next.js app",
    category: "auth",
    frameworks: ["next.js"],
    languages: ["typescript"],
    region: "US"
  });

  assert.equal(created.offer.sponsored, true);
  assert.equal(result.sponsored[0].id, created.offer.id);
});
