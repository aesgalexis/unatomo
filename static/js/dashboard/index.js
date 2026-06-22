import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, db, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, fetchLegacyMachines, migrateLegacyMachines, fetchMachine, upsertMachine, deleteMachine, addUserWithRegistry, deleteUserRegistry, fetchDashboardLayout, upsertDashboardLayout } from "./firestoreRepo.js";
import { upsertAccountDirectory, normalizeEmail, getDisplayNameByEmail } from "./admin/accountDirectoryRepo.js";
import { fetchInvitesForAdmin } from "./admin/adminInvitesRepo.js";
import { fetchLinksForAdmin } from "./admin/adminLinksRepo.js";
import { createAdminInvite, respondAdminInvite, leaveAdminRole, revokeAdminInvite, ensureAdminLink, createMachineTransferInvite, respondMachineTransferInvite, cancelMachineTransferInvite } from "./admin/adminFunctionsRepo.js";
import { validateTag, assignTag } from "./tagRepo.js";
import { createTagToken } from "/static/js/tokens/tagTokens.js";
import { upsertMachineAccessFromMachine, fetchMachineAccess } from "./machineAccessRepo.js";
import { buildMachineTagUrl, generateMachineTagQr, disconnectMachineTag } from "./tags/tagAssetsRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initGroupedDragAndDrop } from "./dragAndDrop.js";
import { cloneMachines, normalizeMachine, createDraftMachine } from "./machineStore.js";
import { installTaskHooks } from "./cardHooks/taskHooks.js";
import { installDocumentHooks } from "./cardHooks/documentHooks.js";
import { generateSaltBase64, hashPassword } from "/static/js/utils/crypto.js";
import { initAutoSave } from "./autoSave.js";
import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";
import {
  RESTORE_OPERATION_TASK_SOURCE,
  buildAddTaskAttachmentsUpdate,
  buildStatusToggleUpdate
} from "/static/js/dashboard/tabs/tasks/taskActions.js";
import { filterMachines } from "./components/machineSearch/machineFilter.js";
import { createMachineSearchBar } from "./components/machineSearch/machineSearchBar.js";
import { createDashboardSectionNav } from "./components/sectionNav.js";
import { openStatusIncidentModal } from "./components/statusIncidentModal/statusIncidentModal.js";
import { createDashboardViewMenu } from "./components/viewMenu/viewMenu.js";
import { createDashboardLoading } from "./components/loading/dashboardLoading.js";
import {
  getDashboardLoadProgress,
  hasDashboardLoadError,
  markAdminLoadFailure,
  markAdminLoadSuccess,
  markDashboardLoadFailure,
  markDashboardLoadTimeout,
  markOwnerLoadFailure,
  markOwnerLoadSuccess,
  resetDashboardLoadState
} from "./components/loading/dashboardLoadState.js";
import {
  renderDashboardEmptyPlaceholder,
  renderDashboardLoadErrorPlaceholder,
  renderDashboardNoResultsPlaceholder
} from "./components/loading/dashboardPlaceholders.js";
import {
  MAX_DASHBOARD_TITLE_LENGTH,
  normalizeDashboardLayout as normalizeDashboardLayoutBase,
  normalizeDashboardTitle,
  normalizeTabOrder
} from "./layout/dashboardLayoutModel.mjs";
import {
  createDashboardGroupId,
  createChildGroup,
  createGroupFromMachineDrop,
  deleteGroup,
  getNextDashboardGroupTitle,
  moveGroupToGroup,
  moveMachineAfterTarget,
  moveMachineToGroup as moveMachineToDashboardGroup,
  renameGroup,
  reorderFlatMachines,
  reorderMixedItems,
  reorderUngroupedMachines,
  updatePlacementOrder
} from "./layout/dashboardLayoutActions.js";
import { countUnseenGlobalRegistryEntries } from "./views/registry/globalRegistryModel.js";
import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  MAX_TODO_LENGTH,
  TODO_PAGE_SIZE,
  renderRegistryDashboardView,
  renderSuggestionsDashboardView,
  renderTodoDashboardView
} from "./views/dashboardInternalViews.js";
import { createMachineAccessSync } from "./data/machineAccessSync.js";
import { createDashboardSubscriptions } from "./data/dashboardSubscriptions.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";
import {
  createDashboardSuggestion,
  deleteDashboardSuggestion,
  fetchDashboardSuggestions,
  markDashboardSuggestionsSeen,
  updateDashboardSuggestionResolved
} from "./views/suggestions/suggestionsRepo.js";
import {
  countUnseenSuggestions
} from "./views/suggestions/suggestionsView.js";
import {
  createDashboardTodo,
  deleteDashboardTodo,
  fetchDashboardTodos,
  updateDashboardTodo
} from "./views/todo/todoRepo.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import { calculateStorageUsage, STORAGE_LIMIT_BYTES } from "/static/js/configuracion/storageUsage.js";
import { getAppBasePrefix, getCurrentLang, setSavedLang } from "/static/js/site/locale.js";
import { t } from "./i18n.js";

const DEFAULT_COLLAPSED_HEIGHT = 108;
const EXPAND_FACTOR = 2.5;
const DASHBOARD_TITLE_CACHE_KEY = "unatomo_dashboard_title_v1";

const mount = document.getElementById("dashboard-mount");
const appBasePrefix = getAppBasePrefix();
const lang = getCurrentLang();
const qrPrintHref =
  lang === "en"
    ? `${appBasePrefix || ""}/en/qr-print.html`
    : `${appBasePrefix || ""}/es/impresion-qr.html`;
const redirectToEntry = () => {
  setSavedLang(lang);
  window.location.href = `${appBasePrefix || ""}/`;
};
const getPublicSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();
const isPublicSectionHash = () =>
  ["faqs", "tags", "contacto", "novedades"].includes(getPublicSectionFromHash());
const getDashboardInternalView = () =>
  ["registro", "sugerencias", "todo"].includes(getPublicSectionFromHash())
    ? getPublicSectionFromHash()
    : "dashboard";

const isMobileViewport = () =>
  !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

