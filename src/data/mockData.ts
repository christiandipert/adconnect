import type { Campaign, Offer } from "../types.ts";

const now = "2026-07-21T12:00:00.000Z";

export const mockCampaigns: Campaign[] = [
  {
    id: "camp_courierloop_email",
    advertiserName: "CourierLoop",
    name: "Startup transactional email credits",
    status: "active",
    budgetCents: 500000,
    bidCents: 180,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    targeting: {
      intents: [
        "transactional email",
        "email api",
        "password reset emails",
        "onboarding emails",
        "send email from app"
      ],
      categories: ["email"],
      frameworks: ["next.js", "remix", "express", "rails"],
      languages: ["typescript", "javascript", "ruby"],
      regions: ["US", "CA", "EU", "GLOBAL"]
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "camp_launchgrid_hosting",
    advertiserName: "LaunchGrid",
    name: "Deploy preview migration offer",
    status: "active",
    budgetCents: 750000,
    bidCents: 225,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    targeting: {
      intents: [
        "hosting",
        "deploy app",
        "preview deployments",
        "edge functions",
        "static site hosting"
      ],
      categories: ["hosting"],
      frameworks: ["next.js", "sveltekit", "astro", "vite"],
      languages: ["typescript", "javascript"],
      regions: ["US", "EU", "GLOBAL"]
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "camp_pulsetrace_observability",
    advertiserName: "PulseTrace",
    name: "Observability quickstart",
    status: "active",
    budgetCents: 420000,
    bidCents: 160,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    targeting: {
      intents: [
        "observability",
        "logs",
        "metrics",
        "error tracking",
        "application monitoring"
      ],
      categories: ["observability"],
      frameworks: ["express", "fastify", "django", "rails"],
      languages: ["typescript", "javascript", "python", "ruby"],
      regions: ["US", "EU", "GLOBAL"]
    },
    createdAt: now,
    updatedAt: now
  }
];

export const mockOffers: Offer[] = [
  {
    id: "offer_courierloop_email_credits",
    campaignId: "camp_courierloop_email",
    vendorName: "CourierLoop",
    title: "Transactional email credits for startups",
    summary:
      "Email API for product notifications, password resets, and onboarding messages with a mock startup credit offer.",
    category: "email",
    sponsored: true,
    disclosure:
      "Sponsored: CourierLoop paid to be considered when users ask about developer email APIs.",
    relevanceReasons: [
      "Matches transactional email intents",
      "Includes TypeScript and Next.js setup notes",
      "Offer is scoped to developer-tool use cases"
    ],
    eligibility: "Demo eligibility: teams adding a new product email integration.",
    terms:
      "Mock offer for MVP testing. Credits expire after 90 days and require user approval before signup handoff.",
    docsUrl: "https://docs.courierloop.example/quickstart",
    offerUrl: "https://courierloop.example/startup-credits",
    ctaLabel: "Claim email credits",
    pricingNotes:
      "Free sandbox tier, then usage-based pricing by delivered email volume.",
    setupNotes: [
      "Install the CourierLoop SDK.",
      "Add COURIERLOOP_API_KEY to the server environment.",
      "Create a small sendTransactionalEmail helper.",
      "Send a test password reset email from a non-production environment."
    ],
    sdkExamples: {
      typescript:
        "import { CourierLoop } from '@courierloop/sdk';\n\nconst client = new CourierLoop({ apiKey: process.env.COURIERLOOP_API_KEY });\nawait client.messages.send({ to, template: 'welcome', data: { name } });"
    },
    integration: {
      packageName: "@courierloop/sdk",
      installCommand: "npm install @courierloop/sdk",
      requiredEnvVars: ["COURIERLOOP_API_KEY"],
      configFiles: [".env.example", "src/lib/email.ts"]
    },
    assets: {
      accentColor: "#0f766e"
    },
    qualityScore: 92,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "offer_launchgrid_previews",
    campaignId: "camp_launchgrid_hosting",
    vendorName: "LaunchGrid",
    title: "Deploy previews and edge hosting trial",
    summary:
      "Preview deployments, static hosting, and edge functions for teams moving frontend apps to managed infrastructure.",
    category: "hosting",
    sponsored: true,
    disclosure:
      "Sponsored: LaunchGrid paid to be considered when users ask about hosting and deployment workflows.",
    relevanceReasons: [
      "Matches hosting and deployment intents",
      "Targets modern frontend frameworks",
      "Includes migration-oriented setup notes"
    ],
    eligibility: "Demo eligibility: public or private Git repositories with a frontend app.",
    terms:
      "Mock offer for MVP testing. Trial requires user approval before any repository connection.",
    docsUrl: "https://docs.launchgrid.example/deployments",
    offerUrl: "https://launchgrid.example/preview-trial",
    ctaLabel: "Start hosting trial",
    pricingNotes:
      "Trial includes preview deployments, then per-seat and bandwidth-based billing.",
    setupNotes: [
      "Connect a Git repository after user approval.",
      "Set build command and output directory.",
      "Add required runtime environment variables.",
      "Verify a preview deployment before promoting to production."
    ],
    sdkExamples: {
      cli: "npx launchgrid deploy --preview"
    },
    integration: {
      packageName: "launchgrid",
      installCommand: "npm install --save-dev launchgrid",
      requiredEnvVars: ["LAUNCHGRID_TOKEN"],
      configFiles: ["launchgrid.json", ".env.example"]
    },
    assets: {
      accentColor: "#b45309"
    },
    qualityScore: 88,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "offer_pulsetrace_quickstart",
    campaignId: "camp_pulsetrace_observability",
    vendorName: "PulseTrace",
    title: "Logs, metrics, and error tracking quickstart",
    summary:
      "Observability starter workflow with logging, metrics, traces, and alerting configuration notes.",
    category: "observability",
    sponsored: true,
    disclosure:
      "Sponsored: PulseTrace paid to be considered when users ask about observability tools.",
    relevanceReasons: [
      "Matches logs, metrics, tracing, and error tracking intents",
      "Includes backend framework setup notes",
      "Clear approval boundary for external account actions"
    ],
    eligibility: "Demo eligibility: backend services instrumented from source code.",
    terms:
      "Mock offer for MVP testing. Any external account creation or telemetry export requires explicit approval.",
    docsUrl: "https://docs.pulsetrace.example/node",
    offerUrl: "https://pulsetrace.example/quickstart",
    ctaLabel: "Inspect quickstart",
    pricingNotes:
      "Free development workspace, then event-volume pricing for retained telemetry.",
    setupNotes: [
      "Install the PulseTrace SDK.",
      "Configure PULSETRACE_DSN and service name.",
      "Wrap the HTTP server with tracing middleware.",
      "Send a test error and verify it appears in the development workspace."
    ],
    sdkExamples: {
      typescript:
        "import { initPulseTrace } from '@pulsetrace/node';\n\ninitPulseTrace({ dsn: process.env.PULSETRACE_DSN, service: 'api' });"
    },
    integration: {
      packageName: "@pulsetrace/node",
      installCommand: "npm install @pulsetrace/node",
      requiredEnvVars: ["PULSETRACE_DSN"],
      configFiles: [".env.example", "src/observability.ts"]
    },
    assets: {
      accentColor: "#7c2d12"
    },
    qualityScore: 86,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "offer_postmark_fixture",
    vendorName: "Postmark",
    title: "Transactional email API",
    summary:
      "Organic fixture for reliable transactional email delivery, templates, and inbound processing.",
    category: "email",
    sponsored: false,
    disclosure: "Organic result: no paid placement is attached to this fixture.",
    relevanceReasons: [
      "Commonly considered for transactional email",
      "Developer-facing API and templates"
    ],
    eligibility: "Depends on the vendor account and production sending requirements.",
    terms: "Organic fixture for comparison only.",
    docsUrl: "https://postmarkapp.com/developer",
    offerUrl: "https://postmarkapp.com",
    ctaLabel: "Open vendor docs",
    pricingNotes: "Published vendor pricing applies.",
    setupNotes: [
      "Create a server token.",
      "Install the vendor SDK.",
      "Create templates and verify sender signatures."
    ],
    sdkExamples: {
      typescript:
        "import postmark from 'postmark';\n\nconst client = new postmark.ServerClient(process.env.POSTMARK_TOKEN);"
    },
    integration: {
      packageName: "postmark",
      installCommand: "npm install postmark",
      requiredEnvVars: ["POSTMARK_TOKEN"],
      configFiles: [".env.example"]
    },
    assets: {
      accentColor: "#2563eb"
    },
    qualityScore: 90,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "offer_railway_fixture",
    vendorName: "Railway",
    title: "Application hosting",
    summary:
      "Organic fixture for deploying services, databases, workers, and static apps from a Git repository.",
    category: "hosting",
    sponsored: false,
    disclosure: "Organic result: no paid placement is attached to this fixture.",
    relevanceReasons: [
      "Matches app hosting and deployment intents",
      "Supports common developer deployment workflows"
    ],
    eligibility: "Depends on account, project, and service requirements.",
    terms: "Organic fixture for comparison only.",
    docsUrl: "https://docs.railway.com",
    offerUrl: "https://railway.com",
    ctaLabel: "Open vendor docs",
    pricingNotes: "Published vendor pricing applies.",
    setupNotes: [
      "Connect a repository.",
      "Configure build and start commands.",
      "Set environment variables."
    ],
    sdkExamples: {
      cli: "railway up"
    },
    integration: {
      requiredEnvVars: [],
      configFiles: ["railway.json"]
    },
    assets: {
      accentColor: "#4338ca"
    },
    qualityScore: 87,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "offer_sentry_fixture",
    vendorName: "Sentry",
    title: "Error monitoring and tracing",
    summary:
      "Organic fixture for application error tracking, performance monitoring, and release visibility.",
    category: "observability",
    sponsored: false,
    disclosure: "Organic result: no paid placement is attached to this fixture.",
    relevanceReasons: [
      "Matches error tracking and performance monitoring intents",
      "Provides SDKs for common languages"
    ],
    eligibility: "Depends on account, project, and telemetry requirements.",
    terms: "Organic fixture for comparison only.",
    docsUrl: "https://docs.sentry.io",
    offerUrl: "https://sentry.io",
    ctaLabel: "Open vendor docs",
    pricingNotes: "Published vendor pricing applies.",
    setupNotes: [
      "Create a project.",
      "Install the SDK.",
      "Configure DSN and source maps where applicable."
    ],
    sdkExamples: {
      typescript:
        "import * as Sentry from '@sentry/node';\n\nSentry.init({ dsn: process.env.SENTRY_DSN });"
    },
    integration: {
      packageName: "@sentry/node",
      installCommand: "npm install @sentry/node",
      requiredEnvVars: ["SENTRY_DSN"],
      configFiles: [".env.example"]
    },
    assets: {
      accentColor: "#6d28d9"
    },
    qualityScore: 89,
    createdAt: now,
    updatedAt: now
  }
];
