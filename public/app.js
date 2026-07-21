const EVENT_TYPES = ["impression", "inspect", "claim", "dismiss", "report", "conversion"];
const FALLBACK_CATEGORIES = [
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

const state = {
  apiConnected: false,
  categories: [],
  compareQueue: new Map(),
  lastSearchResult: null,
  selectedOfferDetails: null,
  selectedOfferId: null,
  sessionId: createSessionId()
};

const selectors = {
  healthStatus: document.querySelector("#healthStatus"),
  sessionLabel: document.querySelector("#sessionLabel"),
  apiStat: document.querySelector("#apiStat"),
  inventoryStat: document.querySelector("#inventoryStat"),
  selectedStat: document.querySelector("#selectedStat"),
  queueStat: document.querySelector("#queueStat"),
  categorySelect: document.querySelector("#categorySelect"),
  searchCategorySelect: document.querySelector("#searchCategorySelect"),
  campaignForm: document.querySelector("#campaignForm"),
  formMessage: document.querySelector("#formMessage"),
  runSearchButton: document.querySelector("#runSearchButton"),
  refreshAnalyticsButton: document.querySelector("#refreshAnalyticsButton"),
  compareButton: document.querySelector("#compareButton"),
  intentInput: document.querySelector("#intentInput"),
  frameworkInput: document.querySelector("#frameworkInput"),
  languageInput: document.querySelector("#languageInput"),
  regionInput: document.querySelector("#regionInput"),
  includeOrganicInput: document.querySelector("#includeOrganicInput"),
  searchDisclosure: document.querySelector("#searchDisclosure"),
  simulatorStatus: document.querySelector("#simulatorStatus"),
  results: document.querySelector("#results"),
  queueList: document.querySelector("#queueList"),
  details: document.querySelector("#details"),
  integrationPanel: document.querySelector("#integrationPanel"),
  detailLabel: document.querySelector("#detailLabel"),
  metrics: document.querySelector("#metrics"),
  compareStatus: document.querySelector("#compareStatus"),
  compareOutput: document.querySelector("#compareOutput"),
  auditStatus: document.querySelector("#auditStatus"),
  eventLog: document.querySelector("#eventLog")
};

selectors.campaignForm.addEventListener("submit", handleCampaignSubmit);
selectors.runSearchButton.addEventListener("click", () => runSearch());
selectors.refreshAnalyticsButton.addEventListener("click", () => loadAnalytics());
selectors.compareButton.addEventListener("click", () => runComparison());
selectors.results.addEventListener("click", handleActionClick);
selectors.queueList.addEventListener("click", handleActionClick);
selectors.details.addEventListener("click", handleActionClick);
selectors.integrationPanel.addEventListener("click", handleActionClick);

await boot();

async function boot() {
  selectors.sessionLabel.textContent = `Session ${state.sessionId.slice(-8)}`;
  renderQueue();
  updateSelectedStat();

  await checkHealth();
  await loadCategories();
  await loadInventory();
  await runSearch({ trackImpressions: true });
  await loadAnalytics();
}

async function checkHealth() {
  try {
    await api("/health");
    state.apiConnected = true;
    selectors.healthStatus.textContent = "API connected";
    selectors.healthStatus.classList.add("ok");
    selectors.apiStat.textContent = "Online";
  } catch {
    state.apiConnected = false;
    selectors.healthStatus.textContent = "API unavailable";
    selectors.healthStatus.classList.remove("ok");
    selectors.apiStat.textContent = "Offline";
  }
}

async function loadCategories() {
  try {
    const data = await api("/api/categories");
    state.categories = Array.isArray(data.categories) ? data.categories : FALLBACK_CATEGORIES;
  } catch {
    state.categories = FALLBACK_CATEGORIES;
    setInlineStatus(selectors.simulatorStatus, "Using local category defaults until the API responds.", "warning");
  }

  selectors.categorySelect.innerHTML = state.categories
    .map((category) => `<option value="${escapeHtml(category)}">${labelize(category)}</option>`)
    .join("");
  selectors.categorySelect.value = state.categories.includes("auth") ? "auth" : state.categories[0] ?? "";

  selectors.searchCategorySelect.innerHTML = [
    '<option value="">All categories</option>',
    ...state.categories.map(
      (category) => `<option value="${escapeHtml(category)}">${labelize(category)}</option>`
    )
  ].join("");
}

async function loadInventory() {
  try {
    const data = await api("/api/offers");
    const offers = Array.isArray(data.offers) ? data.offers : [];
    const sponsored = offers.filter((offer) => offer.sponsored).length;
    selectors.inventoryStat.textContent = `${offers.length} offers`;
    selectors.inventoryStat.title = `${sponsored} sponsored, ${offers.length - sponsored} organic`;
  } catch {
    selectors.inventoryStat.textContent = "Unavailable";
  }
}

async function handleCampaignSubmit(event) {
  event.preventDefault();
  selectors.formMessage.textContent = "";
  selectors.formMessage.classList.remove("error");

  const submitButton = selectors.campaignForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving";

  try {
    const form = new FormData(selectors.campaignForm);
    const payload = {
      advertiserName: form.get("advertiserName"),
      campaignName: form.get("campaignName"),
      vendorName: form.get("vendorName"),
      offerTitle: form.get("offerTitle"),
      offerSummary: form.get("offerSummary"),
      category: form.get("category"),
      targetIntents: splitList(form.get("targetIntents")),
      frameworks: splitList(form.get("frameworks")),
      languages: splitList(form.get("languages")),
      regions: splitList(form.get("regions")),
      budgetCents: Number(form.get("budgetCents")),
      bidCents: Number(form.get("bidCents")),
      offerUrl: form.get("offerUrl"),
      docsUrl: form.get("docsUrl"),
      pricingNotes: form.get("pricingNotes")
    };

    const result = await api("/api/campaigns", {
      method: "POST",
      body: payload
    });

    selectors.formMessage.textContent = `Saved ${result.offer.title}. Search preview updated.`;
    selectors.intentInput.value = payload.targetIntents.join(" ");
    selectors.searchCategorySelect.value = payload.category;
    await loadInventory();
    await runSearch();
  } catch (error) {
    selectors.formMessage.textContent = error.message;
    selectors.formMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save Offer";
  }
}

async function runSearch(options = {}) {
  const trackImpressions = options.trackImpressions ?? true;
  const intent = selectors.intentInput.value.trim();

  if (!intent) {
    selectors.results.innerHTML = renderEmpty("Enter a user intent to preview matching offers.");
    selectors.searchDisclosure.textContent = "";
    return;
  }

  selectors.runSearchButton.disabled = true;
  selectors.runSearchButton.textContent = "Searching";
  selectors.results.innerHTML = renderLoading("Searching offer inventory");
  selectors.searchDisclosure.textContent = "";
  setInlineStatus(selectors.simulatorStatus, "Sending structured search context to the offer connector.", "subtle");

  try {
    const result = await api("/api/offers/search", {
      method: "POST",
      body: {
        intent,
        category: selectors.searchCategorySelect.value,
        frameworks: splitList(selectors.frameworkInput.value),
        languages: splitList(selectors.languageInput.value),
        region: selectors.regionInput.value,
        includeOrganic: selectors.includeOrganicInput.checked,
        limit: 8
      }
    });

    state.lastSearchResult = result;
    selectors.searchDisclosure.textContent = result.disclosure || "";
    selectors.results.innerHTML = renderResults(result);
    setInlineStatus(
      selectors.simulatorStatus,
      summarizeSearch(result),
      "success"
    );
    syncQueueButtons();

    if (trackImpressions) {
      const impressions = [...(result.sponsored ?? [])].map((offer) =>
        recordEvent(offer.id, "impression", { source: "dashboard-preview" }, false)
      );
      await Promise.allSettled(impressions);
    }

    await loadAnalytics();
  } catch (error) {
    selectors.results.innerHTML = renderEmpty(error.message, "error");
    setInlineStatus(selectors.simulatorStatus, "Search failed. Check the API server and request payload.", "error");
  } finally {
    selectors.runSearchButton.disabled = false;
    selectors.runSearchButton.textContent = "Run Search";
  }
}

async function handleActionClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const offerId = button.dataset.offerId;

  if (action === "inspect" && offerId) {
    await withButtonBusy(button, "Loading", () => inspectOffer(offerId));
    return;
  }

  if (action === "claim" && offerId) {
    await withButtonBusy(button, "Claiming", () => claimOffer(offerId));
    return;
  }

  if (action === "dismiss" && offerId) {
    await withButtonBusy(button, "Dismissing", async () => {
      await recordEvent(offerId, "dismiss", { source: "beta-console", sessionId: state.sessionId });
      setInlineStatus(selectors.simulatorStatus, "Dismissal recorded in the audit trail.", "success");
    });
    return;
  }

  if (action === "report" && offerId) {
    await reportOffer(offerId, button);
    return;
  }

  if (action === "queue" && offerId) {
    toggleQueue(offerId);
    return;
  }

  if (action === "queue-remove" && offerId) {
    state.compareQueue.delete(offerId);
    renderQueue();
    syncQueueButtons();
  }
}

