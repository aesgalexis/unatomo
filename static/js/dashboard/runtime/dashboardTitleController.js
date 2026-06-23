import {
  MAX_DASHBOARD_TITLE_LENGTH,
  normalizeDashboardTitle
} from "../layout/dashboardLayoutModel.mjs";

const CACHE_KEY = "unatomo_dashboard_title_v1";

export const createDashboardTitleController = ({
  state,
  t,
  attachTooltip,
  normalizeLayout,
  persistTitle,
  updateSaveState
}) => {
  const getDefaultTitle = () => t("dashboard.navDashboard", "Dashboard");
  const getCachedTitle = () => {
    try {
      return normalizeDashboardTitle(localStorage.getItem(CACHE_KEY) || "");
    } catch {
      return "";
    }
  };
  const getTitle = () =>
    normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle) ||
    getCachedTitle() ||
    getDefaultTitle();
  const cacheTitle = (title) => {
    try {
      const normalized = normalizeDashboardTitle(title);
      if (normalized) localStorage.setItem(CACHE_KEY, normalized);
    } catch {}
  };
  const clearCachedTitle = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
  };
  const apply = () => {
    const titleEl = document.getElementById("topbar-title");
    if (!titleEl || titleEl.dataset.editing === "true") return;
    titleEl.textContent = getTitle();
    cacheTitle(normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle));
  };
  const initEditor = () => {
    const titleEl = document.getElementById("topbar-title");
    if (!titleEl || titleEl.dataset.dashboardTitleEditor === "true") return;
    titleEl.dataset.dashboardTitleEditor = "true";
    titleEl.classList.add("topbar-title-editable");
    titleEl.setAttribute("contenteditable", "plaintext-only");
    titleEl.setAttribute("spellcheck", "false");
    titleEl.setAttribute("role", "textbox");
    titleEl.setAttribute("aria-label", t("dashboard.titleEditAria", "Editar título del dashboard"));
    titleEl.setAttribute("data-tooltip", t("dashboard.titleEditHint", "Editar título del dashboard"));
    attachTooltip(titleEl, { align: "left", placement: "bottom" });

    let beforeEdit = "";
    const clampTitle = () => {
      const raw = titleEl.textContent || "";
      if (raw.length <= MAX_DASHBOARD_TITLE_LENGTH) return;
      titleEl.textContent = raw.slice(0, MAX_DASHBOARD_TITLE_LENGTH);
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      range.collapse(false);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };
    titleEl.addEventListener("focus", () => {
      titleEl.dataset.editing = "true";
      beforeEdit = getTitle();
    });
    titleEl.addEventListener("input", clampTitle);
    titleEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        titleEl.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        titleEl.textContent = beforeEdit;
        titleEl.blur();
      }
    });
    titleEl.addEventListener("blur", async () => {
      titleEl.dataset.editing = "false";
      const nextTitle = normalizeDashboardTitle(titleEl.textContent);
      const previousTitle = normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle);
      state.dashboardLayout = {
        ...normalizeLayout(state.dashboardLayout),
        dashboardTitle: nextTitle
      };
      if (nextTitle) cacheTitle(nextTitle);
      else clearCachedTitle();
      apply();
      if (nextTitle === previousTitle) return;
      updateSaveState(t("dashboard.saving", "Guardando..."));
      try {
        await persistTitle(state.uid, nextTitle);
        updateSaveState(t("dashboard.saved", "Guardado"));
      } catch {
        updateSaveState(t("dashboard.saveError", "Error al guardar"));
      }
    });
  };

  return { apply, getTitle, initEditor };
};
