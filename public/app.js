// State management
let webhooks = [];

// DOM elements
const webhooksContainer = document.getElementById("webhooksContainer");
const refreshBtn = document.getElementById("refreshBtn");
const totalWebhooksEl = document.getElementById("totalWebhooks");
const todayWebhooksEl = document.getElementById("todayWebhooks");
const recentSourceEl = document.getElementById("recentSource");
const modal = document.getElementById("detailModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.querySelector(".close");

// Fetch webhooks from server
async function fetchWebhooks() {
  try {
    console.log("Fetching webhooks...");
    const response = await fetch("/api/webhooks");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    webhooks = await response.json();
    console.log("Webhooks fetched:", webhooks.length);

    renderWebhooks();
    updateStats();
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    webhooksContainer.innerHTML = `
            <div class="empty-state">
                <h3>⚠️ Error Loading Webhooks</h3>
                <p>${error.message}</p>
            </div>
        `;
  }
}

// Render webhooks list
function renderWebhooks() {
  console.log("Rendering", webhooks.length, "webhooks");

  if (webhooks.length === 0) {
    webhooksContainer.innerHTML = `
            <div class="empty-state">
                <h3>📭 No Webhooks Yet</h3>
                <p>Waiting for incoming webhooks...</p>
                <p style="margin-top: 10px; font-size: 14px;">
                    Send a POST request to: <br>
                    <code>http://localhost:3000/webhook/github</code>
                </p>
            </div>
        `;
    return;
  }

  webhooksContainer.innerHTML = webhooks
    .map((webhook, index) => {
      const time = new Date(webhook.timestamp).toLocaleString();
      const source = webhook.source || "unknown";
      const status = webhook.status || "received";

      // Extract useful info based on source
      let eventInfo = "";
      if (source === "github" && webhook.payload) {
        const event = webhook.headers["x-github-event"] || "unknown";
        eventInfo = `<p><strong>Event:</strong> ${event}</p>`;

        if (event === "push" && webhook.payload.commits) {
          const commits = webhook.payload.commits.length;
          const branch = webhook.payload.ref?.split("/").pop() || "unknown";
          eventInfo += `<p>${commits} commit(s) to <strong>${branch}</strong></p>`;
        }

        if (webhook.payload.repository) {
          eventInfo += `<p><strong>Repo:</strong> ${webhook.payload.repository.full_name}</p>`;
        }
      }

      return `
            <div class="webhook-card" onclick="showWebhookDetails(${index})">
                <div class="webhook-header">
                    <span class="webhook-source">${source}</span>
                    <span class="webhook-time">${time}</span>
                </div>
                <div class="webhook-info">
                    ${eventInfo}
                    <p><span class="webhook-status status-${status}">${status}</span></p>
                </div>
            </div>
        `;
    })
    .join("");
}

// Update statistics
function updateStats() {
  totalWebhooksEl.textContent = webhooks.length;

  // Count webhooks from today
  const today = new Date().toDateString();
  const todayCount = webhooks.filter((w) => {
    return new Date(w.timestamp).toDateString() === today;
  }).length;
  todayWebhooksEl.textContent = todayCount;

  // Most recent source
  if (webhooks.length > 0) {
    recentSourceEl.textContent = webhooks[0].source || "unknown";
  }
}

// Show webhook details in modal
function showWebhookDetails(index) {
  const webhook = webhooks[index];

  modalBody.innerHTML = `
        <div class="detail-section">
            <h3>📋 Basic Information</h3>
            <p><strong>Source:</strong> ${webhook.source}</p>
            <p><strong>Timestamp:</strong> ${new Date(
              webhook.timestamp
            ).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="webhook-status status-${
              webhook.status
            }">${webhook.status}</span></p>
            ${
              webhook.signatureValid !== undefined
                ? `<p><strong>Signature Valid:</strong> ${
                    webhook.signatureValid ? "✅ Yes" : "❌ No"
                  }</p>`
                : ""
            }
        </div>
        
        <div class="detail-section">
            <h3>📨 Headers</h3>
            <div class="json-display">${JSON.stringify(
              webhook.headers,
              null,
              2
            )}</div>
        </div>
        
        <div class="detail-section">
            <h3>📦 Payload</h3>
            <div class="json-display">${JSON.stringify(
              webhook.payload,
              null,
              2
            )}</div>
        </div>
    `;

  modal.style.display = "block";
}

// Close modal
closeModal.onclick = function () {
  modal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// Refresh button
refreshBtn.addEventListener("click", () => {
  console.log("Refresh button clicked");
  fetchWebhooks();
});

// Auto-refresh every 10 seconds
setInterval(fetchWebhooks, 10000);

// Initial load
console.log("App.js loaded - fetching webhooks...");
fetchWebhooks();