async function inspectOffer(offerId) {
  state.selectedOfferId = offerId;
  state.selectedOfferDetails = null;
  updateSelectedStat("Loading");
  selectors.detailLabel.textContent = "Loading offer";
  selectors.details.className = "empty-state";
  selectors.details.innerHTML = renderLoading("Loading offer details");
  selectors.integrationPanel.className = "empty-state";
  selectors.integrationPanel.innerHTML = renderLoading("Loading integration instructions");

  try {
    await recordEvent(offerId, "inspect", { source: "dashboard-details" }, false);
    const details = await api(`/api/offers/${encodeURIComponent(offerId)}`);
    state.selectedOfferDetails = details;
    selectors.detailLabel.textContent = details.suggestedPresentation?.label ?? "Offer selected";
    selectors.details.className = "details";
    selectors.details.innerHTML = renderDetails(details);
    updateSelectedStat(details.offer?.vendorName ?? offerId);
    await loadIntegration(offerId, details);
    await loadAnalytics();
  } catch (error) {
    selectors.detailLabel.textContent = "Inspect failed";
    selectors.details.className = "empty-state error";
    selectors.details.textContent = error.message;
    selectors.integrationPanel.className = "empty-state";
    selectors.integrationPanel.textContent = "Integration instructions are unavailable until details load.";
    updateSelectedStat("Error");
  }
}