try {
  if (isMobileViewport() && "scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
} catch {}

if (mount) {
  const state = {
    uid: null,
    adminLabel: "",
    adminEmail: "",
    remoteMachines: [],
    ownerMachines: [],
    adminMachines: [],
    draftMachines: [],
    expandedById: [],
    selectedTabById: {},
    configSubtabById: {},
    tagStatusById: {},
    dashboardLayout: {
      groups: [],
      placements: {},
      tabOrder: [],
      dashboardTitle: "",
      registrySeenAt: "",
      suggestionsSeenAt: "",
      machineViewMode: "grouped",
      machineSortMode: "manual"
    },
    activeView: getDashboardInternalView(),
    registryVisibleCount: GLOBAL_REGISTRY_PAGE_SIZE,
    suggestionsVisibleCount: SUGGESTIONS_PAGE_SIZE,
    todoVisibleCount: TODO_PAGE_SIZE,
    suggestions: [],
    suggestionsReady: false,
    suggestionReplyTarget: null,
    todos: [],
    todosReady: false,
    canSuggest: false,
    canTodo: false,
    isSuperadmin: false,
    searchQuery: "",
    pendingInvites: [],
    pendingTransferInvites: [],
    mobileFocusedMachineId: "",
    mobileDetailJustEntered: false,
    loading: true,
    stylesReady: !window.__unatomoStylesReady,
    ownerReady: false,
    adminReady: false,
    ownerLoadFailed: false,
    adminLoadFailed: false,
    loadTimedOut: false,
    loadingGuardTimer: null,
    storageFull: false,
    nextScrollRestoreY: null,
    nextScrollAnchor: null,
    initialGroupPriorityOrder: {},
    initialGroupPriorityReady: false
  };

  const cardRefs = new Map();
  const locallyVisibleEmptyGroupIds = new Set();
  const pendingStatusIncidentMachineIds = new Set();
  const ORDER_CACHE_KEY = "unatomo_order_v1";
  const loadOrderCache = () => {
    try {
      const raw = localStorage.getItem(ORDER_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };
  const saveOrderCache = (list) => {
    try {
      const map = {};
      (list || []).forEach((m) => {
        if (m && m.id) map[m.id] = m.order ?? 0;
      });
      localStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };
  let rebuildToken = 0;
  let rebuildTimer = null;
  let pendingRebuildOptions = null;
  let activeDashboardUid = "";
  let dashboardInitPromise = null;
  let dashboardSessionVersion = 0;
  let groupedDragAndDropReady = false;
  let machineAccessSync = null;
  let dashboardSubscriptions = null;

  const clearDashboardTooltips = () => {
    document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
  };

  const attachDashboardTooltip = (target, { align = "center", placement = "top" } = {}) => {
    if (
      window.matchMedia &&
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    let tipEl = null;
    const showTip = () => {
      const label = target.getAttribute("data-tooltip");
      if (!label) return;
      clearDashboardTooltips();
      tipEl = document.createElement("div");
      tipEl.className = "mc-tooltip";
      tipEl.textContent = label;
      document.body.appendChild(tipEl);
      const rect = target.getBoundingClientRect();
      const left = align === "right"
        ? rect.right - tipEl.offsetWidth
        : align === "left"
          ? rect.left
          : rect.left + (rect.width - tipEl.offsetWidth) / 2;
      const top = placement === "bottom"
        ? rect.bottom + 10
        : rect.top - tipEl.offsetHeight - 10;
      tipEl.style.top = `${Math.max(8, top)}px`;
      tipEl.style.left = `${Math.max(8, left)}px`;
    };
    const hideTip = () => {
      if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
      tipEl = null;
    };
    target.addEventListener("mouseenter", showTip);
    target.addEventListener("mouseleave", hideTip);
    target.addEventListener("focus", showTip);
    target.addEventListener("blur", hideTip);
    target.addEventListener("click", hideTip);
  };

  ["pointerdown", "dragstart", "scroll", "resize"].forEach((eventName) => {
    window.addEventListener(eventName, clearDashboardTooltips, true);
  });
  window.addEventListener("blur", clearDashboardTooltips);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearDashboardTooltips();
  });

  const statusLabels = {
    operativa: t("dashboard.statusByValue.operativa", "Operativo"),
    fuera_de_servicio: t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio")
  };

  const normalizeStatus = (value) =>
    value === "desconectada" ? "fuera_de_servicio" : value || "operativa";

  const getMachinePendingTaskCount = (machine) =>
    (Array.isArray(machine?.tasks) ? machine.tasks : [])
      .filter((task) => getTaskTiming(task).pending)
      .length;

  const compareMachineTitle = (a, b) =>
    (a?.title || "").localeCompare(b?.title || "", "es", { sensitivity: "base" }) ||
    ((a?.order ?? 0) - (b?.order ?? 0));

  const sortFlatMachines = (machines = [], sortMode = "manual") => {
    const list = machines.slice();
    if (sortMode === "incidents") {
      return list.sort((a, b) => {
        const aOut = normalizeStatus(a?.status) === "fuera_de_servicio" ? 0 : 1;
        const bOut = normalizeStatus(b?.status) === "fuera_de_servicio" ? 0 : 1;
        if (aOut !== bOut) return aOut - bOut;
        const pendingDiff = getMachinePendingTaskCount(b) - getMachinePendingTaskCount(a);
        if (pendingDiff) return pendingDiff;
        return compareMachineTitle(a, b);
      });
    }
    if (sortMode === "name") {
      return list.sort(compareMachineTitle);
    }
    return list.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  };

  const withTimeout = (promise, ms = 6000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), ms);
      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });

  const getDefaultDashboardTitle = () => t("dashboard.navDashboard", "Dashboard");

  const getCachedDashboardTitle = () => {
    try {
      return normalizeDashboardTitle(localStorage.getItem(DASHBOARD_TITLE_CACHE_KEY) || "");
    } catch {
      return "";
    }
  };

  const getDashboardTitle = () =>
    normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle) ||
    getCachedDashboardTitle() ||
    getDefaultDashboardTitle();

  const cacheDashboardTitle = (title) => {
    try {
      const normalized = normalizeDashboardTitle(title);
      if (normalized) localStorage.setItem(DASHBOARD_TITLE_CACHE_KEY, normalized);
    } catch {}
  };

  const clearCachedDashboardTitle = () => {
    try {
      localStorage.removeItem(DASHBOARD_TITLE_CACHE_KEY);
    } catch {}
  };

  const applyDashboardTitle = () => {
    const titleEl = document.getElementById("topbar-title");
    if (!titleEl || titleEl.dataset.editing === "true") return;
    const title = getDashboardTitle();
    titleEl.textContent = title;
    cacheDashboardTitle(normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle));
  };

  const initDashboardTitleEditor = () => {
    const titleEl = document.getElementById("topbar-title");
    if (!titleEl || titleEl.dataset.dashboardTitleEditor === "true") return;
    titleEl.dataset.dashboardTitleEditor = "true";
    titleEl.classList.add("topbar-title-editable");
    titleEl.setAttribute("contenteditable", "plaintext-only");
    titleEl.setAttribute("spellcheck", "false");
    titleEl.setAttribute("role", "textbox");
    titleEl.setAttribute("aria-label", t("dashboard.titleEditAria", "Editar título del dashboard"));
    titleEl.setAttribute(
      "data-tooltip",
      t("dashboard.titleEditHint", "Editar título del dashboard")
    );
    attachDashboardTooltip(titleEl, { align: "left", placement: "bottom" });

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
      beforeEdit = getDashboardTitle();
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
        ...normalizeDashboardLayout(state.dashboardLayout),
        dashboardTitle: nextTitle
      };
      if (nextTitle) cacheDashboardTitle(nextTitle);
      else clearCachedDashboardTitle();
      applyDashboardTitle();
      if (nextTitle === previousTitle) return;
      updateSaveState(t("dashboard.saving", "Guardando..."));
      try {
        await upsertDashboardLayout(state.uid, { dashboardTitle: nextTitle });
        updateSaveState(t("dashboard.saved", "Guardado"));
      } catch {
        updateSaveState(t("dashboard.saveError", "Error al guardar"));
      }
    });
  };

  const normalizeLocation = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);

  const getCollapsedHeightPx = () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--mc-collapsed-height")
      .trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : DEFAULT_COLLAPSED_HEIGHT;
  };

  const computeLocations = (machines) => {
    const map = new Map();
    (machines || []).forEach((m) => {
      const raw = normalizeLocation(m.location);
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), "es")
    );
  };

  const adminNameCache = new Map();
  const adminNamePending = new Set();
  const getAdminDisplayName = (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return "";
    if (adminNameCache.has(normalized)) return adminNameCache.get(normalized) || "";
    if (adminNamePending.has(normalized)) return "";
    adminNamePending.add(normalized);
    getDisplayNameByEmail(normalized)
      .then((name) => {
        const safeName = (name || "").trim();
        adminNameCache.set(normalized, safeName);
        adminNamePending.delete(normalized);
        if (safeName) renderCards({ preserveScroll: true });
      })
      .catch(() => {
        adminNameCache.set(normalized, "");
        adminNamePending.delete(normalized);
      });
    return "";
  };

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const {
    sectionNav,
    dashboardLink,
    registryLink,
    registryBadge,
    suggestionsLink,
    suggestionsBadge,
    todoLink,
    todoBadge
  } = createDashboardSectionNav({
    ariaLabel: t("dashboard.sectionNavAria", "Secciones"),
    qrPrintHref,
    labels: {
      dashboard: t("dashboard.navDashboard", "Dashboard"),
      registry: t("dashboard.navRegistry", "Registro"),
      qrPrint: t("dashboard.navQrPrint", "Impresión QR"),
      suggestions: t("dashboard.navSuggestions", "Sugerencias"),
      todo: t("dashboard.navTodo", "To-do")
    },
    active: "dashboard",
    attachTooltip: attachDashboardTooltip
  });

  const {
    wrap: loadingEl,
    setProgress: setLoadingProgress,
    resetProgress: resetLoadingProgress
  } = createDashboardLoading();
  const loadingTextEl = loadingEl.querySelector(".dashboard-loading-text");
  const inlineStatusEl = document.createElement("div");
  inlineStatusEl.className = "dashboard-inline-status";
  inlineStatusEl.hidden = true;
  loadingEl.appendChild(inlineStatusEl);
  let inlineStatusTimer = null;
  const setDashboardInlineStatus = (message = "", stateName = "") => {
    if (inlineStatusTimer) {
      clearTimeout(inlineStatusTimer);
      inlineStatusTimer = null;
    }
    if (loadingTextEl) loadingTextEl.hidden = true;
    inlineStatusEl.hidden = false;
    inlineStatusEl.textContent = message;
    loadingEl.dataset.state = stateName || "";
    loadingEl.style.display = "";
    inlineStatusTimer = setTimeout(() => {
      inlineStatusTimer = null;
      loadingEl.removeAttribute("data-state");
      inlineStatusEl.hidden = true;
      inlineStatusEl.textContent = "";
      if (loadingTextEl) loadingTextEl.hidden = false;
      if (!state.loading) loadingEl.style.display = "none";
    }, 2200);
  };

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.innerHTML = "<span class=\"btn-add-icon\">+</span>";
  addBtn.setAttribute("aria-label", t("dashboard.addAria", "Añadir"));

  const searchInput = createMachineSearchBar({
    placeholder: t("dashboard.searchPlaceholder", "Buscar por nombre o ubicación..."),
    onQuery: (value) => {
      state.searchQuery = value || "";
      if (state.activeView === "registro") {
        state.registryVisibleCount = GLOBAL_REGISTRY_PAGE_SIZE;
      } else if (state.activeView === "sugerencias") {
        state.suggestionsVisibleCount = SUGGESTIONS_PAGE_SIZE;
      } else if (state.activeView === "todo") {
        state.todoVisibleCount = TODO_PAGE_SIZE;
      }
      renderCards({ preserveScroll: true });
    }
  });
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim()) {
      searchInput.classList.add("is-active-search");
    } else {
      searchInput.classList.remove("is-active-search");
    }
  });
  searchInput.addEventListener("change", () => {
    if (searchInput.value.trim()) {
      searchInput.classList.add("is-active-search");
    } else {
      searchInput.classList.remove("is-active-search");
    }
  });
  const syncSearchVisualState = () => {
    const query = (state.searchQuery || "").trim();
    if (document.activeElement !== searchInput) {
      searchInput.value = query;
      if (!query) searchInput.blur();
    }
    searchInput.classList.toggle("is-active-search", !!query);
  };

  const updateRegistryBadge = () => {
    const count = countUnseenGlobalRegistryEntries(
      state.draftMachines || [],
      state.dashboardLayout?.registrySeenAt || ""
    );
    registryBadge.hidden = count <= 0;
    registryBadge.textContent = count > 99 ? "99+" : String(count);
    registryLink.classList.toggle("has-unseen", count > 0);
  };

  const updateSuggestionsBadge = () => {
    const visible = state.canSuggest || state.isSuperadmin;
    suggestionsLink.hidden = !visible;
    const count = state.isSuperadmin
      ? countUnseenSuggestions(
          state.suggestions || [],
          state.dashboardLayout?.suggestionsSeenAt || ""
        )
      : 0;
    suggestionsBadge.hidden = count <= 0;
    suggestionsBadge.textContent = count > 99 ? "99+" : String(count);
    suggestionsLink.classList.toggle("has-unseen", count > 0);
  };

  const updateTodoNav = () => {
    const visible = state.canTodo || state.isSuperadmin;
    todoLink.hidden = !visible;
    todoLink.classList.toggle(
      "dashboard-section-link-superadmin",
      state.isSuperadmin
    );
    const count = visible
      ? (state.todos || []).filter((item) => item && item.completed !== true).length
      : 0;
    todoBadge.hidden = count <= 0;
    todoBadge.textContent = count > 99 ? "99+" : String(count);
    todoLink.classList.toggle("has-unseen", count > 0);
  };

  const markRegistrySeen = async () => {
    if (!state.uid) return;
    const seenAt = new Date().toISOString();
    state.dashboardLayout = {
      ...normalizeDashboardLayout(state.dashboardLayout),
      registrySeenAt: seenAt
    };
    updateRegistryBadge();
    try {
      await upsertDashboardLayout(state.uid, { registrySeenAt: seenAt });
    } catch {
      notifyTopbar(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const markSuggestionsSeen = async () => {
    if (!state.uid || !state.isSuperadmin) return;
    const seenAt = new Date().toISOString();
    state.dashboardLayout = {
      ...normalizeDashboardLayout(state.dashboardLayout),
      suggestionsSeenAt: seenAt
    };
    updateSuggestionsBadge();
    try {
      const response = await markDashboardSuggestionsSeen();
      if (response?.suggestionsSeenAt) {
        state.dashboardLayout = {
          ...normalizeDashboardLayout(state.dashboardLayout),
          suggestionsSeenAt: response.suggestionsSeenAt
        };
      }
    } catch {
      notifyTopbar(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const loadSuggestions = async ({ preserveScroll = true } = {}) => {
    if (!state.canSuggest && !state.isSuperadmin) return;
    try {
      const result = await fetchDashboardSuggestions(500);
      state.canSuggest = result.canSuggest;
      state.isSuperadmin = result.isSuperadmin;
      state.suggestions = result.items;
      state.suggestionsReady = true;
      if (result.suggestionsSeenAt) {
        state.dashboardLayout = {
          ...normalizeDashboardLayout(state.dashboardLayout),
          suggestionsSeenAt: result.suggestionsSeenAt
        };
      }
      updateSuggestionsBadge();
      if (state.activeView === "sugerencias") {
        renderCards({ preserveScroll });
      }
    } catch {
      state.suggestionsReady = true;
      updateSuggestionsBadge();
    }
  };

  const loadTodos = async ({ preserveScroll = true } = {}) => {
    if (!state.canTodo && !state.isSuperadmin) return;
    try {
      const result = await fetchDashboardTodos(500);
      state.canTodo = result.canTodo;
      state.isSuperadmin = result.isSuperadmin || state.isSuperadmin;
      state.todos = result.items;
      state.todosReady = true;
      updateTodoNav();
      if (state.activeView === "todo") {
        renderCards({ preserveScroll });
      }
    } catch {
      state.todosReady = true;
      updateTodoNav();
    }
  };
  const materializeCurrentFlatOrder = () => {
    const currentSort = state.dashboardLayout?.machineSortMode || "manual";
    if (state.dashboardLayout?.machineViewMode !== "flat" || currentSort === "manual") return;
    const orderedIds = sortFlatMachines(state.draftMachines, currentSort)
      .map((machine) => machine.id)
      .filter(Boolean);
    if (!orderedIds.length) return;
    const result = reorderFlatMachines(state.draftMachines, orderedIds);
    result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(result.machines);
  };
  const viewMenu = createDashboardViewMenu({
    currentMode: state.dashboardLayout.machineViewMode || "grouped",
    currentSort: state.dashboardLayout.machineSortMode || "manual",
    onChange: (mode) => {
      const nextGroups = mode === "grouped"
        ? (state.dashboardLayout.groups || []).map((group) => ({
            ...group,
            collapsed: true
          }))
        : state.dashboardLayout.groups;
      state.dashboardLayout = normalizeDashboardLayout({
        ...state.dashboardLayout,
        groups: nextGroups,
        machineViewMode: mode,
        machineSortMode: mode === "grouped"
          ? "manual"
          : state.dashboardLayout.machineSortMode
      });
      viewMenu.setMode(state.dashboardLayout.machineViewMode);
      viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
      upsertDashboardLayout(state.uid, {
        groups: state.dashboardLayout.groups,
        machineViewMode: state.dashboardLayout.machineViewMode,
        machineSortMode: state.dashboardLayout.machineSortMode
      })
        .catch(() => notifyTopbar(t("dashboard.saveError", "Error al guardar")));
      renderCards({ preserveScroll: true, preserveAnchor: false });
    },
    onSortChange: (mode) => {
      if (mode === "manual") {
        materializeCurrentFlatOrder();
      }
      state.dashboardLayout = normalizeDashboardLayout({
        ...state.dashboardLayout,
        machineSortMode: mode
      });
      viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
      upsertDashboardLayout(state.uid, { machineSortMode: state.dashboardLayout.machineSortMode })
        .catch(() => notifyTopbar(t("dashboard.saveError", "Error al guardar")));
      renderCards({ preserveScroll: true, preserveAnchor: false });
    }
  });


  addBar.appendChild(addBtn);
  addBar.appendChild(viewMenu.wrap);
  addBar.appendChild(searchInput);

  const filterInfo = document.createElement("div");
  filterInfo.className = "filter-info";
  filterInfo.style.display = "none";

  const mobileBackBtn = document.createElement("button");
  mobileBackBtn.type = "button";
  mobileBackBtn.className = "dashboard-mobile-back";
  mobileBackBtn.textContent = t("dashboard.mobileBack", "Volver");
  mobileBackBtn.hidden = true;

  const list = document.createElement("div");
  list.id = "machineList";

  const inviteBanner = document.createElement("div");
  inviteBanner.className = "admin-invite-banner";
  inviteBanner.style.display = "none";

  addBar.appendChild(loadingEl);
  mount.appendChild(sectionNav);
  mount.appendChild(addBar);
  mount.appendChild(mobileBackBtn);
  mount.appendChild(inviteBanner);
  mount.appendChild(filterInfo);
  mount.appendChild(list);

  const syncDashboardViewChrome = () => {
    applyDashboardTitle();
    const isRegistry = state.activeView === "registro";
    const isSuggestions = state.activeView === "sugerencias";
    const isTodo = state.activeView === "todo";
    dashboardLink.classList.toggle("is-active", !isRegistry && !isSuggestions && !isTodo);
    registryLink.classList.toggle("is-active", isRegistry);
    suggestionsLink.classList.toggle("is-active", isSuggestions);
    todoLink.classList.toggle("is-active", isTodo);
    if (isRegistry) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.setAttribute("aria-current", "page");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
    } else if (isSuggestions) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.setAttribute("aria-current", "page");
      todoLink.removeAttribute("aria-current");
    } else if (isTodo) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.setAttribute("aria-current", "page");
    } else {
      dashboardLink.setAttribute("aria-current", "page");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
    }
    addBar.classList.toggle("is-registry-view", isRegistry || isSuggestions || isTodo);
    searchInput.placeholder = isRegistry
      ? t("dashboard.registrySearchPlaceholder", "Buscar en registro...")
      : isSuggestions
        ? t("dashboard.suggestionsSearchPlaceholder", "Buscar sugerencias...")
        : isTodo
          ? t("dashboard.todoSearchPlaceholder", "Buscar pendientes...")
          : t("dashboard.searchPlaceholder", "Buscar por nombre o ubicación...");
    const primaryControlsDisabled = state.loading || isRegistry || isSuggestions || isTodo;
    const searchDisabled = state.loading;
    addBtn.disabled = primaryControlsDisabled;
    searchInput.disabled = searchDisabled;
    viewMenu.button.disabled = primaryControlsDisabled;
    addBtn.setAttribute("aria-disabled", primaryControlsDisabled ? "true" : "false");
    searchInput.setAttribute("aria-disabled", searchDisabled ? "true" : "false");
    viewMenu.button.setAttribute("aria-disabled", primaryControlsDisabled ? "true" : "false");
  };

  const updateSaveState = (message = "") => {
    setTopbarSaveStatus(message);
  };
  const notifyTopbar = (message = "") => {
    setTopbarSaveStatus(message);
  };

  const clearDashboardTimer = () => {
    if (state.loadingGuardTimer) {
      clearTimeout(state.loadingGuardTimer);
      state.loadingGuardTimer = null;
    }
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
      rebuildTimer = null;
    }
  };

  const cleanupDashboardSubscriptions = () => {
    dashboardSubscriptions?.cleanup();
    machineAccessSync?.cleanup();
  };

  const resetDashboardRuntime = (uid) => {
    clearDashboardTimer();
    cleanupDashboardSubscriptions();
    state.uid = uid;
    state.remoteMachines = [];
    state.ownerMachines = [];
    state.adminMachines = [];
    state.draftMachines = [];
    state.pendingInvites = [];
    state.pendingTransferInvites = [];
    state.suggestions = [];
    state.suggestionsReady = false;
    state.suggestionReplyTarget = null;
    state.todos = [];
    state.todosReady = false;
    state.expandedById = [];
    state.selectedTabById = {};
    state.configSubtabById = {};
    state.tagStatusById = {};
    clearMobileDetailState();
    resetDashboardLoadState(state);
    state.initialGroupPriorityOrder = {};
    state.initialGroupPriorityReady = false;
    locallyVisibleEmptyGroupIds.clear();
    cardRefs.clear();
    list.innerHTML = "";
    loadingEl.style.display = "";
    resetLoadingProgress();
    syncDashboardViewChrome();
  };

  const isMobileDashboardViewport = isMobileViewport;

  const resetInitialMobileScroll = () => {
    if (!isMobileDashboardViewport()) return;
    const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    scrollTop();
    requestAnimationFrame(() => {
      scrollTop();
      requestAnimationFrame(scrollTop);
    });
    window.setTimeout(scrollTop, 80);
    window.setTimeout(scrollTop, 240);
  };

  const clearMobileDetailState = () => {
    state.mobileFocusedMachineId = "";
    state.mobileDetailJustEntered = false;
  };

  const syncMobileDetailUI = () => {
    const focusedId = state.mobileFocusedMachineId || "";
    const enabled = isMobileDashboardViewport() && !!focusedId;
    mount.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileFocusedId = enabled ? focusedId : "";
    mobileBackBtn.hidden = !enabled;

    Array.from(list.querySelectorAll(".machine-card")).forEach((card) => {
      const isFocused = enabled && card.dataset.machineId === focusedId;
      card.classList.toggle("is-mobile-focus", isFocused);
      card.classList.toggle("is-mobile-detail-enter", isFocused && state.mobileDetailJustEntered);
    });
    Array.from(list.querySelectorAll(".machine-group")).forEach((group) => {
      const containsFocused = enabled && !!group.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      group.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    Array.from(list.querySelectorAll(".machine-card-wrap")).forEach((wrap) => {
      const containsFocused = enabled && !!wrap.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      wrap.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    state.mobileDetailJustEntered = false;
  };

  mobileBackBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    mobileBackBtn.blur();
    searchInput.blur();
    state.expandedById = [];
    clearMobileDetailState();
    Array.from(list.querySelectorAll(".machine-card")).forEach((card) =>
      collapseCard(card, { suppressAnimation: true })
    );
    syncMobileDetailUI();
  });

  if (window.matchMedia) {
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const handleMobileViewportChange = () => {
      if (!mobileMedia.matches) {
        clearMobileDetailState();
      } else if (!state.mobileFocusedMachineId && Array.isArray(state.expandedById) && state.expandedById[0]) {
        state.mobileFocusedMachineId = state.expandedById[0];
      }
      syncMobileDetailUI();
    };
    if (typeof mobileMedia.addEventListener === "function") {
      mobileMedia.addEventListener("change", handleMobileViewportChange);
    } else if (typeof mobileMedia.addListener === "function") {
      mobileMedia.addListener(handleMobileViewportChange);
    }
  }

  const updateLoading = () => {
    const progress = getDashboardLoadProgress(state);
    setLoadingProgress(progress.percent);
    if (progress.complete && state.loading) {
      state.loading = false;
      if (state.loadingGuardTimer) {
        clearTimeout(state.loadingGuardTimer);
        state.loadingGuardTimer = null;
      }
      syncDashboardViewChrome();
      setTimeout(() => {
        loadingEl.style.display = "none";
      }, 2000);
    }
  };

  if (window.__unatomoStylesReady) {
    window.__unatomoStylesReady.then(() => {
      state.stylesReady = true;
      updateLoading();
    }).catch(() => {});
  }

  const armLoadingGuard = () => {
    if (state.loadingGuardTimer) {
      clearTimeout(state.loadingGuardTimer);
      state.loadingGuardTimer = null;
    }
    state.loadingGuardTimer = setTimeout(() => {
      markDashboardLoadTimeout(state);
      updateLoading();
      renderCards({ preserveScroll: false });
    }, 8000);
  };

  addBtn.disabled = true;
  searchInput.disabled = true;
  viewMenu.button.disabled = true;
  syncDashboardViewChrome();

  const renderPlaceholder = () => {
    renderDashboardEmptyPlaceholder(
      list,
      t("dashboard.noMachines", "Todavía no hay máquinas. Pulsa 'Añadir' para crear la primera.")
    );
  };

  const renderLoadErrorPlaceholder = () => {
    renderDashboardLoadErrorPlaceholder(
      list,
      t(
        "dashboard.machinesLoadError",
        "No se pudieron cargar las máquinas. Recarga el dashboard."
      )
    );
  };

  function handleRenameGroup(group) {
    if (!group?.id) return;
    const currentTitle = group.title || t("dashboard.groupUntitled", "Grupo");
    const nextTitle = window.prompt(
      t("dashboard.groupRenamePrompt", "Nombre del grupo"),
      currentTitle
    );
    if (nextTitle === null) return;
    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || cleanTitle === currentTitle) return;
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = renameGroup(state.dashboardLayout, group.id, cleanTitle).layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  function handleDeleteGroup(group) {
    if (!group?.id) return;
    const title = group.title || t("dashboard.groupUntitled", "Grupo");
    const confirmed = window.confirm(
      t("dashboard.groupDeleteConfirm", (value) => `¿Eliminar el grupo "${value}"? Las máquinas no se eliminarán.`)(title)
    );
    if (!confirmed) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = deleteGroup(state.dashboardLayout, group.id).layout;
    locallyVisibleEmptyGroupIds.delete(group.id);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  function handleAddChildGroup(group) {
    if (!group?.id || group.parentGroupId) return;
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(t("dashboard.addGroupPrompt", "Nombre del grupo"), suggestedTitle);
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const newGroupId = createDashboardGroupId();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = createChildGroup(state.dashboardLayout, group.id, {
      id: newGroupId,
      title: cleanTitle
    }).layout;
    locallyVisibleEmptyGroupIds.add(newGroupId);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  const createGroupSection = (group, pendingTasksCount = 0, downMachinesCount = 0) => {
    const section = document.createElement("section");
    section.className = "machine-group";
    section.classList.toggle("machine-subgroup", !!group.parentGroupId);
    section.dataset.groupId = group.id || "";
    section.dataset.parentGroupId = group.parentGroupId || "";
    section.dataset.collapsed = group.collapsed ? "true" : "false";
    section.draggable = true;

    const header = document.createElement("div");
    header.setAttribute("role", "button");
    header.tabIndex = 0;
    header.className = "machine-group-header";
    header.draggable = true;
    const caret = document.createElement("span");
    caret.className = "machine-group-caret";
    caret.textContent = group.collapsed ? "+" : "−";
    const title = document.createElement("span");
    title.className = "machine-group-title machine-group-menu-hover-zone";
    title.textContent = group.title || t("dashboard.groupUntitled", "Grupo");
    const pendingCount = document.createElement("span");
    pendingCount.className = "machine-group-count machine-group-pending-count";
    pendingCount.textContent = String(pendingTasksCount);
    pendingCount.title = t("dashboard.groupPendingCountTooltip", "Tareas pendientes en este grupo");
    pendingCount.hidden = pendingTasksCount <= 0;
    const downCount = document.createElement("span");
    downCount.className = "machine-group-count machine-group-down-count";
    downCount.textContent = String(downMachinesCount);
    downCount.title = t("dashboard.groupDownCountTooltip", "Máquinas fuera de servicio en este grupo");
    downCount.hidden = downMachinesCount <= 0;
    const menu = document.createElement("div");
    menu.className = "machine-group-menu machine-group-menu-hover-zone";
    const menuToggle = document.createElement("button");
    menuToggle.type = "button";
    menuToggle.className = "machine-group-menu-toggle";
    menuToggle.setAttribute("aria-label", t("dashboard.groupMenu", "Opciones de grupo"));
    menuToggle.setAttribute("aria-haspopup", "menu");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "•••";
    const menuPanel = document.createElement("div");
    menuPanel.className = "machine-group-menu-panel";
    menuPanel.setAttribute("role", "menu");
    menuPanel.hidden = true;
    const closeMenu = () => {
      menuPanel.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    };
    const addMenuAction = (label, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "machine-group-menu-action";
      btn.setAttribute("role", "menuitem");
      btn.textContent = label;
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        onClick();
      });
      menuPanel.appendChild(btn);
    };
    if (!group.parentGroupId) {
      addMenuAction(t("dashboard.groupAddChild", "Añadir grupo"), () => handleAddChildGroup(group));
    }
    addMenuAction(t("dashboard.groupRename", "Renombrar"), () => handleRenameGroup(group));
    addMenuAction(t("dashboard.groupDelete", "Eliminar"), () => handleDeleteGroup(group));
    menuToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = menuPanel.hidden;
      menuPanel.hidden = !nextOpen;
      menuToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("mouseleave", closeMenu);
    const spacer = document.createElement("span");
    spacer.className = "machine-group-header-spacer";
    menu.appendChild(menuToggle);
    menu.appendChild(menuPanel);
    header.appendChild(caret);
    header.appendChild(title);
    header.appendChild(menu);
    header.appendChild(spacer);
    header.appendChild(downCount);
    header.appendChild(pendingCount);
    header.addEventListener("click", (event) => {
      if (event.target.closest(".machine-group-menu")) return;
      event.preventDefault();
      try {
        header.blur({ preventScroll: true });
      } catch {
        header.blur();
      }
      state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
      const target = state.dashboardLayout.groups.find((entry) => entry.id === group.id);
      if (!target) return;
      target.collapsed = !target.collapsed;
      if (target.collapsed && !target.parentGroupId) {
        state.dashboardLayout.groups.forEach((entry) => {
          if (entry.parentGroupId === target.id) entry.collapsed = true;
        });
      }
      saveDashboardLayout();
      renderCards();
    });
    header.addEventListener("keydown", (event) => {
      if (event.target.closest(".machine-group-menu")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      header.click();
    });

    const body = document.createElement("div");
    body.className = "machine-group-body";
    if (group.collapsed) body.hidden = true;
    section.appendChild(header);
    section.appendChild(body);
    return { section, body };
  };

  const recalcHeight = (card) => {
    const header = card.querySelector(".mc-header");
    const expand = card.querySelector(".mc-expand");
    const headerH = header.offsetHeight;
    const contentH = expand.scrollHeight;
    const minH = getCollapsedHeightPx() * EXPAND_FACTOR;
    const target = Math.max(minH, headerH + contentH);
    card.style.maxHeight = `${target}px`;
  };

  const collapseCard = (card, options = {}) => {
    card.dataset.expanded = "false";
    card.style.maxHeight = `${getCollapsedHeightPx()}px`;
    if (options.suppressAnimation) {
      card.classList.add("mc-no-anim");
      requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
    }
  };

  const expandCard = (card, options = {}) => {
    card.dataset.expanded = "true";
    recalcHeight(card);
    if (options.suppressAnimation) {
      card.classList.add("mc-no-anim");
      requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
    }
  };

  const setRemote = (remote) => {
    state.remoteMachines = cloneMachines(remote);
    state.draftMachines = cloneMachines(remote);
    state.tagStatusById = {};
  };

  const mergeOperationalFromTag = async (machines) => {
    const merged = await Promise.all(
      machines.map(async (machine) => {
        if (!machine.tagId) return { ...machine, _operationalSource: "local" };
        try {
          const access = await fetchMachineAccess(machine.tagId);
          if (!access) return { ...machine, _operationalSource: "local" };
          return {
            ...machine,
            status: access.status ?? machine.status,
            tasks: access.tasks ?? machine.tasks,
            logs: access.logs ?? machine.logs,
            _operationalSource: "tag"
          };
        } catch {
          return { ...machine, _operationalSource: "local" };
        }
      })
    );
    return merged;
  };

  const applyOperationalPatch = (machineId, operational) => {
    const current = getDraftById(machineId);
    if (!current) return;
    current.status = normalizeStatus(operational.status ?? current.status);
    current.tasks = operational.tasks ?? current.tasks;
    current.logs = operational.logs ?? current.logs;
    current._operationalSource = "tag";

    const ref = cardRefs.get(machineId);
    const card = (ref && ref.card) || list.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
    if (!card) return;
    const hooks = ref && ref.hooks ? ref.hooks : null;
    const statusBtn = card.querySelector(".mc-status");
    if (statusBtn) {
      const status = normalizeStatus(current.status);
      const label = statusLabels[status] || status;
      statusBtn.textContent = "";
      statusBtn.innerHTML = `<span class="mc-status-text">${label}</span>`;
      statusBtn.dataset.status = status;
    }

    const activeTab = state.selectedTabById?.[machineId] || card.querySelector(".mc-panel")?.dataset?.panel;
    if (hooks && hooks.setActiveTab && (activeTab === "quehaceres" || activeTab === "historial")) {
      hooks.setActiveTab(activeTab, { notify: false });
      if (card.dataset.expanded === "true") {
        scheduleHeightSync(machineId, () => recalcHeight(card));
      }
    }
  };

  const syncMachineAccessListeners = (machines) => {
    if (!machineAccessSync) {
      machineAccessSync = createMachineAccessSync({ applyOperationalPatch });
    }
    machineAccessSync.sync(machines);
  };

  const getDraftIndex = (id) => state.draftMachines.findIndex((m) => m.id === id);
  const getDraftById = (id) => state.draftMachines.find((m) => m.id === id);
  const getKnownMachineIds = () =>
    Array.from(
      new Set([
        ...(state.draftMachines || []),
        ...(state.ownerMachines || []),
        ...(state.adminMachines || [])
      ].map((machine) => machine?.id).filter(Boolean))
    );

  const normalizeDashboardLayout = (layout = {}, options = {}) =>
    normalizeDashboardLayoutBase(layout, {
      groupUntitled: t("dashboard.groupUntitled", "Grupo"),
      validMachineIds: options.pruneMissingMachines ? getKnownMachineIds() : null
    });

  const saveDashboardLayout = async () => {
    if (!state.uid) return;
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout, {
      pruneMissingMachines: true
    });
    try {
      await upsertDashboardLayout(state.uid, state.dashboardLayout);
    } catch {
      notifyTopbar(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const getNextGroupTitle = () => {
    const base = t("dashboard.groupUntitled", "Grupo");
    return getNextDashboardGroupTitle(state.dashboardLayout, base);
  };

  const getPendingTaskCount = (machine) => {
    const tasks = Array.isArray(machine?.tasks) ? machine.tasks : [];
    return tasks.filter((task) => getTaskTiming(task).pending).length;
  };

  const compareMachineDefaultPriority = (a, b) => {
    const aDown = normalizeStatus(a.status) === "fuera_de_servicio" ? 0 : 1;
    const bDown = normalizeStatus(b.status) === "fuera_de_servicio" ? 0 : 1;
    if (aDown !== bDown) return aDown - bDown;
    const aPending = getPendingTaskCount(a);
    const bPending = getPendingTaskCount(b);
    if (aPending !== bPending) return bPending - aPending;
    return 0;
  };

  const buildInitialGroupPriorityOrder = (machines) => {
    const layout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = layout.groups || [];
    const placements = layout.placements || {};
    const validGroupIds = new Set(groups.map((group) => group.id));
    const grouped = new Map();
    (machines || []).forEach((machine) => {
      const groupId = placements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) return;
      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(machine);
    });
    const orderByGroup = {};
    grouped.forEach((groupMachines, groupId) => {
      orderByGroup[groupId] = {};
      groupMachines
        .slice()
        .sort((a, b) => {
          const priority = compareMachineDefaultPriority(a, b);
          if (priority !== 0) return priority;
          const aPlacement = placements[a.id] || {};
          const bPlacement = placements[b.id] || {};
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        })
        .forEach((machine, index) => {
          orderByGroup[groupId][machine.id] = index;
        });
    });
    state.initialGroupPriorityOrder = orderByGroup;
    state.initialGroupPriorityReady = true;
  };

  const clearInitialGroupPriorityOrder = (groupId = "") => {
    if (!state.initialGroupPriorityOrder) return;
    if (groupId) {
      delete state.initialGroupPriorityOrder[groupId];
      return;
    }
    state.initialGroupPriorityOrder = {};
  };

  const localWriteAt = new Map();
  const markLocalWrite = (machineId) => {
    if (!machineId) return;
    localWriteAt.set(machineId, Date.now());
  };
  const isRecentLocalWrite = (machineId, windowMs = 1500) => {
    if (!machineId) return false;
    const ts = localWriteAt.get(machineId);
    return typeof ts === "number" && Date.now() - ts < windowMs;
  };

  const rebuildCombined = async ({ preserveScroll = true } = {}) => {
    const token = ++rebuildToken;
    const combined = [...(state.ownerMachines || []), ...(state.adminMachines || [])];
    const orderCache = loadOrderCache();
    const withOrder = combined.map((m) =>
      Object.prototype.hasOwnProperty.call(orderCache, m.id)
        ? { ...m, order: orderCache[m.id] }
        : m
    );
    const merged = await mergeOperationalFromTag(withOrder);
    if (token !== rebuildToken) return;
    if (!state.initialGroupPriorityReady) {
      buildInitialGroupPriorityOrder(merged);
    }
    setRemote(merged);
    renderCards({ preserveScroll });
  };

  const scheduleRebuild = (options = {}) => {
    pendingRebuildOptions = options;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      rebuildCombined(pendingRebuildOptions);
    }, 160);
  };

  const getDashboardSubscriptions = () => {
    if (!dashboardSubscriptions) {
      dashboardSubscriptions = createDashboardSubscriptions({
        state,
        updateLoading,
        scheduleRebuild,
        renderCards,
        renderInviteBanner,
        renderTopbarNotifications,
        isRecentLocalWrite
      });
    }
    return dashboardSubscriptions;
  };

  const updateMachine = (id, patch) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = { ...state.draftMachines[idx], ...patch };
  };

  const replaceMachine = (id, next) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = next;
  };

  const removeMachineFromState = (id) => {
    state.draftMachines = state.draftMachines.filter((m) => m.id !== id);
  };

  const computeNextOrder = () => {
    const maxOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order > acc ? m.order : acc),
      -1
    );
    return maxOrder + 1;
  };

  const computePrevOrder = () => {
    const minOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order < acc ? m.order : acc),
      0
    );
    return state.draftMachines.length ? minOrder - 1 : 0;
  };

  const updateTagStatusUI = (id) => {
    const status = state.tagStatusById[id];
    const card = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
    if (!card) return;
    const statusEl = card.querySelector('.mc-panel[data-panel="configuracion"] .mc-tag-status');
    if (!statusEl) return;
    statusEl.textContent = status.text || "";
    statusEl.dataset.state = status.state || "";
    if (card.dataset.expanded === "true") {
      requestAnimationFrame(() => recalcHeight(card));
    }
  };

  const getMachineTenantId = (machine) => machine.tenantId || state.uid;
  const isOwnerMachine = (machine) => (machine.role || "owner") === "owner";

  const getStorageFullText = () =>
    t(
      "dashboard.storageFullNotification",
      "Almacenamiento lleno. Libera espacio para subir documentos o generar nuevos Tag ID/QR."
    );

  const renderTopbarNotifications = () => {
    const items = [];
    if (state.storageFull) {
      items.push({
        id: "storage-full",
        persistent: true,
        text: getStorageFullText()
      });
    }
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );
    invites.forEach((invite) => {
      items.push({
        text: formatInviteText(invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario"), 1),
        actions: [
          { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleInviteDecision(invite, "accepted") },
          { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleInviteDecision(invite, "rejected") }
        ]
      });
    });
    const transferInvites = Array.isArray(state.pendingTransferInvites) ? state.pendingTransferInvites : [];
    transferInvites.forEach((invite) => {
      const ownerLabel = invite.fromOwnerEmail || t("dashboard.anonymousUser", "Un usuario");
      const machineTitle = invite.machineTitle || t("machine.machine", "Equipo");
      items.push({
        text: t(
          "dashboard.transferReceive",
          (owner, machine) => `${owner} quiere transferirte ${machine}`
        )(ownerLabel, machineTitle),
        actions: [
          { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleTransferDecision(invite, "accepted") },
          { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleTransferDecision(invite, "rejected") }
        ]
      });
    });
    setTopbarNotifications(items);
  };

  const refreshStorageFullState = async (uid = state.uid) => {
    if (!uid) return false;
    try {
      const usage = await calculateStorageUsage(uid);
      state.storageFull = usage.totalBytes >= usage.limitBytes;
      renderTopbarNotifications();
      return state.storageFull;
    } catch {
      return state.storageFull;
    }
  };

  const assertStorageAvailable = async (uid = state.uid, additionalBytes = 0) => {
    if (!uid) throw new Error("no-auth");
    const usage = await calculateStorageUsage(uid);
    const full = usage.totalBytes + Math.max(0, Number(additionalBytes) || 0) >= STORAGE_LIMIT_BYTES;
    state.storageFull = usage.totalBytes >= usage.limitBytes;
    if (full) {
      state.storageFull = true;
      renderTopbarNotifications();
      notifyTopbar(t("dashboard.storageFullAction", "Almacenamiento lleno"));
      throw new Error("storage-full");
    }
    renderTopbarNotifications();
    return usage;
  };

  const renderInviteBanner = () => {
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    if (!invites.length) {
      inviteBanner.innerHTML = "";
      inviteBanner.style.display = "none";
      renderTopbarNotifications();
      return;
    }
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );

    inviteBanner.innerHTML = "";
    inviteBanner.style.display = "flex";
    const grouped = new Map();
    invites.forEach((invite) => {
      const ownerLabel = invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario");
      const key = `${invite.ownerUid || ""}|${ownerLabel}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ownerLabel, invites: [] });
      }
      grouped.get(key).invites.push(invite);
    });
    grouped.forEach(({ ownerLabel, invites: groupInvites }) => {
      const row = document.createElement("div");
      row.className = "invite-row";
      const text = document.createElement("div");
      text.className = "invite-text";
      text.textContent = formatInviteText(ownerLabel, groupInvites.length);
      const actions = document.createElement("div");
      actions.className = "invite-actions";
      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "mc-location-accept";
      acceptBtn.textContent = t("card.accept", "Aceptar");
      acceptBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "accepted");
        }
      });
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "mc-location-cancel";
      rejectBtn.textContent = t("dashboard.reject", "Rechazar");
      rejectBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "rejected");
        }
      });
      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      row.appendChild(text);
      row.appendChild(actions);
      inviteBanner.appendChild(row);
    });
    renderTopbarNotifications();
  };

  const handleInviteDecision = async (invite, decision) => {
    if (!invite || !invite.ownerUid || !invite.machineId) return;
    try {
      await respondAdminInvite(invite.id, decision);
    } catch {
      notifyTopbar(
        `Permisos: ownerUid=${invite.ownerUid} admin=${normalizeEmail(state.adminEmail || "")}`
      );
      throw new Error("admin-link-update-denied");
    }

    if (decision === "accepted") {
      const ownerMachine = await fetchMachine(null, invite.machineId);
      if (ownerMachine) {
        const user = state.adminLabel || state.adminEmail || t("dashboard.admin", "Administrador");
        const logs = [
          ...(ownerMachine.logs || []),
          {
            ts: new Date().toISOString(),
            type: "admin_accept",
            admin: state.adminEmail || "",
            user
          }
        ];
        try {
          await upsertMachine(invite.ownerUid, {
            ...ownerMachine,
            adminName: state.adminLabel || "",
            logs,
            tenantId: invite.ownerUid
          });
        } catch {
          // ignore log failures
        }
        const normalized = normalizeMachine(ownerMachine, state.draftMachines.length);
        normalized.tenantId = invite.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = invite.ownerEmail || "";
        state.draftMachines = [normalized, ...state.draftMachines];
        renderCards({ preserveScroll: true });
      }
    }

    state.pendingInvites = state.pendingInvites.filter((i) => i.id !== invite.id);
    renderInviteBanner();
  };

  const handleTransferDecision = async (invite, decision) => {
    if (!invite || !invite.id) return;
    try {
      await respondMachineTransferInvite(invite.id, decision);
      notifyTopbar(
        decision === "accepted"
          ? t("dashboard.transferAccepted", "Transferencia aceptada")
          : t("dashboard.transferRejected", "Transferencia rechazada")
      );
    } catch {
      notifyTopbar(t("dashboard.transferError", "No se pudo procesar la transferencia"));
      return;
    }
    state.pendingTransferInvites = state.pendingTransferInvites.filter((i) => i.id !== invite.id);
    renderTopbarNotifications();
  };

  const autoSave = initAutoSave({
    notify: updateSaveState,
    saveFn: async (machineId, reason) => {
      if (!state.uid) throw new Error("no-auth");
      const machine = getDraftById(machineId);
      if (!machine) return;
      const tenantId = machine.tenantId || state.uid;
      const skipTagSync = typeof reason === "string" && reason.startsWith("admin");
      if (machine.tagId && !skipTagSync) {
        const res = await validateTag(machine.tagId);
        if (!res.exists) {
          state.tagStatusById[machine.id] = { text: t("config.tagNotFound", "El Tag ID introducido no existe"), state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-missing");
        }
        if (res.machineId && res.machineId !== machine.id) {
          state.tagStatusById[machine.id] = { text: t("config.tagAlreadyAssigned", "Tag ya está asignado"), state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-assigned");
        }
      }
      await upsertMachine(tenantId, machine);
      machine.isNew = false;
      if (machine.tagId && !skipTagSync) {
        try {
          await assignTag(machine.tagId, tenantId, machine.id);
          await upsertMachineAccessFromMachine(tenantId, machine, state.uid);
          state.tagStatusById[machine.id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
        } catch {
          state.tagStatusById[machine.id] = {
            text: t("dashboard.savedTagPending", "Guardado. Tag pendiente de sincronizar"),
            state: "error"
          };
        }
      }
      updateTagStatusUI(machine.id);
    },
    onSaveStart: (machineId) => markLocalWrite(machineId)
  });

  const heightRAF = new Map();
  const scheduleHeightSync = (id, fn) => {
    if (heightRAF.has(id)) cancelAnimationFrame(heightRAF.get(id));
    heightRAF.set(id, requestAnimationFrame(fn));
  };

  const captureViewportAnchor = () => {
    const cards = Array.from(list.querySelectorAll(".machine-card"));
    if (!cards.length) return null;
    const expanded = state.expandedById?.[0]
      ? list.querySelector(`.machine-card[data-machine-id="${state.expandedById[0]}"]`)
      : null;
    const candidates = expanded ? [expanded, ...cards.filter((card) => card !== expanded)] : cards;
    const viewportTop = 96;
    const target =
      candidates.find((card) => card.getBoundingClientRect().bottom > viewportTop) ||
      candidates[0];
    if (!target) return null;
    return {
      id: target.dataset.machineId || "",
      top: target.getBoundingClientRect().top
    };
  };

  const restoreViewport = (scrollY, anchor) => {
    requestAnimationFrame(() => {
      if (anchor?.id) {
        const anchoredCard = list.querySelector(`.machine-card[data-machine-id="${anchor.id}"]`);
        if (anchoredCard) {
          const nextTop = anchoredCard.getBoundingClientRect().top;
          window.scrollBy(0, nextTop - anchor.top);
          syncSearchVisualState();
          return;
        }
      }
      window.scrollTo(0, scrollY || 0);
      syncSearchVisualState();
    });
  };

  const renderCards = ({ preserveScroll = false, preserveAnchor = true } = {}) => {
    state.activeView = getDashboardInternalView();
    syncDashboardViewChrome();
    const capturedAnchor = preserveScroll && preserveAnchor ? captureViewportAnchor() : null;
    const prevScrollY = preserveScroll
      ? (typeof state.nextScrollRestoreY === "number" ? state.nextScrollRestoreY : window.scrollY)
      : null;
    const renderAnchor = preserveAnchor ? state.nextScrollAnchor || capturedAnchor : null;
    state.nextScrollRestoreY = null;
    const activeEl = document.activeElement;
    if (activeEl && list.contains(activeEl) && typeof activeEl.blur === "function") {
      try {
        activeEl.blur({ preventScroll: true });
      } catch {
        activeEl.blur();
      }
    }
    clearDashboardTooltips();
    list.innerHTML = "";
    const machines = Array.isArray(state.draftMachines) ? state.draftMachines : [];
    updateRegistryBadge();
    updateSuggestionsBadge();
    updateTodoNav();
    if (state.activeView === "sugerencias" && !state.canSuggest && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return;
    }
    if (state.activeView === "todo" && !state.canTodo && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return;
    }
    if (state.activeView === "registro") {
      clearMobileDetailState();
      syncMobileDetailUI();
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
      cardRefs.clear();
      renderRegistryDashboardView(list, machines, {
        query: state.searchQuery,
        seenAt: state.dashboardLayout?.registrySeenAt || "",
        visibleCount: state.registryVisibleCount,
        onLoadMore: () => {
          state.registryVisibleCount += GLOBAL_REGISTRY_PAGE_SIZE;
          renderCards({ preserveScroll: true });
        }
      });
      syncMachineAccessListeners(state.draftMachines);
      if (state.loading && state.ownerReady && state.adminReady) {
        updateLoading();
      }
      return;
    }
    if (state.activeView === "sugerencias") {
      clearMobileDetailState();
      syncMobileDetailUI();
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
      cardRefs.clear();
      renderSuggestionsDashboardView(list, {
        items: state.suggestions,
        ready: state.suggestionsReady,
        canSuggest: state.canSuggest || state.isSuperadmin,
        isSuperadmin: state.isSuperadmin,
        seenAt: state.dashboardLayout?.suggestionsSeenAt || "",
        query: state.searchQuery,
        replyTarget: state.suggestionReplyTarget,
        visibleCount: state.suggestionsVisibleCount,
        onLoadMore: () => {
          state.suggestionsVisibleCount += SUGGESTIONS_PAGE_SIZE;
          renderCards({ preserveScroll: true });
        },
        onReply: (target) => {
          state.suggestionReplyTarget = target || null;
          renderCards({ preserveScroll: true });
        },
        onCancelReply: () => {
          state.suggestionReplyTarget = null;
          renderCards({ preserveScroll: true });
        },
        onResolve: async (suggestionId, resolved) => {
          try {
            await updateDashboardSuggestionResolved(suggestionId, resolved);
            await loadSuggestions({ preserveScroll: true });
          } catch {
            notifyTopbar(t("dashboard.saveError", "Error al guardar"));
          }
        },
        onDelete: async (suggestionId) => {
          try {
            await deleteDashboardSuggestion(suggestionId);
            await loadSuggestions({ preserveScroll: true });
          } catch {
            notifyTopbar(t("dashboard.saveError", "Error al guardar"));
          }
        },
        onSubmit: async (rawText, controls = {}) => {
          const prefix = controls.input?.dataset?.replyPrefix || "";
          let textValue = (rawText || "").toString();
          if (prefix && textValue.startsWith(prefix)) {
            textValue = textValue.slice(prefix.length);
          }
          textValue = textValue.trim();
          const replyToSuggestionId = controls.replyToSuggestionId || "";
          const expectedReplyId = state.suggestionReplyTarget?.suggestionId || "";
          const status = controls.status;
          if (!textValue) return;
          if (expectedReplyId && !replyToSuggestionId) {
            if (status) {
              status.hidden = false;
              status.textContent = t(
                "dashboard.suggestionsError",
                "No se pudo enviar la sugerencia"
              );
              status.dataset.state = "error";
            }
            return;
          }
          if (controls.input) controls.input.disabled = true;
          if (controls.submit) controls.submit.disabled = true;
          if (status) {
            status.hidden = false;
            status.textContent = t("dashboard.suggestionsSending", "Enviando...");
            status.removeAttribute("data-state");
          }
          try {
            await createDashboardSuggestion(
              textValue.slice(0, MAX_SUGGESTION_LENGTH),
              { replyToSuggestionId }
            );
            state.suggestionReplyTarget = null;
            if (controls.input) controls.input.value = "";
            if (status) {
              status.textContent = t("dashboard.suggestionsSent", "Sugerencia enviada");
            }
            await loadSuggestions({ preserveScroll: true });
          } catch {
            if (status) {
              status.textContent = t(
                "dashboard.suggestionsError",
                "No se pudo enviar la sugerencia"
              );
              status.dataset.state = "error";
            }
          } finally {
            if (controls.input) controls.input.disabled = false;
            if (controls.submit) controls.submit.disabled = false;
          }
        }
      });
      syncMachineAccessListeners(state.draftMachines);
      if (state.loading && state.ownerReady && state.adminReady) {
        updateLoading();
      }
      return;
    }
    if (state.activeView === "todo") {
      clearMobileDetailState();
      syncMobileDetailUI();
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
      cardRefs.clear();
      renderTodoDashboardView(list, {
        items: state.todos,
        ready: state.todosReady,
        canTodo: state.canTodo || state.isSuperadmin,
        query: state.searchQuery,
        visibleCount: state.todoVisibleCount,
        onLoadMore: () => {
          state.todoVisibleCount += TODO_PAGE_SIZE;
          renderCards({ preserveScroll: true });
        },
        onToggle: async (todoId, completed) => {
          try {
            await updateDashboardTodo(todoId, completed);
            await loadTodos({ preserveScroll: true });
          } catch {
            notifyTopbar(t("dashboard.saveError", "Error al guardar"));
          }
        },
        onDelete: async (todoId, button) => {
          if (button) button.disabled = true;
          setDashboardInlineStatus(t("dashboard.todoDeleting", "Eliminando..."));
          try {
            await deleteDashboardTodo(todoId);
            state.todos = (state.todos || []).filter((item) => item.id !== todoId);
            setDashboardInlineStatus(
              t("dashboard.todoDeleted", "Pendiente eliminado"),
              "ok"
            );
            renderCards({ preserveScroll: true });
            await loadTodos({ preserveScroll: true });
          } catch {
            if (button) button.disabled = false;
            setDashboardInlineStatus(
              t("dashboard.todoDeleteError", "No se pudo eliminar"),
              "error"
            );
          }
        },
        onSubmit: async (rawText, controls = {}) => {
          const textValue = (rawText || "").toString().trim();
          if (!textValue) return;
          if (controls.input) controls.input.disabled = true;
          if (controls.submit) controls.submit.disabled = true;
          setDashboardInlineStatus(t("dashboard.todoSaving", "Guardando..."));
          try {
            await createDashboardTodo(textValue.slice(0, MAX_TODO_LENGTH));
            if (controls.input) controls.input.value = "";
            setDashboardInlineStatus(t("dashboard.todoSaved", "Pendiente añadido"), "ok");
            await loadTodos({ preserveScroll: true });
          } catch (error) {
            const reason = `${error?.code || ""} ${error?.message || ""}`;
            const message = reason.includes("todo-mention-not-found")
              ? t(
                  "dashboard.todoMentionNotFound",
                  "No existe un usuario To Do con esa mención"
                )
              : reason.includes("todo-mention-ambiguous")
                ? t(
                    "dashboard.todoMentionAmbiguous",
                    "Esa mención corresponde a más de una cuenta"
                  )
                : reason.includes("todo-recipient-disabled")
                  ? t(
                      "dashboard.todoRecipientDisabled",
                      "Ese usuario no es colaborador"
                    )
                  : t("dashboard.todoError", "No se pudo guardar");
            setDashboardInlineStatus(message, "error");
          } finally {
            if (controls.input) controls.input.disabled = false;
            if (controls.submit) controls.submit.disabled = false;
          }
        }
      });
      syncMachineAccessListeners(state.draftMachines);
      if (state.loading && state.ownerReady && state.adminReady) {
        updateLoading();
      }
      return;
    }
    list.className = "";
    const query = (state.searchQuery || "").trim();
    let visibleMachines = filterMachines(machines, query);
    state.knownUsers = Array.from(
      new Set(
        machines
          .flatMap((m) => (Array.isArray(m.users) ? m.users : []))
          .map((u) => (u.username || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
    if (query) {
      filterInfo.textContent = t(
        "dashboard.showingResults",
        (visible, total) => `Showing ${visible}/${total} machines`
      )(visibleMachines.length, machines.length);
      filterInfo.style.display = "block";
    } else {
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
    }
    if (!machines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      if (state.loading) {
        list.innerHTML = "";
        return;
      }
      if (hasDashboardLoadError(state)) {
        renderLoadErrorPlaceholder();
        if (preserveScroll) {
          restoreViewport(prevScrollY || 0, renderAnchor);
        }
        return;
      }
      renderPlaceholder();
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }
    if (!visibleMachines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      renderDashboardNoResultsPlaceholder(
        list,
        t("dashboard.noResults", (value) => `No results for "${value}".`)(query)
      );
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }

    const expandedById = new Set(state.expandedById || []);
    if (expandedById.size > 1) {
      const [first] = expandedById;
      expandedById.clear();
      expandedById.add(first);
      state.expandedById = [first];
    }

    const selectedTabById = state.selectedTabById || {};

    cardRefs.clear();
    state.locations = computeLocations(state.draftMachines);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    viewMenu.setMode(state.dashboardLayout.machineViewMode);
    viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
    if (state.dashboardLayout.machineViewMode === "flat") {
      visibleMachines = sortFlatMachines(
        visibleMachines,
        state.dashboardLayout.machineSortMode
      );
    }
    const layoutGroups = state.dashboardLayout.groups || [];
    const layoutPlacements = state.dashboardLayout.placements || {};
    const useGroupedLayout =
      state.dashboardLayout.machineViewMode !== "flat" &&
      layoutGroups.length > 0 &&
      !query;
    const validGroupIds = new Set(layoutGroups.map((group) => group.id));
    const hasUngroupedMachines = useGroupedLayout && visibleMachines.some((machine) => {
      const groupId = layoutPlacements[machine.id]?.groupId || "";
      return !validGroupIds.has(groupId);
    });
    list.dataset.hasUngrouped = hasUngroupedMachines ? "true" : "false";
    const groupById = new Map(layoutGroups.map((group) => [group.id, group]));
    const getTopGroupId = (groupId) => {
      const group = groupById.get(groupId);
      return group?.parentGroupId || groupId || "";
    };
    const groupAnchorOrder = new Map();
    layoutGroups.forEach((group) => {
      if (group.parentGroupId) return;
      groupAnchorOrder.set(group.id, typeof group.order === "number" ? group.order : 0);
    });
    visibleMachines.forEach((machine) => {
      const groupId = layoutPlacements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) return;
      const topGroupId = getTopGroupId(groupId);
      const current = groupAnchorOrder.get(topGroupId);
      const next = machine.order ?? 0;
      if (typeof current !== "number") groupAnchorOrder.set(topGroupId, next);
    });
    const sortedVisibleMachines = useGroupedLayout
      ? visibleMachines.slice().sort((a, b) => {
        const aPlacement = layoutPlacements[a.id] || {};
        const bPlacement = layoutPlacements[b.id] || {};
        const aGroupId = validGroupIds.has(aPlacement.groupId) ? aPlacement.groupId : "";
        const bGroupId = validGroupIds.has(bPlacement.groupId) ? bPlacement.groupId : "";
        const aTopGroupId = getTopGroupId(aGroupId);
        const bTopGroupId = getTopGroupId(bGroupId);
        if (!!aTopGroupId !== !!bTopGroupId) return aTopGroupId ? -1 : 1;
        const aAnchor = aTopGroupId ? groupAnchorOrder.get(aTopGroupId) ?? a.order ?? 0 : a.order ?? 0;
        const bAnchor = bTopGroupId ? groupAnchorOrder.get(bTopGroupId) ?? b.order ?? 0 : b.order ?? 0;
        if (aAnchor !== bAnchor) return aAnchor - bAnchor;
        if (aGroupId && aGroupId === bGroupId) {
          const priorityOrder = state.initialGroupPriorityOrder?.[aGroupId] || {};
          const aPriorityOrder = priorityOrder[a.id];
          const bPriorityOrder = priorityOrder[b.id];
          const aOrder = Number.isFinite(aPriorityOrder)
            ? aPriorityOrder
            : aPlacement.order ?? a.order ?? 0;
          const bOrder = Number.isFinite(bPriorityOrder)
            ? bPriorityOrder
            : bPlacement.order ?? b.order ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        }
        if (aTopGroupId && aTopGroupId === bTopGroupId) {
          const aGroup = groupById.get(aGroupId);
          const bGroup = groupById.get(bGroupId);
          if (!!aGroup?.parentGroupId !== !!bGroup?.parentGroupId) {
            return aGroup?.parentGroupId ? -1 : 1;
          }
          const aLocalOrder = aGroup?.parentGroupId
            ? aGroup.order ?? 0
            : aPlacement.order ?? a.order ?? 0;
          const bLocalOrder = bGroup?.parentGroupId
            ? bGroup.order ?? 0
            : bPlacement.order ?? b.order ?? 0;
          if (aLocalOrder !== bLocalOrder) return aLocalOrder - bLocalOrder;
        }
        return (a.order ?? 0) - (b.order ?? 0);
      })
      : visibleMachines;
    const groupTargets = new Map();
    const renderedGroups = new Set();
    const groupCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupTotalCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupPendingCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupDownCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    if (useGroupedLayout) {
      sortedVisibleMachines.forEach((machine) => {
        const groupId = layoutPlacements[machine.id]?.groupId || "";
        if (!groupCounts.has(groupId)) return;
        const machinePendingCount = getPendingTaskCount(machine);
        const machineDownCount = normalizeStatus(machine.status) === "fuera_de_servicio" ? 1 : 0;
        groupCounts.set(groupId, (groupCounts.get(groupId) || 0) + 1);
        groupTotalCounts.set(groupId, (groupTotalCounts.get(groupId) || 0) + 1);
        groupPendingCounts.set(groupId, (groupPendingCounts.get(groupId) || 0) + machinePendingCount);
        groupDownCounts.set(groupId, (groupDownCounts.get(groupId) || 0) + machineDownCount);
        const parentGroupId = groupById.get(groupId)?.parentGroupId || "";
        if (parentGroupId) {
          groupTotalCounts.set(parentGroupId, (groupTotalCounts.get(parentGroupId) || 0) + 1);
          groupPendingCounts.set(parentGroupId, (groupPendingCounts.get(parentGroupId) || 0) + machinePendingCount);
          groupDownCounts.set(parentGroupId, (groupDownCounts.get(parentGroupId) || 0) + machineDownCount);
        }
      });
      groupTargets.set("", list);
    } else {
      groupTargets.set("", list);
    }
    const renderGroup = (groupId) => {
      if (!useGroupedLayout || !groupId || groupTargets.has(groupId) || renderedGroups.has(groupId)) return;
      const group = groupById.get(groupId);
      if (!group) return;
      const parentGroupId = group.parentGroupId || "";
      if (parentGroupId) renderGroup(parentGroupId);
      const parentTarget = parentGroupId ? groupTargets.get(parentGroupId) : list;
      if (!parentTarget) return;
      const showGroupCounts = !!group.collapsed;
      const { section, body } = createGroupSection(
        group,
        showGroupCounts ? groupPendingCounts.get(groupId) || 0 : 0,
        showGroupCounts ? groupDownCounts.get(groupId) || 0 : 0
      );
      parentTarget.appendChild(section);
      groupTargets.set(groupId, body);
      renderedGroups.add(groupId);
    };
    sortedVisibleMachines.forEach((machine) => {
        if (machine.tagId && !state.tagStatusById[machine.id]) {
          state.tagStatusById[machine.id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
        }
        if ((machine.role || "owner") === "admin") {
          const nextAdminName = (state.adminLabel || "").trim();
          if (nextAdminName && machine.adminName !== nextAdminName) {
            updateMachine(machine.id, { adminName: nextAdminName });
            machine.adminName = nextAdminName;
            autoSave.scheduleSave(machine.id, "admin-name");
          }
        }
        const adminDisplayName = machine.adminName
          ? machine.adminName
          : machine.adminEmail
            ? getAdminDisplayName(machine.adminEmail)
            : "";
        const ownerDisplayName = machine.ownerEmail
          ? getAdminDisplayName(machine.ownerEmail)
          : "";
        const isExpanded = expandedById.has(machine.id);
        const { card, hooks } = createMachineCard(machine, {
          tagStatus: state.tagStatusById[machine.id],
          adminLabel: state.adminLabel,
          adminDisplayName,
          ownerDisplayName,
          mode: "dashboard",
          role: machine.role || "owner",
          disableDrag: query.length > 0,
          canEditTasks: true,
          canCompleteTasks: true,
          canEditStatus: true,
          canEditGeneral: true,
          canEditLocation: true,
          canDownloadHistory: true,
          canEditConfig: true,
          visibleTabs: ["quehaceres", "historial", "general", "configuracion"],
          tabOrder: state.dashboardLayout.tabOrder,
          userRoles: ["usuario", "tecnico", "externo"],
          createdBy: state.adminLabel || null,
          operationalSource: machine._operationalSource || "local",
          locations: state.locations,
          knownUsers: state.knownUsers
        });
        if (isExpanded) {
          card.dataset.expanded = "true";
          card.classList.add("mc-no-anim");
          card.style.maxHeight = "none";
        } else {
          card.style.maxHeight = `${getCollapsedHeightPx()}px`;
        }

        hooks.onToggleExpand = (node) => {
          if (node.classList.contains("is-dragging")) return;
          const isExpanded = node.dataset.expanded === "true";
          if (isExpanded) {
            expandedById.delete(machine.id);
            if (state.mobileFocusedMachineId === machine.id) clearMobileDetailState();
            collapseCard(node);
          } else {
            expandedById.clear();
            expandedById.add(machine.id);
            if (isMobileDashboardViewport()) {
              state.mobileFocusedMachineId = machine.id;
              state.mobileDetailJustEntered = true;
            }
            list.querySelectorAll(".machine-card").forEach((cardEl) => {
              if (cardEl !== node) collapseCard(cardEl);
            });
            expandCard(node);
          }
          state.expandedById = Array.from(expandedById);
          syncMobileDetailUI();
        };

        hooks.onSelectTab = (node, tabId) => {
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machine.id] = tabId || "quehaceres";
          if (node.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(node));
          }
        };

        hooks.onStatusToggle = async (node) => {
          if (pendingStatusIncidentMachineIds.has(machine.id)) return;
          const statusOrder = ["operativa", "fuera_de_servicio"];
          const current = getDraftById(machine.id);
          if (!current) return;
          const currentStatus = normalizeStatus(current.status);
          const idx = statusOrder.indexOf(currentStatus);
          const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
          const keepExpanded = node.dataset.expanded === "true";
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const defaultRestoreTitle = t(
            "tasks.restoreOperation",
            "Volver a poner la máquina en operatividad"
          );
          let incidentDetails = null;
          if (currentStatus !== "fuera_de_servicio" && nextStatus === "fuera_de_servicio") {
            pendingStatusIncidentMachineIds.add(machine.id);
            try {
              incidentDetails = await openStatusIncidentModal({
                machineTitle: current.title || machine.title || "",
                defaultTitle: defaultRestoreTitle
              });
              if (!incidentDetails) return;
            } finally {
              pendingStatusIncidentMachineIds.delete(machine.id);
            }
          }
          const statusUpdate = buildStatusToggleUpdate(
            machine.id,
            current,
            nextStatus,
            user,
            {
              normalizeStatus,
              restoreTitle: (incidentDetails?.title || "").trim() || defaultRestoreTitle,
              restoreDescription: (incidentDetails?.description || "").trim(),
              restoreNote: (incidentDetails?.note || "").trim()
            }
          );
          replaceMachine(machine.id, {
            ...current,
            ...statusUpdate
          });

          const selectedImages = Array.isArray(incidentDetails?.images)
            ? incidentDetails.images
            : [];
          const restoreTask = statusUpdate.tasks?.find(
            (task) =>
              task.source === RESTORE_OPERATION_TASK_SOURCE &&
              task.statusCycleId === statusUpdate.activeStatusCycleId
          );
          const uploadedAttachments = [];
          let failedUploads = 0;
          if (selectedImages.length && restoreTask && hooks.onUploadMachineDocument) {
            notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
            for (const file of selectedImages) {
              try {
                const uploaded = await hooks.onUploadMachineDocument(
                  machine.id,
                  "other",
                  file,
                  null,
                  {
                    silent: true,
                    deferRender: true,
                    rethrow: true,
                    preserveTab: true,
                    documentMetadata: {
                      context: "task-attachment",
                      linkedTaskId: restoreTask.id,
                      linkedStatusCycleId: restoreTask.statusCycleId || ""
                    }
                  }
                );
                if (uploaded) uploadedAttachments.push(uploaded);
              } catch {
                failedUploads += 1;
              }
            }
          }
          if (uploadedAttachments.length && restoreTask) {
            const latest = getDraftById(machine.id);
            if (latest) {
              const attachmentUpdate = buildAddTaskAttachmentsUpdate(
                latest,
                restoreTask.id,
                uploadedAttachments,
                user
              );
              if (attachmentUpdate) updateMachine(machine.id, attachmentUpdate);
            }
          }
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machine.id, "status");
          if (failedUploads) {
            notifyTopbar(
              t(
                "dashboard.incidentImageUploadError",
                "Alguna imagen no se pudo subir"
              )
            );
          } else if (uploadedAttachments.length) {
            notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
          }
          if (keepExpanded) {
            expandedById.add(machine.id);
            state.expandedById = Array.from(expandedById);
          }
        };

        hooks.onTitleUpdate = (node, nextTitle) => {
          const trimmed = (nextTitle || "").trim();
          const normalized = trimmed.toLowerCase();
          if (!normalized) return false;
          const duplicate = state.draftMachines.some(
            (m) => m.id !== machine.id && (m.title || "").trim().toLowerCase() === normalized
          );
          if (duplicate) {
            updateSaveState(t("dashboard.duplicateName", "Nombre duplicado"));
            return false;
          }
          updateMachine(machine.id, { title: trimmed });
          autoSave.scheduleSave(machine.id, "title");
          return true;
        };

        hooks.onUpdateGeneral = (id, field, value, input, errorEl) => {
          if (field === "year") {
            const currentYear = new Date().getFullYear();
            const parsed = value ? Number(value) : null;
            if (parsed !== null && (Number.isNaN(parsed) || parsed > currentYear || parsed < currentYear - 50)) {
              if (errorEl) {
                errorEl.textContent = t("dashboard.invalidYear", (min, max) => `Año inválido (entre ${min} y ${max}).`)(currentYear - 50, currentYear);
                errorEl.dataset.state = "error";
              }
              if (input) input.setAttribute("aria-invalid", "true");
              return;
            }
            if (errorEl) {
              errorEl.textContent = "";
              errorEl.dataset.state = "";
            }
            if (input) input.removeAttribute("aria-invalid");
            updateMachine(id, { year: parsed });
            machine.year = parsed;
          } else {
            updateMachine(id, { [field]: value });
            machine[field] = value;
          }
          autoSave.scheduleSave(id, `general:${field}`);
        };

        installDocumentHooks(hooks, {
          assertStorageAvailable,
          expandedById,
          getDraftById,
          notifyTopbar,
          refreshStorageFullState,
          renderCards,
          state,
          t,
          updateMachine,
          upsertMachine
        });

        hooks.onUpdateLocation = (id, nextValue) => {
          const current = getDraftById(id);
          const normalized = normalizeLocation(nextValue);
          const prev = normalizeLocation(current.location);
          if (normalized === prev) return;
          updateMachine(id, { location: normalized });
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "location",
              value: normalized || ""
            }
          ];
          updateMachine(id, { logs });
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "location");
        };

        hooks.onConnectTag = async (id, tagInput, statusEl) => {
          const tagId = tagInput.value.trim();
          if (!tagId) return false;
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || current.ownerUid || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          statusEl.textContent = t("dashboard.checking", "Comprobando...");
          statusEl.dataset.state = "neutral";
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            const res = await validateTag(tagId);
            if (!res.exists) {
              statusEl.textContent = t("config.tagNotFound", "El Tag ID introducido no existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            if (res.machineId && res.machineId !== id) {
              statusEl.textContent = t("config.tagAlreadyAssigned", "Tag ya est\u00e1 asignado");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            updateMachine(id, {
              tagId,
              tagUrl: buildMachineTagUrl(tagId),
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
            notifyTopbar(t("dashboard.tagLinked", "Tag enlazado"));
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "tag");
            return true;
          } catch {
            statusEl.textContent = t("dashboard.tagValidateError", "Error al validar el tag");
            statusEl.dataset.state = "error";
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
            return false;
          }
        };

        hooks.onDisconnectTag = async (id, _tagInput, statusEl) => {
          const current = getDraftById(id);
          if (!current?.tagId) return;
          const confirmed = window.confirm(
            t(
              "config.disconnectTagConfirm",
              "\u00bfSeguro que quieres desconectar este Tag ID? Se eliminar\u00e1n el Tag ID, la URL asociada y el QR. Este cambio no se puede deshacer."
            )
          );
          if (!confirmed) return;
          if (statusEl) {
            statusEl.textContent = t("config.disconnecting", "Desconectando...");
            statusEl.dataset.state = "neutral";
          }
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            markLocalWrite(id);
            await disconnectMachineTag(id);
            updateMachine(id, {
              tagId: null,
              tagUrl: "",
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = {
              text: t("dashboard.tagDisconnected", "Tag desconectado"),
              state: "error"
            };
            notifyTopbar(t("dashboard.tagDisconnected", "Tag desconectado"));
            await refreshStorageFullState(current.tenantId || current.ownerUid || state.uid);
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
          } catch {
            if (statusEl) {
              statusEl.textContent = t(
                "config.disconnectError",
                "No se pudo desconectar el Tag ID"
              );
              statusEl.dataset.state = "error";
            }
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
          }
        };

        hooks.onGenerateTag = async (id) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          if (current?.isNew) {
            await upsertMachine(tenantId, current);
            current.isNew = false;
          }
          const newId = await createTagToken(tenantId, id);
          notifyTopbar(t("dashboard.tagGenerated", "Tag ID generado"));
          return newId;
        };

        hooks.onCopyTagUrl = (id, btn, input) => {
          if (!input.value) return;
          navigator.clipboard
            .writeText(input.value)
            .catch(() => {
              input.select();
              document.execCommand("copy");
            })
            .finally(() => {
              const prev = btn.textContent;
              btn.textContent = t("config.copied", "Copiado");
              setTimeout(() => (btn.textContent = prev), 1000);
            });
        };

        hooks.onGenerateTagQr = async (id, statusEl) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          if (!current?.tagId) throw new Error("tag-missing");
          const tenantId = current.tenantId || state.uid;
          await assertStorageAvailable(tenantId);
          const tagUrl = current.tagUrl || buildMachineTagUrl(current.tagId);
          const machineForSave = {
            ...current,
            tagUrl,
            tagQrUrl: "",
            tagQrPath: "",
            tagQrSize: 0
          };
          markLocalWrite(id);
          updateMachine(id, { tagUrl, isNew: false });
          if (statusEl) {
            statusEl.textContent = t("config.generatingQr", "Generando QR...");
            statusEl.dataset.state = "neutral";
          }
          try {
            await upsertMachine(tenantId, machineForSave);
            machineForSave.isNew = false;
            await assignTag(machineForSave.tagId, tenantId, machineForSave.id);
            await upsertMachineAccessFromMachine(tenantId, machineForSave, state.uid);
            const result = await generateMachineTagQr(id, getCurrentLang());
            const qrUrl = (result.qrUrl || "").toString().trim();
            if (!qrUrl) throw new Error("qr-missing");
            updateMachine(id, {
              tagUrl: result.tagUrl || tagUrl,
              tagQrUrl: qrUrl,
              tagQrPath: result.qrPath || "",
              tagQrSize: Number(result.qrSize || 0),
              isNew: false
            });
            state.tagStatusById[id] = { text: t("config.qrGenerated", "QR generado"), state: "ok" };
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerated", "QR generado");
              statusEl.dataset.state = "ok";
            }
            renderCards({ preserveScroll: true });
            await refreshStorageFullState(tenantId);
            notifyTopbar(t("config.qrGenerated", "QR generado"));
            return result;
          } catch (error) {
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerateError", "Error al generar QR");
              statusEl.dataset.state = "error";
            }
            throw error;
          }
        };

        hooks.onAddUser = async (id, userInput, passInput, addBtn) => {
          const normalizeName = (value) =>
            (value || "")
              .trim()
              .replace(/\s+/g, " ")
              .toLowerCase();
          const rawName = userInput.value;
          const username = (rawName || "").trim().replace(/\s+/g, " ");
          const normalizedUser = normalizeName(username);
          const password = passInput.value.trim();
          const usingExisting = passInput.disabled && normalizedUser;
          const globalUsers = state.draftMachines
            .flatMap((m) => m.users || [])
            .filter((u) => u && u.username);
          const existingGlobal = globalUsers.find(
            (u) => normalizeName(u.username) === normalizedUser
          );
          const isKnown = !!existingGlobal;
          if (!username || (!password && !isKnown)) {
            userInput.setAttribute("aria-invalid", "true");
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = current.tenantId || state.uid;
          const users = Array.isArray(current.users) ? [...current.users] : [];
          if (users.some((u) => normalizeName(u.username) === normalizedUser)) {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            return;
          }
          try {
            let saltBase64 = "";
            let passwordHashBase64 = "";
            if (isKnown) {
              saltBase64 = existingGlobal ? existingGlobal.saltBase64 || "" : "";
              passwordHashBase64 = existingGlobal ? existingGlobal.passwordHashBase64 || "" : "";
            } else {
              saltBase64 = generateSaltBase64();
              passwordHashBase64 = await hashPassword(password, saltBase64);
            }
            if (!passwordHashBase64 || !saltBase64) {
              if (addBtn) {
                const prev = addBtn.textContent;
                addBtn.textContent = t("dashboard.genericError", "Error");
                setTimeout(() => (addBtn.textContent = prev), 1000);
              }
              return;
            }
            const newUser = {
              id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
              username: existingGlobal ? existingGlobal.username : username,
              role: "usuario",
              createdAt: new Date().toISOString(),
              saltBase64,
              passwordHashBase64
            };
            updateSaveState(t("dashboard.saving", "Guardando..."));
            const updatedUsers = await addUserWithRegistry(tenantId, id, newUser, {
              normalizeName,
              allowExisting: usingExisting
            });
            updateMachine(id, { users: updatedUsers });
            if (current.tagId) {
              await upsertMachineAccessFromMachine(tenantId, {
                ...current,
                users: updatedUsers
              }, state.uid);
            }
            updateSaveState(
              usingExisting
                ? t("dashboard.userAssigned", "Usuario asignado")
                : t("dashboard.userCreated", "Usuario creado")
            );
            userInput.value = "";
            passInput.value = "";
          } catch {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            updateSaveState(t("dashboard.saveError", "Error al guardar"));
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
        };

        hooks.onUpdateUserRole = (id, userId, role) => {
          const current = getDraftById(id);
          const users = (current.users || []).map((u) =>
            u.id === userId ? { ...u, role } : u
          );
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "role");
        };

        hooks.onRemoveUser = (id, userId) => {
          const current = getDraftById(id);
          const users = (current.users || []).filter((u) => u.id !== userId);
          const removedUser = (current.users || []).find((u) => u.id === userId);
          const normalizedRemoved = removedUser
            ? (removedUser.username || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase()
            : "";
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "remove-user");
          const tenantId = current.tenantId || state.uid;
          if (tenantId && normalizedRemoved) {
            const stillAssignedLocal = state.draftMachines
              .flatMap((m) => m.users || [])
              .some(
                (u) =>
                  (u.username || "")
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase() === normalizedRemoved
              );
            if (!stillAssignedLocal) {
              (async () => {
                try {
                  const remoteMachines = await fetchMachines(tenantId);
                  const stillAssignedRemote = remoteMachines
                    .flatMap((m) => m.users || [])
                    .some(
                      (u) =>
                        (u.username || "")
                          .trim()
                          .replace(/\s+/g, " ")
                          .toLowerCase() === normalizedRemoved
                    );
                  if (!stillAssignedRemote) {
                    await deleteUserRegistry(tenantId, normalizedRemoved);
                  }
                } catch {
                  // ignore cleanup errors
                }
              })();
            }
          }
        };

        hooks.onUpdateUserPassword = async (id, userId, nextPassword, input) => {
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = current.tenantId || state.uid;
          try {
            const saltBase64 = generateSaltBase64();
            const passwordHashBase64 = await hashPassword(nextPassword, saltBase64);
            const users = (current.users || []).map((u) =>
              u.id === userId ? { ...u, saltBase64, passwordHashBase64 } : u
            );
            updateMachine(id, { users });
            if (input) input.setAttribute("aria-invalid", "false");
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "user-pin");
          } catch {
            if (input) input.setAttribute("aria-invalid", "true");
          }
        };

        hooks.onDownloadLogs = (machineData) => {
          const logs = machineData.logs || [];
          const historyLocale = document.documentElement.lang === "en" ? "en-GB" : "es-ES";
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString(historyLocale);
            if (log.type === "task") {
              const title = log.title || t("history.task", "Tarea");
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              if (log.punctual) {
                const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
                return `[${time}] ${t("history.oneOffCompleted", "Tarea puntual completada")}${duration}: ${title}${user}`;
              }
              const overdueText = log.overdueDuration
                ? t("history.lateSuffix", (text) => `, ${text} tarde`)(log.overdueDuration)
                : "";
              const prefix = log.overdue
                ? t("history.completedLate", (text) => `Tarea completada fuera de plazo${text}: `)(overdueText)
                : t("history.completed", "Tarea completada: ");
              return `[${time}] ${prefix}${title}${user}`;
            }
            if (log.type === "location") {
              const value = log.value ? log.value : t("history.noLocation", "Sin ubicación");
              return `[${time}] ${t("history.location", "Ubicación")} -> ${value}`;
            }
            if (log.type === "intervencion") {
              const message = log.message || "";
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              return `[${time}] ${t("history.interventionLog", "Intervención")}: ${message}${user}`;
            }
            const value =
              log.value === "operativa"
                ? t("dashboard.statusByValue.operativa", "Operativo")
                : t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio");
            return `[${time}] ${t("history.status", "Estado")} -> ${value}`;
          });
          const blob = new Blob([lines.join("\n")], {
            type: "text/plain;charset=utf-8"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const safeTitle = (machineData.title || machineData.id || "registro")
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");
          a.href = url;
          a.download = `registro_${safeTitle}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };

        hooks.onRemoveMachine = (machineData) => {
          if (!isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(`\u00bfSeguro que quieres eliminar ${title}?, Esta acci\u00f3n no se puede deshacer.`);
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          autoSave.saveNow(machineData.id, "delete", async () => {
            const tenantId = machineData.tenantId || state.uid;
            try {
              await deleteMachine(tenantId, machineData.id);
            } catch {
              notifyTopbar("No se pudo eliminar el equipo");
              const restored = await fetchMachine(tenantId, machineData.id);
              if (restored) {
                const normalized = normalizeMachine(restored, state.draftMachines.length);
                normalized.tenantId = tenantId;
                normalized.role = "owner";
                normalized.ownerEmail = state.adminEmail || "";
                state.draftMachines = [normalized, ...state.draftMachines];
                renderCards({ preserveScroll: true });
              }
            }
          });
        };

        hooks.onLeaveAdmin = (machineData) => {
          if (isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(
            `\u00bfSeguro que quieres dejar de administrar ${title}?`
          );
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          leaveAdminRole(machineData.id).catch(() => {});
        };

        hooks.onAddIntervention = (machineData, message) => {
          const current = getDraftById(machineData.id) || machineData;
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            { ts: new Date().toISOString(), type: "intervencion", message, user }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "historial";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar(t("dashboard.interventionDone", "Intervención realizada"));
          autoSave.saveNow(machineData.id, "intervencion");
        };

        installTaskHooks(hooks, {
          autoSave,
          expandedById,
          getDraftById,
          notifyTopbar,
          normalizeStatus,
          renderCards,
          state,
          t,
          updateMachine
        });

        hooks.onUpdateNotifications = (id, next) => {
          updateMachine(id, { notifications: next });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "notifications");
        };

        hooks.onUpdateAdmin = async (id, email) => {
          const current = getDraftById(id);
          if (!current) return;
          const ownerEmail = (current.ownerEmail || state.adminEmail || "").trim();
          if (!isOwnerMachine(current)) {
            notifyTopbar("Solo el propietario puede asignar administrador");
            return;
          }
          const nextEmail = normalizeEmail(email);
          const ownerNormalized = normalizeEmail(ownerEmail);
          const tenantId = state.uid;
          const transferStatus = (current.ownershipTransferStatus || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          if (transferStatus.startsWith("pendiente")) {
            notifyTopbar(
              t(
                "dashboard.adminBlockedByTransfer",
                "No puedes asignar administrador con una transferencia pendiente"
              )
            );
            return;
          }

          if (!nextEmail) {
            updateMachine(id, { adminEmail: "", adminStatus: "" });
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.scheduleSave(id, "admin");
            return;
          }
          if (ownerNormalized && nextEmail === ownerNormalized) {
            updateMachine(id, {
              adminEmail: "",
              adminStatus: t("dashboard.adminOwnEmail", "Introduce otra dirección de correo que no sea la tuya")
            });
            state.selectedTabById = { ...(state.selectedTabById || {}), [id]: "configuracion" };
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
          }
          const restoreY = window.scrollY;
          const anchorCard = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
          state.nextScrollAnchor = anchorCard
            ? { id, top: anchorCard.getBoundingClientRect().top }
            : null;
          state.nextScrollRestoreY = restoreY;
          setTimeout(() => {
            if (state.nextScrollRestoreY === restoreY) state.nextScrollRestoreY = null;
            if (state.nextScrollAnchor?.id === id) state.nextScrollAnchor = null;
          }, 3000);
          try {
            await createAdminInvite(id, nextEmail);
          } catch {
            state.nextScrollRestoreY = null;
            state.nextScrollAnchor = null;
            notifyTopbar(t("dashboard.adminAssignNoPermission", "No tienes permisos para asignar administrador"));
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          notifyTopbar(t("dashboard.adminPending", "Pendiente aceptación"));
        };

        hooks.onRemoveAdmin = async (id) => {
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = getMachineTenantId(current);
          updateMachine(id, { adminEmail: "", adminStatus: "" });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await revokeAdminInvite(id, current.adminEmail || "");
          } catch {
            // ignore link update failures
          }
          autoSave.scheduleSave(id, "admin");
        };

        hooks.onTransferOwnership = async (id, email) => {
          const current = getDraftById(id);
          if (!current) return;
          if (!isOwnerMachine(current)) {
            notifyTopbar(t("dashboard.transferOnlyOwner", "Solo el propietario puede transferir la máquina"));
            return;
          }
          if ((current.adminEmail || "").trim()) {
            const status = t(
              "dashboard.transferBlockedByAdmin",
              "Quita el administrador antes de transferir la propiedad"
            );
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: status
            });
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            notifyTopbar(status);
            return;
          }
          const nextEmail = normalizeEmail(email);
          if (!nextEmail) return;
          if (nextEmail === normalizeEmail(state.adminEmail || "")) {
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: t("dashboard.transferOwnEmail", "Introduce otra cuenta registrada")
            });
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
          }
          updateMachine(id, {
            ownershipTransferEmail: nextEmail,
            ownershipTransferStatus: t("config.pendingAcceptance", "Pendiente aceptación")
          });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await createMachineTransferInvite(id, nextEmail);
            notifyTopbar(t("dashboard.transferPending", "Transferencia pendiente de aceptación"));
          } catch (error) {
            const message = (error?.message || error?.code || "").toString();
            const status = message.includes("target-account-not-found") || message.includes("not-found")
              ? t("dashboard.transferAccountNotFound", "La cuenta no existe")
              : t("dashboard.transferError", "No se pudo procesar la transferencia");
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: status
            });
            renderCards({ preserveScroll: true });
            notifyTopbar(status);
          }
        };

        hooks.onCancelOwnershipTransfer = async (id) => {
          const current = getDraftById(id);
          if (!current) return;
          updateMachine(id, {
            ownershipTransferEmail: "",
            ownershipTransferStatus: ""
          });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await cancelMachineTransferInvite(id);
            notifyTopbar(t("dashboard.transferCanceled", "Transferencia cancelada"));
          } catch {
            notifyTopbar(t("dashboard.transferError", "No se pudo procesar la transferencia"));
          }
        };

        hooks.onTestNotification = (machineData) => {
          const logs = [
            ...(machineData.logs || []),
            {
              ts: new Date().toISOString(),
              type: "notification",
              message: t("dashboard.testNotificationRequested", "Notificación de prueba solicitada")
            }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machineData.id, "notification-test");
        };

        hooks.onContentResize = () => {
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
        };

        const targetGroupId = useGroupedLayout && validGroupIds.has(layoutPlacements[machine.id]?.groupId)
          ? layoutPlacements[machine.id]?.groupId || ""
          : "";
        if (targetGroupId) renderGroup(targetGroupId);
        const target = groupTargets.get(targetGroupId) || groupTargets.get("") || list;
        if (targetGroupId) {
          const cardWrap = document.createElement("div");
          cardWrap.className = "machine-card-wrap";
          cardWrap.appendChild(card);
          target.appendChild(cardWrap);
        } else {
          target.appendChild(card);
        }
        cardRefs.set(machine.id, { card, hooks });

        if (!isExpanded) {
          collapseCard(card, { suppressAnimation: true });
        }

        let desiredTab = selectedTabById[machine.id] || "quehaceres";
        if (!card.querySelector(`.mc-tab[data-tab="${desiredTab}"]`)) {
          desiredTab = "quehaceres";
          if (state.selectedTabById) state.selectedTabById[machine.id] = "quehaceres";
        }
        if (hooks.setActiveTab && isExpanded) {
          hooks.setActiveTab(desiredTab, { notify: false });
        }

        if (isExpanded) {
          scheduleHeightSync(machine.id, () => {
            recalcHeight(card);
            requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
          });
        }
      });
    if (useGroupedLayout && locallyVisibleEmptyGroupIds.size) {
      Array.from(locallyVisibleEmptyGroupIds).forEach((groupId) => {
        if (!groupById.has(groupId)) {
          locallyVisibleEmptyGroupIds.delete(groupId);
          return;
        }
        renderGroup(groupId);
      });
    }
    if (isMobileDashboardViewport()) {
      const expandedId = Array.from(expandedById)[0] || "";
      if (expandedId) {
        if (!state.mobileFocusedMachineId) state.mobileFocusedMachineId = expandedId;
      } else {
        clearMobileDetailState();
      }
    } else {
      clearMobileDetailState();
    }
    syncMobileDetailUI();
    if (preserveScroll) {
      state.nextScrollAnchor = null;
      restoreViewport(prevScrollY || 0, renderAnchor);
    }
    syncSearchVisualState();
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) {
      updateLoading();
    }
  };

  const handleReorder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    if (
      state.dashboardLayout?.machineViewMode === "flat" &&
      state.dashboardLayout?.machineSortMode !== "manual"
    ) {
      renderCards({ preserveScroll: true });
      return;
    }
    clearInitialGroupPriorityOrder();
    const result = reorderFlatMachines(state.draftMachines, orderIds);
    result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(result.machines);
    renderCards();
  };

  const updateUngroupedOrder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    clearInitialGroupPriorityOrder("");
    const result = reorderUngroupedMachines(state.draftMachines, orderIds);
    result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(state.draftMachines);
  };

  const updateGroupedPlacementOrder = (groupId, orderIds) => {
    clearInitialGroupPriorityOrder(groupId || "");
    state.dashboardLayout = updatePlacementOrder(state.dashboardLayout, groupId, orderIds);
  };

  const handleMixedItemReorder = (parentGroupId, items = []) => {
    if (!Array.isArray(items) || !items.length) return;
    if (state.dashboardLayout?.machineViewMode === "flat") {
      handleReorder(items.filter((item) => item.type === "machine").map((item) => item.id));
      return;
    }
    clearInitialGroupPriorityOrder(parentGroupId || "");
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = reorderMixedItems(
      state.dashboardLayout,
      state.draftMachines,
      parentGroupId,
      items
    );
    state.dashboardLayout = result.layout;
    state.draftMachines = result.machines;
    if (result.touchedMachineIds.length) {
      result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
      saveOrderCache(state.draftMachines);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const handleGroupedReorder = (groupId, orderIds) => {
    if (state.dashboardLayout?.machineViewMode === "flat") {
      handleReorder(orderIds);
      return;
    }
    if (!state.dashboardLayout?.groups?.length) {
      handleReorder(orderIds);
      return;
    }
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    if (groupId) updateGroupedPlacementOrder(groupId, orderIds);
    else {
      updateGroupedPlacementOrder("", orderIds);
      updateUngroupedOrder(orderIds);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const createGroupFromDrop = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(t("dashboard.addGroupPrompt", "Nombre del grupo"), suggestedTitle);
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const targetGroupId = state.dashboardLayout.placements?.[targetId]?.groupId || "";
    const targetGroup = (state.dashboardLayout.groups || []).find((group) => group.id === targetGroupId);
    const parentGroupId = targetGroup && !targetGroup.parentGroupId ? targetGroup.id : "";
    const result = createGroupFromMachineDrop(state.dashboardLayout, state.draftMachines, {
      draggedId,
      targetId,
      groupId: createDashboardGroupId(),
      title: cleanTitle,
      parentGroupId
    });
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToTargetGroup = (draggedId, targetId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") {
      const orderedIds = state.draftMachines
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((machine) => machine.id)
        .filter((id) => id && id !== draggedId);
      const targetIndex = orderedIds.indexOf(targetId);
      orderedIds.splice(targetIndex >= 0 ? targetIndex + 1 : orderedIds.length, 0, draggedId);
      handleReorder(orderedIds);
      return;
    }
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const targetGroupId = state.dashboardLayout.placements?.[targetId]?.groupId || "";
    const targetGroup = (state.dashboardLayout.groups || []).find((group) => group.id === targetGroupId);
    if (!targetGroupId || (targetGroup && !targetGroup.parentGroupId)) {
      createGroupFromDrop(draggedId, targetId);
      return;
    }
    const result = moveMachineAfterTarget(
      state.dashboardLayout,
      state.draftMachines,
      draggedId,
      targetId
    );
    if (result.shouldCreateGroup) {
      createGroupFromDrop(draggedId, targetId);
      return;
    }
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToGroup = (draggedId, targetGroupId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    if (!draggedId || !targetGroupId) return;
    clearInitialGroupPriorityOrder(targetGroupId);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = moveMachineToDashboardGroup(
      state.dashboardLayout,
      state.draftMachines,
      draggedId,
      targetGroupId
    );
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveGroupToTargetGroup = (draggedGroupId, targetGroupId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    if (!draggedGroupId || !targetGroupId || draggedGroupId === targetGroupId) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = moveGroupToGroup(state.dashboardLayout, draggedGroupId, targetGroupId);
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const getUniqueTitle = () => {
    const existing = new Set(
      state.draftMachines.map((m) => (m.title || "").trim().toLowerCase())
    );
    let idx = 1;
    let title = t("dashboard.machineDefaultName", (value) => `Machine ${value}`)(idx);
    while (existing.has(title.toLowerCase())) {
      idx += 1;
      title = t("dashboard.machineDefaultName", (value) => `Machine ${value}`)(idx);
    }
    return title;
  };

  addBtn.addEventListener("click", () => {
    const order = computePrevOrder();
    const machine = createDraftMachine(state.draftMachines.length + 1, order);
    machine.title = getUniqueTitle();
    machine.tenantId = state.uid;
    machine.role = "owner";
    machine.ownerEmail = state.adminEmail || "";
    state.draftMachines = [machine, ...state.draftMachines];
    saveOrderCache(state.draftMachines);
    renderCards();
    autoSave.saveNow(machine.id, "create");
  });

  const fetchAdminMachines = async (uid, email) => {
    const links = await fetchLinksForAdmin(uid, "accepted");
    const machines = await Promise.all(
      links.map(async (link) => {
        if (!link.ownerUid || !link.machineId) return null;
        if (link.status !== "accepted") return null;
        const data = await fetchMachine(link.ownerUid, link.machineId);
        if (!data) return null;
        const normalized = normalizeMachine(data, state.draftMachines.length);
        normalized.tenantId = link.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = link.ownerEmail || "";
        return normalized;
      })
    );
    return machines.filter(Boolean);
  };

  const ensureGroupedDragAndDrop = () => {
    if (groupedDragAndDropReady) return;
    initGroupedDragAndDrop(list, {
      onReorder: handleGroupedReorder,
      onReorderItems: handleMixedItemReorder,
      onDropOnCard: moveMachineToTargetGroup,
      onDropMachineOnGroup: moveMachineToGroup,
      onDropGroupOnGroup: moveGroupToTargetGroup,
      allowGrouping: () => state.dashboardLayout?.machineViewMode !== "flat"
    });
    groupedDragAndDropReady = true;
  };

  const initDashboard = async (uid, user, sessionVersion) => {
    const isActiveSession = () =>
      activeDashboardUid === uid && dashboardSessionVersion === sessionVersion;
    resetDashboardRuntime(uid);
    state.uid = uid;
    state.adminLabel = user.displayName || user.email || t("dashboard.admin", "Administrador");
    state.adminEmail = user.email || "";
    resetInitialMobileScroll();
    refreshStorageFullState(uid);
    armLoadingGuard();
    try {
      await upsertAccountDirectory(user);
    } catch {
      // ignore directory write errors
    }
    if (!isActiveSession()) return;
    try {
      state.dashboardLayout = normalizeDashboardLayout(await fetchDashboardLayout(uid));
    } catch {
      state.dashboardLayout = {
        groups: [],
        placements: {},
        tabOrder: normalizeTabOrder(),
        dashboardTitle: "",
        registrySeenAt: "",
        suggestionsSeenAt: "",
        machineViewMode: "grouped",
        machineSortMode: "manual"
      };
    }
    if (!isActiveSession()) return;
    if (!state.dashboardLayout.registrySeenAt) {
      state.dashboardLayout.registrySeenAt = new Date().toISOString();
      upsertDashboardLayout(uid, {
        registrySeenAt: state.dashboardLayout.registrySeenAt
      }).catch(() => {});
    }
    if (state.isSuperadmin && !state.dashboardLayout.suggestionsSeenAt) {
      state.dashboardLayout.suggestionsSeenAt = new Date().toISOString();
      upsertDashboardLayout(uid, {
        suggestionsSeenAt: state.dashboardLayout.suggestionsSeenAt
      }).catch(() => {});
    }
    applyDashboardTitle();
    initDashboardTitleEditor();
    loadSuggestions({ preserveScroll: false });
    loadTodos({ preserveScroll: false });

    let ownerFetchResolved = false;
    let ownerBootstrap = [];
    try {
      const remote = await withTimeout(fetchMachines(uid));
      markOwnerLoadSuccess(state);
      ownerFetchResolved = true;
      ownerBootstrap = remote
        .map((m, idx) => normalizeMachine(m, idx))
        .filter(Boolean)
        .map((m) => ({
          ...m,
          tenantId: uid,
          role: "owner",
          ownerEmail: state.adminEmail || ""
      }));
      if (!remote.length) {
        const legacy = await withTimeout(fetchLegacyMachines(uid));
        if (legacy.length) {
          await withTimeout(migrateLegacyMachines(uid, legacy));
        }
      }
    } catch {
      markOwnerLoadFailure(state);
      updateLoading();
    }
    if (!isActiveSession()) return;

    const emailLower = normalizeEmail(user.email || "");
    if (ownerFetchResolved) {
      state.ownerMachines = ownerBootstrap;
      markOwnerLoadSuccess(state);
      updateLoading();
    }
    try {
      const adminBootstrap = await withTimeout(fetchAdminMachines(uid, emailLower));
      markAdminLoadSuccess(state);
      state.adminMachines = adminBootstrap;
      updateLoading();
    } catch {
      markAdminLoadFailure(state);
      updateLoading();
    }
    if (!isActiveSession()) return;
    scheduleRebuild({ preserveScroll: false });
    const subscriptions = getDashboardSubscriptions();
    subscriptions.subscribeOwnerMachines(uid);
    subscriptions.subscribeAdminLinks(uid);
    subscriptions.subscribePendingInvites(emailLower);
    subscriptions.subscribePendingTransferInvites(uid);
    try {
      const acceptedInvites = await fetchInvitesForAdmin(emailLower, "accepted");
      await Promise.all(
        acceptedInvites.map((invite) => ensureAdminLink(invite.id))
      );
    } catch {
      // ignore invite ensure failures
    }
    if (!isActiveSession()) return;
    renderCards();
    resetInitialMobileScroll();
    ensureGroupedDragAndDrop();
  };

  window.addEventListener("hashchange", () => {
    const nextView = getDashboardInternalView();
    if (nextView === state.activeView) return;
    const previousView = state.activeView;
    state.activeView = nextView;
    if (previousView === "registro" && nextView !== "registro") {
      markRegistrySeen();
    }
    if (previousView === "sugerencias" && nextView !== "sugerencias") {
      markSuggestionsSeen();
    }
    if (nextView === "registro") {
      state.registryVisibleCount = GLOBAL_REGISTRY_PAGE_SIZE;
    }
    if (nextView === "sugerencias") {
      state.suggestionsVisibleCount = SUGGESTIONS_PAGE_SIZE;
      loadSuggestions({ preserveScroll: false });
    }
    if (nextView === "todo") {
      state.todoVisibleCount = TODO_PAGE_SIZE;
      loadTodos({ preserveScroll: false });
    }
    renderCards({ preserveScroll: false });
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      activeDashboardUid = "";
      dashboardInitPromise = null;
      dashboardSessionVersion += 1;
      clearDashboardTimer();
      cleanupDashboardSubscriptions();
      if (isPublicSectionHash()) {
        mount.hidden = true;
        return;
      }
      redirectToEntry();
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = `${appBasePrefix || ""}/?setup=1`;
        return;
      }
      state.canSuggest = registration.profile?.suggestionsCollaborator === true;
      state.canTodo = registration.profile?.suggestionsCollaborator === true;
      state.isSuperadmin = await isControlPanelUser(user);
    } catch {
      window.location.href = `${appBasePrefix || ""}/?setup=1`;
      return;
    }
    if (activeDashboardUid === user.uid && dashboardInitPromise) return;
    if (
      activeDashboardUid === user.uid &&
      !state.loading &&
      !state.ownerLoadFailed &&
      !state.adminLoadFailed
    ) {
      return;
    }
    activeDashboardUid = user.uid;
    const sessionVersion = ++dashboardSessionVersion;
    dashboardInitPromise = initDashboard(user.uid, user, sessionVersion)
      .catch(() => {
        if (dashboardSessionVersion !== sessionVersion) return;
        markDashboardLoadFailure(state);
        updateLoading();
        renderCards({ preserveScroll: false });
      })
      .finally(() => {
        if (dashboardSessionVersion === sessionVersion) {
          dashboardInitPromise = null;
        }
      });
  });
}
