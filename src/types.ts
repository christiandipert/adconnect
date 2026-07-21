export type OfferCategory =
  | "email"
  | "hosting"
  | "observability"
  | "auth"
  | "payments"
  | "database";

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