async function loadIntegration(offerId, details) {
  let payload;
  let fallbackMessage = "";

  try {
    payload = await api(`/api/offers/${encodeURIComponent(offerId)}/integration`);
  } catch (error) {
    payload = buildIntegrationFallback(details);
    fallbackMessage = `Beta integration endpoint unavailable; showing integration metadata from offer details.`;
    payload.endpointError = error.message;
  }

  selectors.integrationPanel.className = "integration-view";
  selectors.integrationPanel.innerHTML = renderIntegration(payload, details, fallbackMessage);
}

async function claimOffer(offerId) {
  const metadata = {
    source: "beta-console",
    selectedIntent: selectors.intentInput.value,
    category: selectors.searchCategorySelect.value || undefined
  };

  try {
    await api("/api/claims", {
      method: "POST",
      body: {
        offerId,
        sessionId: state.sessionId,
        metadata
      }
    });
    setInlineStatus(selectors.simulatorStatus, "Claim recorded through the beta claims endpoint.", "success");
  } catch (error) {
    await recordEvent(
      offerId,
      "claim",
      {
        ...metadata,
        fallbackEndpoint: "/api/events",
        failedEndpoint: "/api/claims",
        failedReason: error.message
      },
      false
    );
    setInlineStatus(
      selectors.simulatorStatus,
      "Claims endpoint unavailable; claim was recorded through the event fallback.",
      "warning"
    );
  }

  await loadAnalytics();
}

