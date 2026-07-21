const state = {
  categories: [],
  selectedOfferId: null
};

const selectors = {
  healthStatus: document.querySelector("#healthStatus"),
  categorySelect: document.querySelector("#categorySelect"),
  searchCategorySelect: document.querySelector("#searchCategorySelect"),
  campaignForm: document.querySelector("#campaignForm"),
  formMessage: document.querySelector("#formMessage"),
  runSearchButton: document.querySelector("#runSearchButton"),
  refreshAnalyticsButton: document.querySelector("#refreshAnalyticsButton"),
  intentInput: document.querySelector("#intentInput"),
  frameworkInput: document.querySelector("#frameworkInput"),
  languageInput: document.querySelector("#languageInput"),
  regionInput: document.querySelector("#regionInput"),
  includeOrganicInput: document.querySelector("#includeOrganicInput"),
  searchDisclosure: document.querySelector("#searchDisclosure"),
  results: document.querySelector("#results"),
  details: document.querySelector("#details"),
  detailLabel: document.querySelector("#detailLabel"),
  metrics: document.querySelector("#metrics"),
  eventLog: document.querySelector("#eventLog")
};

selectors.campaignForm.addEventListener("submit", handleCampaignSubmit);
selectors.runSearchButton.addEventListener("click", runSearch);
selectors.refreshAnalyticsButton.addEventListener("click", loadAnalytics);

await boot();

async function boot() {
  await checkHealth();
  await loadCategories();
  await runSearch();
  await loadAnalytics();
}

async function checkHealth() {
  try {
    await api("/health");
    selectors.healthStatus.textContent = "API connected";
    selectors.healthStatus.classList.add("ok");
  } catch {
    selectors.healthStatus.textContent = "API unavailable";
    selectors.healthStatus.classList.remove("ok");
  }
}

async function loadCategories() {
  const data = await api("/api/categories");
  state.categories = data.categories;

  selectors.categorySelect.innerHTML = state.categories
    .map((category) => `<option value="${escapeHtml(category)}">${labelize(category)}</option>`)
    .join("");
  selectors.categorySelect.value = "auth";

  selectors.searchCategorySelect.innerHTML = [
    '<option value="">All categories</option>',
    ...state.categories.map(
      (category) => `<option value="${escapeHtml(category)}">${labelize(category)}</option>`
    )
  ].join("");
}

async function handleCampaignSubmit(event) {
  event.preventDefault();
  selectors.formMessage.textContent = "";
  selectors.formMessage.classList.remove("error");

  const submitButton = selectors.campaignForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

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

    selectors.formMessage.textContent = `Saved ${result.offer.title}`;
    selectors.intentInput.value = payload.targetIntents.join(" ");
    selectors.searchCategorySelect.value = payload.category;
    await runSearch();
  } catch (error) {
    selectors.formMessage.textContent = error.message;
    selectors.formMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
  }
}

async function runSearch() {
  selectors.runSearchButton.disabled = true;
  selectors.results.innerHTML = '<div class="empty-state">Loading offers</div>';

  try {
    const result = await api("/api/offers/search", {
      method: "POST",
      body: {
        intent: selectors.intentInput.value,
        category: selectors.searchCategorySelect.value,
        frameworks: splitList(selectors.frameworkInput.value),
        languages: splitList(selectors.languageInput.value),
        region: selectors.regionInput.value,
        includeOrganic: selectors.includeOrganicInput.checked,
        limit: 6
      }
    });

    selectors.searchDisclosure.textContent = result.disclosure;
    selectors.results.innerHTML = renderResults(result);

    selectors.results.querySelectorAll("[data-inspect]").forEach((button) => {
      button.addEventListener("click", () => inspectOffer(button.dataset.inspect));
    });

    selectors.results.querySelectorAll("[data-track]").forEach((button) => {
      button.addEventListener("click", () => {
        track(button.dataset.track, button.dataset.eventType);
      });
    });

    await Promise.all(
      result.sponsored.map((offer) =>
        track(offer.id, "impression", { source: "dashboard-preview" }, false)
      )
    );
    await loadAnalytics();
  } catch (error) {
    selectors.searchDisclosure.textContent = "";
    selectors.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    selectors.runSearchButton.disabled = false;
  }
}

