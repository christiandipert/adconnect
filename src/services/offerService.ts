import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { mockCampaigns, mockOffers } from "../data/mockData.ts";
import type {
  AnalyticsByOffer,
  Campaign,
  ClaimOfferInput,
  CompareOffersInput,
  CompareOffersResult,
  DashboardCampaignInput,
  EventType,
  IntegrationStepsResult,
  Offer,
  OfferCategory,
  OfferClaim,
  OfferComparisonRow,
  OfferDetails,
  OfferReport,
  ReportOfferInput,
  OfferSummary,
  SearchOffersInput,
  SearchOffersResult,
  SetupEffort,
  TargetingProfile,
  TrackEventInput,
  TrackedEvent
} from "../types.ts";

const EVENT_TYPES: EventType[] = [
  "impression",
  "inspect",
  "claim",
  "dismiss",
  "report",
  "conversion"
];

const CATEGORIES: OfferCategory[] = [
  "email",
  "hosting",
  "observability",
  "auth",
  "payments",
  "database",
  "analytics",
  "ci_cd",
  "security"
];

const STOPWORDS = new Set([
  "add",
  "and",
  "app",
  "for",
  "from",
  "need",
  "the",
  "this",
  "to",
  "with"
]);

interface DataStore {
  campaigns: Campaign[];
  offers: Offer[];
  events: TrackedEvent[];
  claims: OfferClaim[];
  reports: OfferReport[];
}

type CollectionName = keyof DataStore;

const DATA_DIR = process.env.ADCONNECT_DATA_DIR
  ? resolve(process.env.ADCONNECT_DATA_DIR)
  : resolve(process.cwd(), "data");

const COLLECTION_FILES: Record<CollectionName, string> = {
  campaigns: "campaigns.json",
  offers: "offers.json",
  events: "events.json",
  claims: "claims.json",
  reports: "reports.json"
};

const initialStore = initializeStore();

let campaigns: Campaign[] = initialStore.campaigns;
let offers: Offer[] = initialStore.offers;
let events: TrackedEvent[] = initialStore.events;
let claims: OfferClaim[] = initialStore.claims;
let reports: OfferReport[] = initialStore.reports;

export class ValidationError extends Error {
  statusCode = 400;
}

export function listCategories(): OfferCategory[] {
  return [...CATEGORIES];
}

export function listCampaigns(): Campaign[] {
  return structuredClone(campaigns);
}

export function listOffers(): Offer[] {
  return structuredClone(offers);
}

export function listEvents(): TrackedEvent[] {
  return structuredClone(events);
}

export function listClaims(): OfferClaim[] {
  return structuredClone(claims);
}

export function listReports(): OfferReport[] {
  return structuredClone(reports);
}

export function searchOffers(input: SearchOffersInput): SearchOffersResult {
  const intent = cleanText(input.intent);
  if (!intent) {
    throw new ValidationError("search_offers requires a non-empty intent.");
  }

  const category = normalizeCategory(input.category);
  const frameworks = normalizeList(input.frameworks);
  const languages = normalizeList(input.languages);
  const region = cleanText(input.region ?? "").toUpperCase();
  const includeOrganic = input.includeOrganic ?? true;
  const limit = clampLimit(input.limit);

  const candidates = offers.filter((offer) => {
    if (category && offer.category !== category) return false;
    if (!includeOrganic && !offer.sponsored) return false;
    if (offer.sponsored && !isCampaignEligible(offer.campaignId)) return false;
    return true;
  });

  const scored = candidates
    .map((offer) => scoreOffer(offer, { intent, category, frameworks, languages, region }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.offer.qualityScore - a.offer.qualityScore;
    });

  const sponsored = scored
    .filter((entry) => entry.offer.sponsored)
    .slice(0, limit)
    .map((entry) => toOfferSummary(entry.offer, entry.score, entry.reasons));

  const organic = scored
    .filter((entry) => !entry.offer.sponsored)
    .slice(0, limit)
    .map((entry) => toOfferSummary(entry.offer, entry.score, entry.reasons));

  return {
    intent,
    generatedAt: new Date().toISOString(),
    disclosure:
      "Sponsored offers are paid placements and are separated from organic results. The user must approve claims, signups, installs, purchases, code changes, and external handoffs.",
    rankingPolicy:
      "Sponsored and organic results are ranked independently by relevance. Paid status does not alter organic ranking.",
    sponsored,
    organic,
    audit: {
      filters: {
        category,
        frameworks,
        languages,
        region: region || undefined,
        includeOrganic
      },
      candidateCount: candidates.length
    }
  };
}

