const mount = document.getElementById("dashboard-mount");
const lang = document.documentElement.lang === "en" ? "en" : "es";

const text = {
  es: {
    loading: "Cargando dashboard...",
    retrying: "Reintentando cargar el dashboard...",
    failed: "No se pudo cargar el dashboard.",
    action: "Recargar dashboard",
  },
  en: {
    loading: "Loading dashboard...",
    retrying: "Retrying dashboard load...",
    failed: "Could not load the dashboard.",
    action: "Reload dashboard",
  },
}[lang];

const DASHBOARD_MODULE = "/static/js/dashboard/index.js";
const PUBLIC_SECTIONS = new Set(["faqs", "tags", "contacto", "novedades"]);
const LOADING_NOTICE_DELAY_MS = 1800;
const STALL_NOTICE_DELAY_MS = 12000;

let loading = false;
let attempts = 0;
let loadingTimer = null;
let stallTimer = null;

const getSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();

const isPublicSection = () => PUBLIC_SECTIONS.has(getSectionFromHash());

const hasDashboardChrome = () =>
  !!mount?.querySelector(".add-bar") && !!mount?.querySelector("#machineList");

const removeBootstrapState = () => {
  mount?.querySelectorAll(".dashboard-bootstrap-state").forEach((node) => node.remove());
};

const renderState = (message, options = {}) => {
  if (!mount || isPublicSection() || hasDashboardChrome()) return;
  removeBootstrapState();

  const wrap = document.createElement("div");
  wrap.className = "dashboard-bootstrap-state";

  const label = document.createElement("div");
  label.className = "dashboard-bootstrap-text";
  label.textContent = message;
  wrap.appendChild(label);

  if (options.action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dashboard-bootstrap-retry";
    btn.textContent = text.action;
    btn.addEventListener("click", () => {
      loadDashboard({ force: true, message: text.retrying });
    });
    wrap.appendChild(btn);
  }

  mount.appendChild(wrap);
};

const clearStallTimer = () => {
  if (!stallTimer) return;
  window.clearTimeout(stallTimer);
  stallTimer = null;
};

const clearLoadingTimer = () => {
  if (!loadingTimer) return;
  window.clearTimeout(loadingTimer);
  loadingTimer = null;
};

const armLoadingTimer = (message) => {
  clearLoadingTimer();
  loadingTimer = window.setTimeout(() => {
    if (!hasDashboardChrome()) renderState(message);
  }, LOADING_NOTICE_DELAY_MS);
};

const armStallTimer = () => {
  clearStallTimer();
  stallTimer = window.setTimeout(() => {
    if (!hasDashboardChrome()) renderState(text.failed, { action: true });
  }, STALL_NOTICE_DELAY_MS);
};

const finishIfMounted = () => {
  if (hasDashboardChrome()) {
    clearLoadingTimer();
    clearStallTimer();
    removeBootstrapState();
    return true;
  }
  return false;
};

const loadDashboard = async (options = {}) => {
  if (!mount || isPublicSection() || hasDashboardChrome() || loading) return;
  loading = true;
  attempts += 1;

  armLoadingTimer(options.message || text.loading);
  armStallTimer();

  const url = options.force || attempts > 1
    ? `${DASHBOARD_MODULE}?retry=${Date.now()}`
    : DASHBOARD_MODULE;

  try {
    await import(/* @vite-ignore */ url);
    window.requestAnimationFrame(() => {
      if (!finishIfMounted()) renderState(text.failed, { action: true });
    });
  } catch (error) {
    console.error("Dashboard bootstrap failed", error);
    clearLoadingTimer();
    renderState(text.failed, { action: true });
  } finally {
    loading = false;
    if (hasDashboardChrome()) clearStallTimer();
  }
};

const ensureDashboard = () => {
  if (!mount || isPublicSection() || hasDashboardChrome()) return;
  window.setTimeout(() => {
    if (!hasDashboardChrome()) {
      loadDashboard({ force: attempts > 0, message: text.retrying });
    }
  }, 250);
};

window.addEventListener("pageshow", ensureDashboard);
window.addEventListener("hashchange", ensureDashboard);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) ensureDashboard();
});

loadDashboard();