async function inspectOffer(offerId) {
  state.selectedOfferId = offerId;
  selectors.details.innerHTML = '<div class="details-empty">Loading details</div>';

  try {
    await track(offerId, "inspect", { source: "dashboard-details" }, false);
    const details = await api(`/api/offers/${encodeURIComponent(offerId)}`);
    selectors.detailLabel.textContent = details.suggestedPresentation.label;
    selectors.details.className = "details";
    selectors.details.innerHTML = renderDetails(details);
    selectors.details.querySelectorAll("[data-track]").forEach((button) => {
      button.addEventListener("click", () => {
        track(button.dataset.track, button.dataset.eventType);
      });
    });
    await loadAnalytics();
  } catch (error) {
    selectors.details.className = "details-empty";
    selectors.details.textContent = error.message;
  }
}

async function track(offerId, eventType, metadata = {}, refresh = true) {
  await api("/api/events", {
    method: "POST",
    body: {
      offerId,
      eventType,
      metadata
    }
  });

  if (refresh) {
    await loadAnalytics();
  }
}

async function loadAnalytics() {
  const analytics = await api("/api/analytics");
  selectors.metrics.innerHTML = Object.entries(analytics.totals)
    .map(
      ([name, count]) => `
        <div class="metric">
          <strong>${count}</strong>
          <span>${escapeHtml(labelize(name))}</span>
        </div>
      `
    )
    .join("");

  selectors.eventLog.innerHTML =
    analytics.recentEvents.length === 0
      ? '<div class="empty-state">No events yet</div>'
      : analytics.recentEvents
          .map(
            (event) => `
              <div class="event-row">
                <span>${escapeHtml(labelize(event.eventType))}</span>
                <span>${escapeHtml(event.offerId)}</span>
              </div>
            `
          )
          .join("");
}

function renderResults(result) {
  const groups = [
    ["Sponsored", result.sponsored],
    ["Organic", result.organic]
  ].filter(([, offers]) => offers.length > 0);

  if (groups.length === 0) {
    return '<div class="empty-state">No matching offers</div>';
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
  return `
    <article class="offer-card ${className}" style="--accent: ${offer.sponsored ? "#b45309" : "#0f766e"}">
      <div class="offer-card-header">
        <div>
          <h3>${escapeHtml(offer.vendorName)}</h3>
          <p>${escapeHtml(offer.title)}</p>
        </div>
        <span class="label ${className}">${escapeHtml(offer.label)}</span>
      </div>
      <p>${escapeHtml(offer.summary)}</p>
      <ul class="why">
        ${offer.whyShown.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <div class="actions">
        <button type="button" data-inspect="${escapeHtml(offer.id)}">Inspect</button>
        <button class="secondary" type="button" data-track="${escapeHtml(offer.id)}" data-event-type="claim">${escapeHtml(offer.ctaLabel)}</button>
        <button class="secondary" type="button" data-track="${escapeHtml(offer.id)}" data-event-type="dismiss">Dismiss</button>
        <button class="danger" type="button" data-track="${escapeHtml(offer.id)}" data-event-type="report">Report</button>
      </div>
    </article>
  `;
}

function renderDetails(details) {
  const offer = details.offer;
  const sdkEntries = Object.entries(offer.sdkExamples);

  return `
    <div class="detail-grid">
      <div class="detail-box full">
        <h3>${escapeHtml(offer.title)}</h3>
        <p>${escapeHtml(offer.disclosure)}</p>
        <div class="actions">
          <button type="button" data-track="${escapeHtml(offer.id)}" data-event-type="claim">${escapeHtml(offer.ctaLabel)}</button>
          <button class="secondary" type="button" data-track="${escapeHtml(offer.id)}" data-event-type="dismiss">Dismiss</button>
          <button class="danger" type="button" data-track="${escapeHtml(offer.id)}" data-event-type="report">Report</button>
        </div>
      </div>
      <div class="detail-box">
        <h3>Terms</h3>
        <p>${escapeHtml(offer.terms)}</p>
      </div>
      <div class="detail-box">
        <h3>Pricing</h3>
        <p>${escapeHtml(offer.pricingNotes)}</p>
      </div>
      <div class="detail-box">
        <h3>Integration</h3>
        <p>${escapeHtml(offer.integration.installCommand || "No install command provided")}</p>
        <p>${escapeHtml(offer.integration.requiredEnvVars.join(", ") || "No required env vars")}</p>
      </div>
      <div class="detail-box">
        <h3>Approval Boundary</h3>
        <p>${escapeHtml(details.suggestedPresentation.approvalReminder)}</p>
      </div>
      <div class="detail-box full">
        <h3>Setup Notes</h3>
        <ol>
          ${offer.setupNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
        </ol>
      </div>
      ${
        sdkEntries.length
          ? `
            <div class="detail-box full">
              <h3>SDK Example</h3>
              ${sdkEntries
                .map(([, code]) => `<pre><code>${escapeHtml(code)}</code></pre>`)
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function labelize(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