export function getOfferDetails(offerId: string): OfferDetails {
  const offer = offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    throw new ValidationError(`Offer not found: ${offerId}`);
  }

  const campaign = offer.campaignId
    ? campaigns.find((candidate) => candidate.id === offer.campaignId)
    : undefined;

  return {
    offer: structuredClone(offer),
    campaign: campaign ? structuredClone(campaign) : undefined,
    suggestedPresentation: {
      label: offer.sponsored ? "Sponsored" : "Organic",
      openingLine: offer.sponsored
        ? `${offer.vendorName} is a sponsored option relevant to this request.`
        : `${offer.vendorName} is an organic option relevant to this request.`,
      approvalReminder:
        "Ask for explicit approval before opening external signup pages, installing packages, changing code, sending telemetry, making purchases, or claiming an offer.",
      allowedActions: [
        "summarize terms",
        "show setup notes",
        "compare with organic options",
        "track inspect, dismiss, report, claim, or conversion events"
      ]
    }
  };
}

export function trackEvent(input: TrackEventInput): TrackedEvent {
  const offerId = cleanText(input.offerId);
  const offer = offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    throw new ValidationError(`Cannot track event for unknown offer: ${offerId}`);
  }

  if (!EVENT_TYPES.includes(input.eventType)) {
    throw new ValidationError(`Unsupported eventType: ${input.eventType}`);
  }

  const event: TrackedEvent = {
    id: `evt_${randomUUID()}`,
    offerId,
    eventType: input.eventType,
    sessionId: cleanText(input.sessionId ?? "") || undefined,
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString()
  };

  events = [event, ...events];
  writeCollection("events", events);
  return structuredClone(event);
}

