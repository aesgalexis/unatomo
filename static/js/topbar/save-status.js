let statusEl = null;
let statusTimeout = null;

const ensureStatusEl = () => {
  if (statusEl && document.contains(statusEl)) return statusEl;
  statusEl = document.getElementById("topbar-status");
  if (statusEl) return statusEl;
  const title = document.getElementById("topbar-title");
  if (!title) return null;
  const wrap = title.closest(".topbar-title-wrap") || title.parentElement;
  if (!wrap) return null;
  statusEl = document.createElement("div");
  statusEl.className = "topbar-status";
  statusEl.id = "topbar-status";
  statusEl.setAttribute("aria-live", "polite");
  wrap.appendChild(statusEl);
  return statusEl;
};

export const setTopbarSaveStatus = (message = "") => {
  const el = ensureStatusEl();
  if (!el) return;
  if (statusTimeout) clearTimeout(statusTimeout);
  el.textContent = message || "";
  if (message && message !== "Guardando...") {
    statusTimeout = setTimeout(() => {
      el.textContent = "";
    }, 1600);
  }
};
