import {
  isTopbarLoadingMessage,
  setTopbarLogoLoading
} from "/static/js/topbar/loading-logo.js";

let statusEl = null;
let statusTimeout = null;

const getStatusState = (message, requestedState = "") => {
  if (["error", "loading", "ok"].includes(requestedState)) return requestedState;
  const normalized = String(message || "").trim().toLocaleLowerCase();
  if (!normalized) return "";
  if (
    /\b(error|failed|failure|denied|duplicate|invalid|full|already exists)\b/.test(normalized) ||
    /\b(no se pudo|sin permisos|permiso denegado|duplicad[oa]|inválid[oa]|lleno|ya existe)\b/.test(normalized)
  ) {
    return "error";
  }
  if (isTopbarLoadingMessage(message)) return "loading";
  return "ok";
};

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
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");
  wrap.appendChild(statusEl);
  return statusEl;
};

export const setTopbarSaveStatus = (message = "", requestedState = "") => {
  const state = getStatusState(message, requestedState);
  setTopbarLogoLoading("topbar-status", state === "loading");
  const el = ensureStatusEl();
  if (!el) return;
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = null;
  el.textContent = message || "";
  if (state) el.dataset.state = state;
  else delete el.dataset.state;
  if (state === "ok") {
    statusTimeout = setTimeout(() => {
      el.textContent = "";
      delete el.dataset.state;
      statusTimeout = null;
    }, 1600);
  }
};