async function reportOffer(offerId, button) {
  const reason = window.prompt(
    "Why should this offer be reviewed?",
    "Misleading, irrelevant, unsafe, or unclear disclosure"
  );
  if (!reason || !reason.trim()) return;

  await withButtonBusy(button, "Reporting", async () => {
    try {
      await api("/api/reports", {
        method: "POST",
        body: {
          offerId,
          reason: reason.trim(),
          category: "quality",
          sessionId: state.sessionId,
          metadata: {
            source: "beta-console",
            selectedIntent: selectors.intentInput.value
          }
        }
      });
      setInlineStatus(selectors.simulatorStatus, "Report submitted for moderation review.", "success");
    } catch (error) {
      await recordEvent(
        offerId,
        "report",
        {
          reason: reason.trim(),
          category: "quality",
          fallbackEndpoint: "/api/events",
          failedEndpoint: "/api/reports",
          failedReason: error.message
        },
        false
      );
      setInlineStatus(
        selectors.simulatorStatus,
        "Reports endpoint unavailable; report was recorded through the event fallback.",
        "warning"
      );
    }
    await loadAnalytics();
  });
}

async function runComparison() {
  const offerIds = [...state.compareQueue.keys()];
  if (offerIds.length < 2) {
    selectors.compareOutput.className = "empty-state compact";
    selectors.compareOutput.textContent = "Add two or more offers to compare.";
    return;
  }

  selectors.compareButton.disabled = true;
  selectors.compareButton.textContent = "Comparing";
  selectors.compareStatus.textContent = "Calling /api/offers/compare";
  selectors.compareOutput.className = "empty-state compact";
  selectors.compareOutput.innerHTML = renderLoading("Comparing selected offers");

  try {
    const result = await api("/api/offers/compare", {
      method: "POST",
      body: { offerIds }
    });
    selectors.compareStatus.textContent = "Beta compare endpoint";
    selectors.compareOutput.className = "compare-result";
    selectors.compareOutput.innerHTML = renderComparisonResult(result, "");
  } catch (error) {
    selectors.compareStatus.textContent = "Local fallback comparison";
    selectors.compareOutput.className = "compare-result";
    selectors.compareOutput.innerHTML = renderComparisonResult(
      buildLocalComparison(offerIds),
      `Compare endpoint unavailable: ${error.message}`
    );
  } finally {
    selectors.compareButton.disabled = state.compareQueue.size < 2;
    selectors.compareButton.textContent = "Compare";
  }
}

async function recordEvent(offerId, eventType, metadata = {}, refresh = true) {
  try {
    await api("/api/events", {
      method: "POST",
      body: {
        offerId,
        eventType,
        sessionId: state.sessionId,
        metadata
      }
    });

    if (refresh) {
      await loadAnalytics();
    }
  } catch (error) {
    if (refresh) {
      setInlineStatus(selectors.auditStatus, `Could not record ${eventType}: ${error.message}`, "error");
    }
  }
}

async function loadAnalytics() {
  selectors.metrics.innerHTML = renderLoading("Loading metrics");

  try {
    const analytics = await api("/api/analytics");
    selectors.metrics.innerHTML = renderMetrics(analytics.totals ?? {});
    selectors.eventLog.innerHTML = renderEvents(analytics.recentEvents ?? []);
    selectors.auditStatus.textContent = `${analytics.recentEvents?.length ?? 0} recent events`;
  } catch (error) {
    selectors.metrics.innerHTML = renderEmpty("Analytics unavailable", "error");
    selectors.eventLog.innerHTML = renderEmpty(error.message, "error");
    selectors.auditStatus.textContent = "Analytics failed";
  }
}