export function createSponsoredCampaign(input: DashboardCampaignInput): {
  campaign: Campaign;
  offer: Offer;
} {
  const category = normalizeCategory(input.category);
  if (!category) {
    throw new ValidationError("A supported category is required.");
  }

  const advertiserName = requireText(input.advertiserName, "advertiserName");
  const campaignName = requireText(input.campaignName, "campaignName");
  const vendorName = requireText(input.vendorName, "vendorName");
  const offerTitle = requireText(input.offerTitle, "offerTitle");
  const offerSummary = requireText(input.offerSummary, "offerSummary");

  const targeting: TargetingProfile = {
    intents: normalizeList(input.targetIntents),
    categories: [category],
    frameworks: normalizeList(input.frameworks),
    languages: normalizeList(input.languages),
    regions: normalizeList(input.regions).map((item) => item.toUpperCase())
  };

  if (targeting.intents.length === 0) {
    throw new ValidationError("At least one target intent is required.");
  }

  const timestamp = new Date().toISOString();
  const campaign: Campaign = {
    id: `camp_${slugify(advertiserName)}_${randomUUID().slice(0, 8)}`,
    advertiserName,
    name: campaignName,
    status: "active",
    budgetCents: positiveNumber(input.budgetCents, 100000),
    bidCents: positiveNumber(input.bidCents, 100),
    startsAt: timestamp,
    expiresAt: oneYearFromNow(),
    targeting,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const offer: Offer = {
    id: `offer_${slugify(vendorName)}_${randomUUID().slice(0, 8)}`,
    campaignId: campaign.id,
    vendorName,
    title: offerTitle,
    summary: offerSummary,
    category,
    sponsored: true,
    disclosure: `Sponsored: ${vendorName} paid to be considered for relevant ${category} requests.`,
    relevanceReasons: targeting.intents.slice(0, 3).map((intent) => `Targets "${intent}" intent`),
    eligibility: "Eligibility is configured by the advertiser and must be confirmed before claim.",
    terms:
      "Advertiser-provided terms. Codex must ask for approval before signup, claim, purchase, install, or code changes.",
    docsUrl: cleanUrl(input.docsUrl) || "https://docs.example.invalid",
    offerUrl: cleanUrl(input.offerUrl) || "https://offer.example.invalid",
    ctaLabel: "Inspect sponsored offer",
    pricingNotes: cleanText(input.pricingNotes) || "Pricing notes were not provided.",
    setupNotes: [
      "Review offer terms and docs.",
      "Confirm eligibility with the user.",
      "Ask for explicit approval before external handoff or implementation."
    ],
    sdkExamples: {},
    integration: {
      requiredEnvVars: [],
      configFiles: []
    },
    assets: {
      accentColor: "#0f766e"
    },
    qualityScore: 75,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  campaigns = [campaign, ...campaigns];
  offers = [offer, ...offers];
  writeCollection("campaigns", campaigns);
  writeCollection("offers", offers);

  return {
    campaign: structuredClone(campaign),
    offer: structuredClone(offer)
  };
}

export function claimOffer(input: ClaimOfferInput): OfferClaim {
  const payload = (input ?? {}) as Partial<ClaimOfferInput>;
  const offer = requireOffer(payload.offerId ?? "", "Cannot claim unknown offer");
  const timestamp = new Date().toISOString();
  const sessionId = cleanText(payload.sessionId ?? "") || undefined;
  const metadata = metadataRecord(payload.metadata);
  const claimId = `claim_${randomUUID()}`;
  const claim: OfferClaim = {
    id: claimId,
    offerId: offer.id,
    status: "pending_approval",
    handoffUrl: buildHandoffUrl(offer, claimId),
    approvalRequired: true,
    sessionId,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  claims = [claim, ...claims];
  writeCollection("claims", claims);

  trackEvent({
    offerId: offer.id,
    eventType: "claim",
    sessionId,
    metadata: {
      ...metadata,
      claimId: claim.id,
      claimStatus: claim.status,
      handoffUrl: claim.handoffUrl,
      approvalRequired: claim.approvalRequired
    }
  });

  return structuredClone(claim);
}

export function reportOffer(input: ReportOfferInput): OfferReport {
  const payload = (input ?? {}) as Partial<ReportOfferInput>;
  const offer = requireOffer(payload.offerId ?? "", "Cannot report unknown offer");
  const category = requireText(payload.category ?? "", "category");
  const reason = requireText(payload.reason ?? "", "reason");
  const timestamp = new Date().toISOString();
  const sessionId = cleanText(payload.sessionId ?? "") || undefined;
  const metadata = metadataRecord(payload.metadata);
  const report: OfferReport = {
    id: `report_${randomUUID()}`,
    offerId: offer.id,
    category,
    reason,
    status: "open",
    sessionId,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  reports = [report, ...reports];
  writeCollection("reports", reports);

  trackEvent({
    offerId: offer.id,
    eventType: "report",
    sessionId,
    metadata: {
      ...metadata,
      reportId: report.id,
      reportCategory: category,
      reportReason: reason
    }
  });

  return structuredClone(report);
}

export function compareOffers(input: CompareOffersInput): CompareOffersResult {
  const payload = (input ?? {}) as Partial<CompareOffersInput>;
  const offerIds = normalizeOfferIds(payload.offerIds);
  if (offerIds.length === 0) {
    throw new ValidationError("compare_offers requires at least two offerIds.");
  }

  if (offerIds.length < 2) {
    throw new ValidationError("compare_offers requires at least two offerIds.");
  }

  const selectedOffers = offerIds.map((offerId) => requireOffer(offerId, "Offer not found"));
  const rows = selectedOffers.map(toComparisonRow);

  return {
    generatedAt: new Date().toISOString(),
    disclosure:
      "Sponsored and organic options are compared side by side. Paid status must remain visible and must not be used to hide organic alternatives.",
    offerIds,
    rows,
    summary: {
      categories: [...new Set(rows.map((row) => row.category))],
      sponsoredCount: rows.filter((row) => row.sponsored).length,
      organicCount: rows.filter((row) => !row.sponsored).length
    }
  };
}

export function getIntegrationSteps(offerId: string): IntegrationStepsResult {
  const offer = requireOffer(offerId, "Offer not found");
  const steps = buildIntegrationSteps(offer);

  return {
    offerId: offer.id,
    vendorName: offer.vendorName,
    title: offer.title,
    installCommand: offer.integration.installCommand,
    envVars: [...offer.integration.requiredEnvVars],
    configFiles: [...offer.integration.configFiles],
    approvalReminder:
      "Ask for explicit user approval before opening external handoff URLs, claiming sponsored offers, installing packages, editing files, sending telemetry, or creating accounts.",
    steps
  };
}

export function getAnalytics(): {
  totals: Record<EventType, number>;
  byOffer: AnalyticsByOffer[];
  recentEvents: TrackedEvent[];
} {
  const totals = emptyEventCounts();
  const byOffer = new Map<string, AnalyticsByOffer>();

  for (const offer of offers) {
    byOffer.set(offer.id, {
      offerId: offer.id,
      vendorName: offer.vendorName,
      title: offer.title,
      sponsored: offer.sponsored,
      counts: emptyEventCounts()
    });
  }

  for (const event of events) {
    totals[event.eventType] += 1;
    const row = byOffer.get(event.offerId);
    if (row) {
      row.counts[event.eventType] += 1;
    }
  }

  return {
    totals,
    byOffer: [...byOffer.values()],
    recentEvents: structuredClone(events.slice(0, 25))
  };
}

export function resetStateForTests(): void {
  const seeded = seedStore();
  campaigns = seeded.campaigns;
  offers = seeded.offers;
  events = [];
  claims = [];
  reports = [];
  writeStore(currentStore());
}

function initializeStore(): DataStore {
  ensureDataDir();
  const hasPersistedData = Object.values(COLLECTION_FILES).some((fileName) =>
    existsSync(resolve(DATA_DIR, fileName))
  );
  const seeded = seedStore();

  if (!hasPersistedData) {
    writeStore(seeded);
    return seeded;
  }

  return {
    campaigns: readCollection("campaigns", seeded.campaigns),
    offers: readCollection("offers", seeded.offers),
    events: readCollection("events", seeded.events),
    claims: readCollection("claims", seeded.claims),
    reports: readCollection("reports", seeded.reports)
  };
}

function seedStore(): DataStore {
  return {
    campaigns: structuredClone(mockCampaigns),
    offers: structuredClone(mockOffers),
    events: [],
    claims: [],
    reports: []
  };
}

function currentStore(): DataStore {
  return {
    campaigns,
    offers,
    events,
    claims,
    reports
  };
}

function readCollection<T extends CollectionName>(
  name: T,
  fallback: DataStore[T]
): DataStore[T] {
  const filePath = collectionPath(name);
  if (!existsSync(filePath)) {
    writeCollection(name, fallback);
    return structuredClone(fallback);
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    if (Array.isArray(parsed)) {
      return parsed as DataStore[T];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Failed to read ${filePath}: ${message}`);
  }

  throw new Error(`Failed to read ${filePath}: expected a JSON array.`);
}

function writeStore(store: DataStore): void {
  writeCollection("campaigns", store.campaigns);
  writeCollection("offers", store.offers);
  writeCollection("events", store.events);
  writeCollection("claims", store.claims);
  writeCollection("reports", store.reports);
}

function writeCollection<T extends CollectionName>(name: T, collection: DataStore[T]): void {
  ensureDataDir();
  const filePath = collectionPath(name);
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function collectionPath(name: CollectionName): string {
  return resolve(DATA_DIR, COLLECTION_FILES[name]);
}

function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function requireOffer(offerId: string, errorPrefix: string): Offer {
  const id = cleanText(String(offerId ?? ""));
  const offer = offers.find((candidate) => candidate.id === id);
  if (!offer) {
    throw new ValidationError(`${errorPrefix}: ${id || "(blank)"}`);
  }
  return offer;
}

function normalizeOfferIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("offerIds must be an array.");
  }
  return [...new Set(value.map((item) => cleanText(String(item))).filter(Boolean))];
}

function toComparisonRow(offer: Offer): OfferComparisonRow {
  return {
    offerId: offer.id,
    vendorName: offer.vendorName,
    title: offer.title,
    category: offer.category,
    sponsored: offer.sponsored,
    label: offer.sponsored ? "Sponsored" : "Organic",
    pricingNotes: offer.pricingNotes,
    envVars: [...offer.integration.requiredEnvVars],
    setupEffort: estimateSetupEffort(offer),
    disclosure: offer.disclosure
  };
}

function estimateSetupEffort(offer: Offer): SetupEffort {
  const installCount = offer.integration.installCommand ? 1 : 0;
  const stepCount =
    installCount +
    offer.setupNotes.length +
    offer.integration.requiredEnvVars.length +
    offer.integration.configFiles.length;
  let level: SetupEffort["level"] = "low";

  if (stepCount >= 8 || offer.integration.requiredEnvVars.length >= 3) {
    level = "high";
  } else if (stepCount >= 5 || offer.integration.configFiles.length >= 2) {
    level = "medium";
  }

  return {
    level,
    stepCount,
    requiredEnvVarCount: offer.integration.requiredEnvVars.length,
    configFileCount: offer.integration.configFiles.length,
    summary: `${level} effort: ${stepCount} setup touchpoints, ${offer.integration.requiredEnvVars.length} env vars, ${offer.integration.configFiles.length} config files.`
  };
}

function buildIntegrationSteps(offer: Offer): IntegrationStepsResult["steps"] {
  const steps: IntegrationStepsResult["steps"] = [];
  let order = 1;

  steps.push({
    order: order++,
    title: "Review offer",
    description: `Review ${offer.vendorName} terms, pricing notes, eligibility, docs, and disclosure before presenting it.`,
    approvalRequired: false
  });

  if (offer.sponsored) {
    steps.push({
      order: order++,
      title: "Confirm sponsored handoff approval",
      description:
        "Tell the user this is a sponsored offer and get explicit approval before claim, signup, install, purchase, or external handoff.",
      approvalRequired: true
    });
  }

  if (offer.integration.installCommand) {
    steps.push({
      order: order++,
      title: "Install package",
      description: offer.integration.installCommand,
      approvalRequired: true
    });
  }

  if (offer.integration.requiredEnvVars.length > 0) {
    steps.push({
      order: order++,
      title: "Configure environment variables",
      description: offer.integration.requiredEnvVars.join(", "),
      approvalRequired: true
    });
  }

  if (offer.integration.configFiles.length > 0) {
    steps.push({
      order: order++,
      title: "Update config files",
      description: offer.integration.configFiles.join(", "),
      approvalRequired: true
    });
  }

  for (const note of offer.setupNotes) {
    steps.push({
      order: order++,
      title: "Apply setup note",
      description: note,
      approvalRequired: note.toLowerCase().includes("approval")
    });
  }

  steps.push({
    order,
    title: "Verify integration",
    description:
      "Use a non-production environment first, confirm behavior, and avoid sending production data until the user approves.",
    approvalRequired: true
  });

  return steps;
}

function buildHandoffUrl(offer: Offer, claimId: string): string {
  try {
    const url = new URL(offer.offerUrl);
    url.searchParams.set("adconnect_claim_id", claimId);
    url.searchParams.set("adconnect_offer_id", offer.id);
    return url.toString();
  } catch {
    return `https://adconnect.local/claims/${encodeURIComponent(claimId)}`;
  }
}

function scoreOffer(
  offer: Offer,
  input: {
    intent: string;
    category?: OfferCategory;
    frameworks: string[];
    languages: string[];
    region: string;
  }
): { offer: Offer; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = Math.max(1, Math.floor(offer.qualityScore / 10));
  const campaign = getCampaign(offer);
  const haystack = normalize(
    [
      offer.vendorName,
      offer.title,
      offer.summary,
      offer.category,
      ...offer.relevanceReasons,
      ...offer.setupNotes,
      ...(campaign?.targeting.intents ?? []),
      ...(campaign?.targeting.frameworks ?? []),
      ...(campaign?.targeting.languages ?? [])
    ].join(" ")
  );

  const tokens = tokenize(input.intent);
  const directIntentMatches = campaign?.targeting.intents.filter((intent) =>
    normalize(input.intent).includes(normalize(intent))
  ) ?? [];

  if (directIntentMatches.length > 0) {
    score += 35;
    reasons.push(`matched target intent: ${directIntentMatches[0]}`);
  }

  const tokenMatches = tokens.filter((token) => haystack.includes(token));
  if (tokenMatches.length > 0) {
    score += Math.min(tokenMatches.length * 6, 30);
    reasons.push(`matched terms: ${tokenMatches.slice(0, 4).join(", ")}`);
  }

  if (input.category && offer.category === input.category) {
    score += 20;
    reasons.push(`matched category: ${input.category}`);
  }

  if (campaign) {
    const frameworkMatch = firstOverlap(input.frameworks, campaign.targeting.frameworks);
    const languageMatch = firstOverlap(input.languages, campaign.targeting.languages);
    const regionMatch = input.region
      ? campaign.targeting.regions.includes(input.region) ||
        campaign.targeting.regions.includes("GLOBAL")
      : false;

    if (frameworkMatch) {
      score += 10;
      reasons.push(`supports ${frameworkMatch}`);
    }

    if (languageMatch) {
      score += 8;
      reasons.push(`supports ${languageMatch}`);
    }

    if (regionMatch) {
      score += 5;
      reasons.push(`eligible in ${input.region}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push(...offer.relevanceReasons.slice(0, 2));
  }

  return { offer, score, reasons };
}

function toOfferSummary(offer: Offer, score: number, reasons: string[]): OfferSummary {
  return {
    id: offer.id,
    vendorName: offer.vendorName,
    title: offer.title,
    summary: offer.summary,
    category: offer.category,
    sponsored: offer.sponsored,
    label: offer.sponsored ? "Sponsored" : "Organic",
    disclosure: offer.disclosure,
    whyShown: reasons,
    score,
    ctaLabel: offer.ctaLabel
  };
}

function isCampaignEligible(campaignId?: string): boolean {
  if (!campaignId) return true;
  const campaign = campaigns.find((candidate) => candidate.id === campaignId);
  if (!campaign || campaign.status !== "active") return false;
  const now = Date.now();
  return Date.parse(campaign.startsAt) <= now && Date.parse(campaign.expiresAt) >= now;
}

function getCampaign(offer: Offer): Campaign | undefined {
  if (!offer.campaignId) return undefined;
  return campaigns.find((candidate) => candidate.id === offer.campaignId);
}

function emptyEventCounts(): Record<EventType, number> {
  return {
    impression: 0,
    inspect: 0,
    claim: 0,
    dismiss: 0,
    report: 0,
    conversion: 0
  };
}

function normalizeList(value: unknown): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  return [
    ...new Set(
      items
        .map((item) => cleanText(String(item)).toLowerCase())
        .filter(Boolean)
    )
  ];
}

function normalizeCategory(value: unknown): OfferCategory | undefined {
  const normalized = cleanText(String(value ?? "")).toLowerCase();
  if (!normalized) return undefined;
  if (CATEGORIES.includes(normalized as OfferCategory)) {
    return normalized as OfferCategory;
  }
  throw new ValidationError(`Unsupported category: ${value}`);
}

function firstOverlap(left: string[], right: string[]): string | undefined {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.find((item) => rightSet.has(item.toLowerCase()));
}

function tokenize(value: string): string[] {
  return [
    ...new Set(
      normalize(value)
        .split(" ")
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    )
  ];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.+#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function requireText(value: string, fieldName: string): string {
  const cleaned = cleanText(value);
  if (!cleaned) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return cleaned;
}

function clampLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function cleanUrl(value: unknown): string {
  const cleaned = cleanText(String(value ?? ""));
  if (!cleaned) return "";
  try {
    const url = new URL(cleaned);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return "";
  }
  return "";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return structuredClone(value) as Record<string, unknown>;
  }
  return {};
}

function slugify(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
}

function oneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}
