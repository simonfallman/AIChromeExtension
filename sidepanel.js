const DEFAULT_API_URL = "https://simonfallman.xyz/api/chat";

const els = {
  toggleSettings: document.getElementById("toggleSettings"),
  settings:       document.getElementById("settings"),
  apiKey:         document.getElementById("apiKey"),
  apiUrl:         document.getElementById("apiUrl"),
  saveSettings:   document.getElementById("saveSettings"),
  savedMsg:       document.getElementById("savedMsg"),
  context:        document.getElementById("context"),
  refreshText:    document.getElementById("refreshText"),
  question:       document.getElementById("question"),
  askBtn:         document.getElementById("askBtn"),
  answerSection:  document.getElementById("answerSection"),
  answer:         document.getElementById("answer"),
  error:          document.getElementById("error"),
};

// ── Settings ────────────────────────────────────────────────────────────────

chrome.storage.local.get(["apiKey", "apiUrl"], ({ apiKey, apiUrl }) => {
  if (apiKey) els.apiKey.value = apiKey;
  els.apiUrl.value = apiUrl || DEFAULT_API_URL;
});

els.toggleSettings.addEventListener("click", () => {
  els.settings.hidden = !els.settings.hidden;
});

els.saveSettings.addEventListener("click", () => {
  chrome.storage.local.set({
    apiKey: els.apiKey.value.trim(),
    apiUrl: els.apiUrl.value.trim() || DEFAULT_API_URL,
  });
  els.savedMsg.textContent = "Saved";
  setTimeout(() => (els.savedMsg.textContent = ""), 2000);
});

// ── Grab selected text from active tab ──────────────────────────────────────

async function grabSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim(),
    });
    if (result) els.context.value = result;
  } catch {
    // Silently ignore — scripting may be blocked on chrome:// pages
  }
}

grabSelectedText();
els.refreshText.addEventListener("click", grabSelectedText);

// ── Ask ──────────────────────────────────────────────────────────────────────

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function clearError() {
  els.error.hidden = true;
}

els.question.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.askBtn.click();
});

els.askBtn.addEventListener("click", async () => {
  clearError();

  const { apiKey, apiUrl } = await chrome.storage.local.get(["apiKey", "apiUrl"]);
  const key = apiKey?.trim();
  const url = apiUrl?.trim() || DEFAULT_API_URL;
  const context = els.context.value.trim();
  const question = els.question.value.trim();

  if (!key) return showError("Add your API key in settings (⚙).");
  if (!context) return showError("No text selected. Select text on the page and click 'Grab selected text'.");
  if (!question) return showError("Enter a question.");

  els.askBtn.disabled = true;
  els.askBtn.textContent = "Asking…";
  els.answerSection.hidden = true;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({ context, question }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    els.answer.textContent = data.answer;
    els.answerSection.hidden = false;
  } catch (err) {
    showError(err.message);
  } finally {
    els.askBtn.disabled = false;
    els.askBtn.textContent = "Ask";
  }
});