function toggleQueue(offerId) {
  if (state.compareQueue.has(offerId)) {
    state.compareQueue.delete(offerId);
  } else {
    const summary = findOfferSummary(offerId);
    if (!summary) return;
    state.compareQueue.set(offerId, summary);
  }

  renderQueue();
  syncQueueButtons();
}

function renderQueue() {
  const offers = [...state.compareQueue.values()];
  selectors.queueStat.textContent = `${offers.length} offer${offers.length === 1 ? "" : "s"}`;
  selectors.compareButton.disabled = offers.length < 2;

  if (offers.length === 0) {
    selectors.queueList.innerHTML = '<div class="empty-state compact">Queue offers from search results to compare fit, disclosure, and next action.</div>';
    return;
  }

  selectors.queueList.innerHTML = offers
    .map(
      (offer) => `
        <div class="queue-item">
          <div>
            <strong>${escapeHtml(offer.vendorName)}</strong>
            <span>${escapeHtml(offer.title)}</span>
          </div>
          <button class="icon-button" type="button" data-action="queue-remove" data-offer-id="${escapeHtml(offer.id)}" aria-label="Remove ${escapeHtml(offer.vendorName)}">Remove</button>
        </div>
      `
    )
    .join("");
}

function syncQueueButtons() {
  selectors.results.querySelectorAll("[data-action='queue']").forEach((button) => {
    const queued = state.compareQueue.has(button.dataset.offerId);
    button.textContent = queued ? "Queued" : "Queue";
    button.classList.toggle("active", queued);
  });
}

function updateSelectedStat(label) {
  if (label) {
    selectors.selectedStat.textContent = label;
    return;
  }

  if (!state.selectedOfferId) {
    selectors.selectedStat.textContent = "None";
    return;
  }

  selectors.selectedStat.textContent = state.selectedOfferDetails?.offer?.vendorName ?? state.selectedOfferId;
}

function renderResults(result) {
  const groups = [
    ["Sponsored", result.sponsored ?? []],
    ["Organic", result.organic ?? []]
  ].filter(([, offers]) => offers.length > 0);

  if (groups.length === 0) {
    return renderEmpty("No matching offers. Broaden the category, framework, or region filters.");
  }

  return groups
    .map(
      ([title, offers]) => `
        <div class="offer-group">
          <div class="offer-group-heading">
            <span>${escapeHtml(title)}</span>
            <span>${offers.length} result${offers.length === 1 ? "" : "s"}</span>
          </div>
          ${offers.map(renderOfferCard).join("")}
        </div>
      `
    )
    .join("");
}

function renderOfferCard(offer) {
  const className = offer.sponsored ? "sponsored" : "organic";
  const label = offer.label ?? (offer.sponsored ? "Sponsored" : "Organic");

  return `
    <article class="offer-card ${className}">
      <div class="offer-card-header">
        <div>
          <h3>${escapeHtml(offer.vendorName)}</h3>
          <p>${escapeHtml(offer.title)}</p>
        </div>
        <span class="label ${className}">${escapeHtml(label)}</span>
      </div>
      <p>${escapeHtml(offer.summary)}</p>
      <ul class="why">
        ${(offer.whyShown ?? []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <div class="actions">
        <button type="button" data-action="inspect" data-offer-id="${escapeHtml(offer.id)}">Inspect</button>
        <button class="secondary" type="button" data-action="queue" data-offer-id="${escapeHtml(offer.id)}">${state.compareQueue.has(offer.id) ? "Queued" : "Queue"}</button>
        <button class="secondary" type="button" data-action="claim" data-offer-id="${escapeHtml(offer.id)}">${escapeHtml(offer.ctaLabel ?? "Claim")}</button>
        <button class="secondary" type="button" data-action="dismiss" data-offer-id="${escapeHtml(offer.id)}">Dismiss</button>
        <button class="danger" type="button" data-action="report" data-offer-id="${escapeHtml(offer.id)}">Report</button>
      </div>
    </article>
  `;
}

