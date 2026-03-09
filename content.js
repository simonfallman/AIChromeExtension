document.addEventListener("copy", () => {
  const text = window.getSelection().toString().trim();
  if (text) {
    chrome.runtime.sendMessage({ type: "TEXT_COPIED", text });
  }
});
