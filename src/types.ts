export type OfferCategory =
  | "email"
  | "hosting"
  | "observability"
  | "auth"
  | "payments"
  | "database"
  | "analytics"
  | "ci_cd"
  | "security";

export type CampaignStatus = "draft" | "active" | "paused" | "expired";

export type EventType =
  | "impression"
  | "inspect"
  | "claim"
  | "dismiss"
  | "report"
  | "conversion";

export interface TargetingProfile {
  intents: string[];
  categories: OfferCategory[];
  frameworks: string[];
  languages: string[];
  regions: string[];
}

export interface Campaign {
  id: string;
  advertiserName: string;
  name: string;
  status: CampaignStatus;
  budgetCents: number;
  bidCents: number;
  startsAt: string;
  expiresAt: string;
  targeting: TargetingProfile;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationMetadata {
  packageName?: string;
  installCommand?: string;
  requiredEnvVars: string[];
  configFiles: string[];
}

export type ClaimStatus = "pending_approval" | "handoff_ready" | "completed";

export type ReportStatus = "open" | "reviewed" | "dismissed";

export type SetupEffortLevel = "low" | "medium" | "high";

export interface OfferAsset {
  logoUrl?: string;
  screenshotUrl?: string;
  accentColor: string;
}

export interface Offer {
  id: string;
  campaignId?: string;
  vendorName: string;
  title: string;
  summary: string;
  category: OfferCategory;
  sponsored: boolean;
  disclosure: string;
  relevanceReasons: string[];
  eligibility: string;
  terms: string;
  docsUrl: string;
  offerUrl: string;
  ctaLabel: string;
  pricingNotes: string;
  setupNotes: string[];
  sdkExamples: Record<string, string>;
  integration: IntegrationMetadata;
  assets: OfferAsset;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchOffersInput {
  intent: string;
  category?: OfferCategory | "";
  frameworks?: string[];
  languages?: string[];
  region?: string;
  includeOrganic?: boolean;
  limit?: number;
}

export interface OfferSummary {
  id: string;
  vendorName: string;
  title: string;
  summary: string;
  category: OfferCategory;
  sponsored: boolean;
  label: "Sponsored" | "Organic";
  disclosure: string;
  whyShown: string[];
  score: number;
  ctaLabel: string;
}

export interface SearchOffersResult {
  intent: string;
  generatedAt: string;
  disclosure: string;
  rankingPolicy: string;
  sponsored: OfferSummary[];
  organic: OfferSummary[];
  audit: {
    filters: {
      category?: string;
      frameworks: string[];
      languages: string[];
      region?: string;
      includeOrganic: boolean;
    };
    candidateCount: number;
  };
}

export interface OfferDetails {
  offer: Offer;
  campaign?: Campaign;
  suggestedPresentation: {
    label: "Sponsored" | "Organic";
    openingLine: string;
    approvalReminder: string;
    allowedActions: string[];
  };
}

export interface TrackEventInput {
  offerId: string;
  eventType: EventType;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackedEvent extends TrackEventInput {
  id: string;
  occurredAt: string;
}

export interface ClaimOfferInput {
  offerId: string;
  userApproval?: boolean;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface OfferClaim {
  id: string;
  offerId: string;
  status: ClaimStatus;
  handoffUrl: string;
  approvalRequired: boolean;
  sessionId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ReportOfferInput {
  offerId: string;
  category: string;
  reason: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface OfferReport {
  id: string;
  offerId: string;
  category: string;
  reason: string;
  status: ReportStatus;
  sessionId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompareOffersInput {
  offerIds: string[];
}

export interface SetupEffort {
  level: SetupEffortLevel;
  stepCount: number;
  requiredEnvVarCount: number;
  configFileCount: number;
  summary: string;
}

export interface OfferComparisonRow {
  offerId: string;
  vendorName: string;
  title: string;
  category: OfferCategory;
  sponsored: boolean;
  label: "Sponsored" | "Organic";
  pricingNotes: string;
  envVars: string[];
  setupEffort: SetupEffort;
  disclosure: string;
}

export interface CompareOffersResult {
  generatedAt: string;
  disclosure: string;
  offerIds: string[];
  rows: OfferComparisonRow[];
  summary: {
    categories: OfferCategory[];
    sponsoredCount: number;
    organicCount: number;
  };
}

export interface IntegrationStep {
  order: number;
  title: string;
  description: string;
  approvalRequired: boolean;
}

export interface IntegrationStepsResult {
  offerId: string;
  vendorName: string;
  title: string;
  installCommand?: string;
  envVars: string[];
  configFiles: string[];
  approvalReminder: string;
  steps: IntegrationStep[];
}

export interface AnalyticsByOffer {
  offerId: string;
  vendorName: string;
  title: string;
  sponsored: boolean;
  counts: Record<EventType, number>;
}

export interface DashboardCampaignInput {
  advertiserName: string;
  campaignName: string;
  vendorName: string;
  offerTitle: string;
  offerSummary: string;
  category: OfferCategory;
  targetIntents: string[];
  frameworks: string[];
  languages: string[];
  regions: string[];
  budgetCents: number;
  bidCents: number;
  offerUrl: string;
  docsUrl: string;
  pricingNotes: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