function renderDetails(details) {
  const offer = details.offer ?? {};
  const presentation = details.suggestedPresentation ?? {};
  const allowedActions = Array.isArray(presentation.allowedActions) ? presentation.allowedActions : [];

  return `
    <div class="detail-summary">
      <div>
        <span class="label ${offer.sponsored ? "sponsored" : "organic"}">${escapeHtml(presentation.label ?? (offer.sponsored ? "Sponsored" : "Organic"))}</span>
        <h3>${escapeHtml(offer.vendorName)}: ${escapeHtml(offer.title)}</h3>
      </div>
      <div class="actions">
        <button type="button" data-action="claim" data-offer-id="${escapeHtml(offer.id)}">${escapeHtml(offer.ctaLabel ?? "Claim")}</button>
        <button class="secondary" type="button" data-action="queue" data-offer-id="${escapeHtml(offer.id)}">Queue</button>
        <button class="danger" type="button" data-action="report" data-offer-id="${escapeHtml(offer.id)}">Report</button>
      </div>
    </div>
    <div class="detail-grid">
      ${renderKeyValue("Disclosure", offer.disclosure)}
      ${renderKeyValue("Eligibility", offer.eligibility)}
      ${renderKeyValue("Terms", offer.terms)}
      ${renderKeyValue("Pricing", offer.pricingNotes)}
      ${renderKeyValue("Approval Boundary", presentation.approvalReminder)}
      ${renderKeyValue("Allowed Actions", allowedActions.join(", ") || "No action policy returned")}
    </div>
    <div class="setup-list">
      <h3>Setup Notes</h3>
      <ol>
        ${(offer.setupNotes ?? []).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ol>
    </div>
  `;
}

function renderIntegration(payload, details, fallbackMessage) {
  const integration = normalizeIntegration(payload, details);
  const sdkEntries = Object.entries(integration.sdkExamples ?? {});

  return `
    ${fallbackMessage ? `<div class="inline-status warning">${escapeHtml(fallbackMessage)}</div>` : ""}
    <div class="integration-header">
      <div>
        <h3>Integration Plan</h3>
        <p>${escapeHtml(integration.packageName || "No package name supplied")}</p>
      </div>
      <div class="actions">
        ${integration.docsUrl ? `<a class="button-link secondary" href="${escapeHtml(integration.docsUrl)}" target="_blank" rel="noreferrer">Docs</a>` : ""}
        ${integration.offerUrl ? `<a class="button-link" href="${escapeHtml(integration.offerUrl)}" target="_blank" rel="noreferrer">Offer</a>` : ""}
      </div>
    </div>
    <div class="integration-grid">
      ${renderKeyValue("Install Command", integration.installCommand || "No install command provided")}
      ${renderKeyValue("Environment", integration.requiredEnvVars.join(", ") || "No required env vars")}
      ${renderKeyValue("Config Files", integration.configFiles.join(", ") || "No config files listed")}
      ${renderKeyValue("Approval Reminder", integration.approvalReminder || "Use explicit approval before external handoffs or code changes")}
      ${renderKeyValue("Endpoint Source", integration.endpointSource)}
    </div>
    ${
      integration.setupNotes.length
        ? `
          <div class="setup-list">
            <h3>Implementation Steps</h3>
            <ol>
              ${integration.setupNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ol>
          </div>
        `
        : ""
    }
    ${
      sdkEntries.length
        ? `
          <div class="code-examples">
            <h3>SDK Example</h3>
            ${sdkEntries
              .map(
                ([name, code]) => `
                  <div>
                    <span>${escapeHtml(labelize(name))}</span>
                    <pre><code>${escapeHtml(code)}</code></pre>
                  </div>
                `
              )
              .join("")}
          </div>
        `
        : ""
    }
  `;
}

function renderMetrics(totals) {
  return EVENT_TYPES.map(
    (name) => `
      <div class="metric">
        <strong>${Number(totals[name] ?? 0).toLocaleString()}</strong>
        <span>${escapeHtml(labelize(name))}</span>
      </div>
    `
  ).join("");
}

function renderEvents(events) {
  if (!events.length) {
    return '<div class="empty-state compact">No events yet. Run a search, inspect an offer, or claim/report from the simulator.</div>';
  }

  return events
    .map(
      (event) => `
        <div class="event-row">
          <div>
            <strong>${escapeHtml(labelize(event.eventType))}</strong>
            <span>${escapeHtml(event.offerId)}</span>
          </div>
          <time>${escapeHtml(formatTime(event.occurredAt))}</time>
        </div>
      `
    )
    .join("");
}

function renderComparisonResult(result, fallbackMessage) {
  const rows = Array.isArray(result.rows) ? result.rows : Array.isArray(result.offers) ? result.offers : [];
  const recommendation =
    result.disclosure || result.recommendation || result.verdict || buildComparisonSummary(result.summary);

  if (!rows.length && !recommendation) {
    return `
      ${fallbackMessage ? `<div class="inline-status warning">${escapeHtml(fallbackMessage)}</div>` : ""}
      <pre><code>${escapeHtml(JSON.stringify(result, null, 2))}</code></pre>
    `;
  }

  return `
    ${fallbackMessage ? `<div class="inline-status warning">${escapeHtml(fallbackMessage)}</div>` : ""}
    ${recommendation ? `<p class="compare-note">${escapeHtml(recommendation)}</p>` : ""}
    <div class="compare-table">
      ${rows
        .map(
          (offer) => `
            <div class="compare-row">
              <strong>${escapeHtml(offer.vendorName)}</strong>
              <span>${escapeHtml(offer.title)}</span>
              <span>${escapeHtml(formatCompareMeta(offer))}</span>
              <span>${escapeHtml(offer.sponsored ? "Sponsored" : "Organic")}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderKeyValue(label, value) {
  return `
    <div class="kv">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(value || "Not supplied")}</p>
    </div>
  `;
}

function renderLoading(message) {
  return `<div class="loading-state"><span></span>${escapeHtml(message)}</div>`;
}

function renderEmpty(message, tone = "") {
  return `<div class="empty-state ${escapeHtml(tone)}">${escapeHtml(message)}</div>`;
}

function summarizeSearch(result) {
  const sponsored = result.sponsored?.length ?? 0;
  const organic = result.organic?.length ?? 0;
  const candidateCount = result.audit?.candidateCount;
  const suffix = typeof candidateCount === "number" ? ` from ${candidateCount} candidates` : "";
  return `${sponsored} sponsored and ${organic} organic result${sponsored + organic === 1 ? "" : "s"}${suffix}.`;
}

function findOfferSummary(offerId) {
  const searchedOffers = [
    ...(state.lastSearchResult?.sponsored ?? []),
    ...(state.lastSearchResult?.organic ?? [])
  ];
  const summary = searchedOffers.find((offer) => offer.id === offerId);
  if (summary) return summary;

  const selected = state.selectedOfferDetails?.offer;
  if (selected?.id === offerId) {
    return {
      id: selected.id,
      vendorName: selected.vendorName,
      title: selected.title,
      summary: selected.summary,
      category: selected.category,
      sponsored: selected.sponsored,
      label: selected.sponsored ? "Sponsored" : "Organic",
      whyShown: selected.relevanceReasons ?? [],
      score: selected.qualityScore ?? 0,
      ctaLabel: selected.ctaLabel
    };
  }

  return null;
}

function buildLocalComparison(offerIds) {
  const offers = offerIds
    .map((id) => state.compareQueue.get(id))
    .filter(Boolean)
    .map((offer) => ({
      id: offer.id,
      vendorName: offer.vendorName,
      title: offer.title,
      category: offer.category,
      sponsored: offer.sponsored,
      score: offer.score,
      summary: offer.summary
    }));

  const sponsoredCount = offers.filter((offer) => offer.sponsored).length;
  return {
    recommendation:
      "Local preview only. Production comparison should return fit, risk, pricing, disclosure, and approval guidance from the compare endpoint.",
    offers,
    audit: {
      selectedOfferIds: offerIds,
      sponsoredCount,
      organicCount: offers.length - sponsoredCount
    }
  };
}

function buildIntegrationFallback(details) {
  const offer = details.offer ?? {};
  return {
    integration: offer.integration ?? {},
    setupNotes: offer.setupNotes ?? [],
    sdkExamples: offer.sdkExamples ?? {},
    docsUrl: offer.docsUrl,
    offerUrl: offer.offerUrl,
    endpointSource: "offer details fallback"
  };
}

function normalizeIntegration(payload, details) {
  const offer = details.offer ?? {};
  const source = payload.integration ?? payload;
  const rawSteps = asArray(payload.steps ?? source.steps ?? offer.setupNotes);

  return {
    packageName: source.packageName ?? offer.integration?.packageName ?? "",
    installCommand: source.installCommand ?? offer.integration?.installCommand ?? "",
    requiredEnvVars: asArray(source.requiredEnvVars ?? source.envVars ?? offer.integration?.requiredEnvVars),
    configFiles: asArray(source.configFiles ?? offer.integration?.configFiles),
    setupNotes: rawSteps.map(formatIntegrationStep),
    sdkExamples: payload.sdkExamples ?? source.sdkExamples ?? offer.sdkExamples ?? {},
    docsUrl: payload.docsUrl ?? source.docsUrl ?? offer.docsUrl,
    offerUrl: payload.offerUrl ?? source.offerUrl ?? offer.offerUrl,
    approvalReminder: payload.approvalReminder ?? source.approvalReminder ?? "",
    endpointSource: payload.endpointSource ?? "GET /api/offers/:id/integration"
  };
}

function buildComparisonSummary(summary) {
  if (!summary || typeof summary !== "object") return "";
  const categories = Array.isArray(summary.categories) ? summary.categories.join(", ") : "mixed";
  const sponsoredCount = Number(summary.sponsoredCount ?? 0);
  const organicCount = Number(summary.organicCount ?? 0);
  return `${sponsoredCount} sponsored and ${organicCount} organic options across ${categories}.`;
}

function formatCompareMeta(offer) {
  const effort = offer.setupEffort?.level ? `${labelize(offer.setupEffort.level)} effort` : "";
  const envCount = Array.isArray(offer.envVars) ? `${offer.envVars.length} env vars` : "";
  return [offer.category, effort, envCount].filter(Boolean).join(" / ") || "unknown";
}

function formatIntegrationStep(step) {
  if (!step || typeof step !== "object") return String(step ?? "");
  const prefix = step.order ? `${step.order}. ` : "";
  const approval = step.approvalRequired ? " Approval required." : "";
  return `${prefix}${step.title ?? "Step"}: ${step.description ?? ""}${approval}`.trim();
}

async function withButtonBusy(button, label, callback) {
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    await callback();
  } finally {
    button.disabled = false;
    button.textContent = previousText;
    syncQueueButtons();
  }
}

function setInlineStatus(element, message, tone = "subtle") {
  element.textContent = message;
  element.className = `inline-status ${tone}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `${response.status} ${response.statusText}`.trim() || "Request failed");
  }

  return data;
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return splitList(value);
  return [];
}

function labelize(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return `sess_${globalThis.crypto.randomUUID().slice(0, 13)}`;
  }

  return `sess_${Math.random().toString(16).slice(2, 15)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
