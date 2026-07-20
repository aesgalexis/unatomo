import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, fetchLegacyMachines, migrateLegacyMachines, fetchMachine, upsertMachine, deleteMachine, addUserWithRegistry, deleteUserRegistry, fetchDashboardLayout, upsertDashboardLayout } from "./firestoreRepo.js";
import { upsertAccountDirectory, normalizeEmail, getDisplayNameByEmail } from "./admin/accountDirectoryRepo.js";
import { fetchInvitesForAdmin } from "./admin/adminInvitesRepo.js";
import { fetchLinksForAdmin } from "./admin/adminLinksRepo.js";
import { createAdminInvite, leaveAdminRole, revokeAdminInvite, ensureAdminLink, createMachineTransferInvite, cancelMachineTransferInvite } from "./admin/adminFunctionsRepo.js";
import { validateTag, assignTag } from "./tagRepo.js";
import { createTagToken } from "/static/js/tokens/tagTokens.js";
import { upsertMachineAccessFromMachine, fetchMachineAccess } from "./machineAccessRepo.js";
import { buildMachineTagUrl, generateMachineTagQr, disconnectMachineTag } from "./tags/tagAssetsRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initGroupedDragAndDrop } from "./dragAndDrop.js";
import { cloneMachines, normalizeMachine } from "./machineStore.js";
import { installTaskHooks } from "./cardHooks/taskHooks.js";
import { installDocumentHooks } from "./cardHooks/documentHooks.js";
import { generateSaltBase64, hashPassword } from "/static/js/utils/crypto.js";
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
import { createDashboardGroupTreeShell } from "./components/groupTree/groupTreeShell.js";
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
  MAX_DASHBOARD_GROUP_DEPTH,
  canDashboardGroupHaveChildren,
  getDashboardGroupDepth,
  normalizeDashboardLayout as normalizeDashboardLayoutBase,
  normalizeTabOrder
} from "./layout/dashboardLayoutModel.mjs";
import {
  canMoveGroupIntoGroup,
  canWrapGroupWithParent,
  createDashboardGroupId,
  createChildGroup,
  createParentGroup,
  deleteGroup,
  getNextDashboardGroupTitle,
  renameGroup,
  reorderFlatMachines
} from "./layout/dashboardLayoutActions.js";
import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  SUGGESTIONS_PAGE_SIZE,
} from "./views/dashboardInternalViews.js";
import { createMachineAccessSync } from "./data/machineAccessSync.js";
import { createDashboardSubscriptions } from "./data/dashboardSubscriptions.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import { calculateStorageUsage, STORAGE_LIMIT_BYTES } from "/static/js/configuracion/storageUsage.js";
import { getAppBasePrefix, getCurrentLang, setSavedLang } from "/static/js/site/locale.js";
import { t } from "./i18n.js";
import { createDashboardState } from "./runtime/dashboardState.js";
import {
  getDashboardInternalView,
  isMobileViewport,
  isPublicSectionHash
} from "./runtime/dashboardNavigation.js";
import { normalizeMachineStatus as normalizeStatus, sortFlatMachines } from "./runtime/dashboardSorting.js";
import { loadOrderCache, saveOrderCache } from "./runtime/orderCache.js";
import { createDashboardTooltips } from "./runtime/dashboardTooltips.js";
import { createDashboardTitleController } from "./runtime/dashboardTitleController.js";
import { createMobileDashboardController } from "./runtime/mobileDashboardController.js";
import { createDashboardViewport } from "./runtime/dashboardViewport.js";
import { createDashboardSession } from "./runtime/dashboardSession.js";
import { createDashboardDataController } from "./runtime/dashboardDataController.js";
import { createDashboardMachineState } from "./runtime/dashboardMachineState.js";
import { createDashboardAutoSave } from "./runtime/dashboardAutoSave.js";
import { createDashboardInternalViewController } from "./controllers/dashboardInternalViewController.js";
import { createDashboardOrderingController } from "./controllers/dashboardOrderingController.js";
import { createMachineAccessController } from "./controllers/machineAccessController.js";
import { createDashboardNavigationController } from "./controllers/dashboardNavigationController.js";
import { createDashboardLoadController } from "./controllers/dashboardLoadController.js";
import { createDashboardGroupTreeController } from "./controllers/dashboardGroupTreeController.js";
import { createDashboardTopbarController } from "./controllers/dashboardTopbarController.js";
import { createDashboardViewModeController } from "./controllers/dashboardViewModeController.js";
import { createDashboardRenderer } from "./rendering/dashboardRenderer.js";
import { createGroupSectionRenderer } from "./rendering/groupSectionRenderer.js";
import {
  collapseMachineCard as collapseCard,
  expandMachineCard as expandCard,
  getCollapsedHeightPx,
  recalcMachineCardHeight as recalcHeight,
  scheduleMachineCardHeight as scheduleHeightSync
} from "./rendering/machineCardLayout.js";

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
try {
  if (isMobileViewport() && "scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
} catch {}

if (mount) {
  const state = createDashboardState({
    activeView: getDashboardInternalView(),
    registryPageSize: GLOBAL_REGISTRY_PAGE_SIZE,
    suggestionsPageSize: SUGGESTIONS_PAGE_SIZE
  });

  const cardRefs = new Map();
  const locallyVisibleEmptyGroupIds = new Set();
  const pendingStatusIncidentMachineIds = new Set();
  let activeDashboardUid = "";
  let dashboardInitPromise = null;
  let dashboardSessionVersion = 0;
  let groupedDragAndDropReady = false;
  const largeDashboardQuery = window.matchMedia("(min-width: 1280px)");
  const isTreeModeActive = () =>
    largeDashboardQuery.matches &&
    state.dashboardLayout?.machineViewMode === "grouped" &&
    state.dashboardLayout?.groupPresentationMode === "tree";

  const dashboardTooltips = createDashboardTooltips();
  const clearDashboardTooltips = dashboardTooltips.clear;
  const attachDashboardTooltip = dashboardTooltips.attach;
  dashboardTooltips.installGlobalCleanup();


  const statusLabels = {
    operativa: t("dashboard.statusByValue.operativa", "Operativo"),
    fuera_de_servicio: t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio")
  };


  const withTimeout = (promise, ms = 6000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), ms);
      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });

  const dashboardTitleController = createDashboardTitleController({
    state,
    t,
    attachTooltip: attachDashboardTooltip,
    normalizeLayout: (layout) => normalizeDashboardLayout(layout),
    persistTitle: (uid, dashboardTitle) =>
      upsertDashboardLayout(uid, { dashboardTitle }),
    updateSaveState: (message) => updateSaveState(message)
  });
  const applyDashboardTitle = dashboardTitleController.apply;
  const initDashboardTitleEditor = dashboardTitleController.initEditor;


  const normalizeLocation = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);

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
    galleryLink,
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
      gallery: t("dashboard.navGallery", "Galería"),
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
        state.todoPage = 1;
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

  const dashboardNavigation = createDashboardNavigationController({
    state,
    normalizeDashboardLayout: (layout) => normalizeDashboardLayout(layout),
    notifyTopbar: (message) => notifyTopbar(message),
    registryBadge,
    registryLink,
    renderCards: (options) => renderCards(options),
    suggestionsBadge,
    suggestionsLink,
    t,
    todoBadge,
    todoLink
  });
  const {
    loadSuggestions,
    loadTodoCollaborators,
    loadTodos,
    markRegistrySeen,
    markSuggestionsSeen,
    updateRegistryBadge,
    updateSuggestionsBadge,
    updateTodoNav
  } = dashboardNavigation;

  const { viewMenu } = createDashboardViewModeController({
    getAutoSave: () => autoSave,
    isTreeAvailable: () => largeDashboardQuery.matches,
    normalizeDashboardLayout: (layout) => normalizeDashboardLayout(layout),
    notifyTopbar: (message) => notifyTopbar(message),
    renderCards: (options) => renderCards(options),
    reorderFlatMachines,
    saveOrderCache,
    sortFlatMachines,
    state,
    t,
    upsertDashboardLayout
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
  const { workspace: dashboardWorkspace, groupTree } = createDashboardGroupTreeShell({
    inviteBanner,
    filterInfo,
    list
  });

  addBar.appendChild(loadingEl);
  mount.appendChild(sectionNav);
  mount.appendChild(addBar);
  mount.appendChild(mobileBackBtn);
  mount.appendChild(dashboardWorkspace);

  const updateSaveState = (message = "") => {
    setTopbarSaveStatus(message);
  };
  const notifyTopbar = (message = "") => {
    setTopbarSaveStatus(message);
  };

  const dashboardTopbar = createDashboardTopbarController({
    addBar,
    addBtn,
    applyDashboardTitle,
    calculateStorageUsage,
    dashboardLink,
    galleryLink,
    getStorageFullText: () => getStorageFullText(),
    handleInviteDecision: (...args) => handleInviteDecision(...args),
    handleTransferDecision: (...args) => handleTransferDecision(...args),
    notifyTopbar,
    registryLink,
    searchInput,
    setTopbarNotifications,
    state,
    STORAGE_LIMIT_BYTES,
    suggestionsLink,
    t,
    todoLink,
    viewMenu
  });
  const {
    assertStorageAvailable,
    refreshStorageFullState,
    renderTopbarNotifications,
    syncDashboardViewChrome
  } = dashboardTopbar;

  const clearDashboardTimer = () => {
    if (state.loadingGuardTimer) {
      clearTimeout(state.loadingGuardTimer);
      state.loadingGuardTimer = null;
    }
    clearRebuildTimer();
  };

  const cleanupDashboardSubscriptions = () => {
    cleanupSubscriptions();
  };

  const mobileDashboard = createMobileDashboardController({
    collapseCard,
    isMobileViewport,
    list,
    mobileBackBtn,
    mount,
    searchInput,
    state
  });
  const {
    clearMobileDetailState,
    isMobileDashboardViewport,
    resetInitialMobileScroll,
    syncMobileDetailUI
  } = mobileDashboard;

  const dashboardLoad = createDashboardLoadController({
    addBtn,
    cardRefs,
    cleanupDashboardSubscriptions,
    clearDashboardTimer,
    clearMobileDetailState,
    getDashboardLoadProgress,
    list,
    loadingEl,
    locallyVisibleEmptyGroupIds,
    markDashboardLoadTimeout,
    renderCards: (options) => renderCards(options),
    renderDashboardEmptyPlaceholder,
    renderDashboardLoadErrorPlaceholder,
    resetDashboardLoadState,
    resetLoadingProgress,
    searchInput,
    setLoadingProgress,
    state,
    syncDashboardViewChrome,
    t,
    viewMenu
  });
  const {
    armLoadingGuard,
    renderLoadErrorPlaceholder,
    renderPlaceholder,
    resetDashboardRuntime,
    updateLoading
  } = dashboardLoad;



  const getStorageFullText = () =>
    t(
      "dashboard.storageFullNotification",
      "Almacenamiento lleno. Libera espacio para subir documentos o generar nuevos Tag ID/QR."
    );


  const machineAccessController = createMachineAccessController({
    state,
    inviteBanner,
    notifyTopbar,
    renderCards: (options) => renderCards(options),
    renderTopbarNotifications,
    t
  });
  const {
    handleInviteDecision,
    handleTransferDecision,
    renderInviteBanner
  } = machineAccessController;

  const dashboardData = createDashboardDataController({
    cardRefs,
    cloneMachines,
    createDashboardSubscriptions,
    createMachineAccessSync,
    fetchMachineAccess,
    getNextDashboardGroupTitle,
    getTaskTiming,
    list,
    loadOrderCache,
    normalizeDashboardLayoutBase,
    normalizeStatus,
    notifyTopbar,
    recalcHeight,
    renderCards: (options) => renderCards(options),
    renderInviteBanner,
    renderTopbarNotifications,
    scheduleHeightSync,
    state,
    statusLabels,
    t,
    updateLoading,
    upsertDashboardLayout
  });
  const {
    clearInitialGroupPriorityOrder,
    clearRebuildTimer,
    cleanupSubscriptions,
    getDashboardSubscriptions,
    getDraftById,
    getDraftIndex,
    getNextGroupTitle,
    getPendingTaskCount,
    markLocalWrite,
    normalizeDashboardLayout,
    saveDashboardLayout,
    scheduleRebuild,
    syncMachineAccessListeners
  } = dashboardData;

  const dashboardMachines = createDashboardMachineState({
    getDraftIndex,
    list,
    recalcHeight,
    state
  });
  const {
    computePrevOrder,
    isOwnerMachine,
    removeMachineFromState,
    replaceMachine,
    updateMachine,
    updateTagStatusUI
  } = dashboardMachines;

  const { createGroupSection, getGroupMenuActions } = createGroupSectionRenderer({
    canDashboardGroupHaveChildren,
    canWrapGroupWithParent,
    clearInitialGroupPriorityOrder,
    createChildGroup,
    createDashboardGroupId,
    createParentGroup,
    deleteGroup,
    getNextGroupTitle,
    locallyVisibleEmptyGroupIds,
    MAX_DASHBOARD_GROUP_DEPTH,
    normalizeDashboardLayout,
    renameGroup,
    renderCards: (options) => renderCards(options),
    saveDashboardLayout,
    state,
    t
  });

  const autoSave = createDashboardAutoSave({
    getDraftById,
    markLocalWrite,
    state,
    t,
    updateSaveState,
    updateTagStatusUI
  });

  const dashboardViewport = createDashboardViewport({
    list,
    state,
    syncSearchVisualState
  });
  const { captureViewportAnchor, restoreViewport } = dashboardViewport;
  const { renderTree: renderGroupTree } = createDashboardGroupTreeController({
    canMoveGroup: (draggedId, targetId) => canMoveGroupIntoGroup(state.dashboardLayout || {}, draggedId, targetId),
    container: groupTree,
    getGroupMenuActions,
    getPendingTaskCount,
    isTreeActive: isTreeModeActive,
    moveGroupToGroup: (draggedId, targetId) => moveGroupToTargetGroup(draggedId, targetId),
    moveGroupToRoot: (draggedGroupId) => moveGroupToRootLevel(draggedGroupId),
    moveMachineToGroup: (machineId, groupId) => moveMachineToGroup(machineId, groupId),
    normalizeStatus,
    renderCards: (options) => renderCards(options),
    state,
    t
  });
  const dashboardInternalViews = createDashboardInternalViewController({
    state,
    list,
    filterInfo,
    cardRefs,
    t,
    clearMobileDetailState,
    syncMobileDetailUI,
    rerender: (options) => renderCards(options),
    syncMachineAccessListeners,
    updateLoading,
    loadSuggestions,
    loadTodos,
    notifyTopbar,
    setInlineStatus: setDashboardInlineStatus
  });

  const {
    fetchAdminMachines,
    renderCards
  } = createDashboardRenderer({
    addUserWithRegistry,
    assertStorageAvailable,
    assignTag,
    autoSave,
    buildAddTaskAttachmentsUpdate,
    buildMachineTagUrl,
    buildStatusToggleUpdate,
    cancelMachineTransferInvite,
    captureViewportAnchor,
    cardRefs,
    clearDashboardTooltips,
    clearMobileDetailState,
    collapseCard,
    computeLocations,
    createAdminInvite,
    createGroupSection,
    createMachineCard,
    createMachineTransferInvite,
    createTagToken,
    dashboardInternalViews,
    deleteMachine,
    deleteUserRegistry,
    disconnectMachineTag,
    expandCard,
    fetchLinksForAdmin,
    fetchMachine,
    fetchMachines,
    filterInfo,
    filterMachines,
    generateMachineTagQr,
    generateSaltBase64,
    getAdminDisplayName,
    getCollapsedHeightPx,
    getCurrentLang,
    getDashboardGroupDepth,
    getDashboardInternalView,
    getDraftById,
    getPendingTaskCount,
    hasDashboardLoadError,
    hashPassword,
    installDocumentHooks,
    installTaskHooks,
    isMobileDashboardViewport,
    isLargeDashboardViewport: () => largeDashboardQuery.matches,
    isOwnerMachine,
    leaveAdminRole,
    list,
    mount,
    locallyVisibleEmptyGroupIds,
    markLocalWrite,
    normalizeDashboardLayout,
    normalizeEmail,
    normalizeLocation,
    normalizeMachine,
    normalizeStatus,
    notifyTopbar,
    openStatusIncidentModal,
    pendingStatusIncidentMachineIds,
    recalcHeight,
    refreshStorageFullState,
    removeMachineFromState,
    renderDashboardNoResultsPlaceholder,
    renderLoadErrorPlaceholder,
    renderGroupTree,
    renderPlaceholder,
    replaceMachine,
    RESTORE_OPERATION_TASK_SOURCE,
    restoreViewport,
    revokeAdminInvite,
    scheduleHeightSync,
    sortFlatMachines,
    state,
    groupTree,
    syncDashboardViewChrome,
    syncMachineAccessListeners,
    syncMobileDetailUI,
    syncSearchVisualState,
    t,
    updateLoading,
    updateMachine,
    updateRegistryBadge,
    updateSaveState,
    updateSuggestionsBadge,
    updateTodoNav,
    upsertMachine,
    upsertMachineAccessFromMachine,
    validateTag,
    viewMenu,
  });
  const dashboardOrdering = createDashboardOrderingController({
    state,
    addBtn,
    autoSave,
    clearInitialGroupPriorityOrder,
    computePrevOrder,
    getNextGroupTitle,
    isTreeSelectionActive: isTreeModeActive,
    normalizeDashboardLayout,
    renderCards,
    saveDashboardLayout,
    saveOrderCache,
    t
  });
  const {
    handleGroupedReorder,
    handleMixedItemReorder,
    moveGroupToRootLevel,
    moveGroupToTargetGroup,
    moveMachineToGroup,
    moveMachineToTargetGroup
  } = dashboardOrdering;

  const ensureGroupedDragAndDrop = () => {
    if (groupedDragAndDropReady) return;
    initGroupedDragAndDrop(list, {
      onReorder: handleGroupedReorder,
      onReorderItems: handleMixedItemReorder,
      onDropOnCard: moveMachineToTargetGroup,
      onDropMachineOnGroup: moveMachineToGroup,
      onDropGroupOnGroup: moveGroupToTargetGroup,
      canDropGroupOnGroup: (draggedGroupId, targetGroupId) =>
        canMoveGroupIntoGroup(
          state.dashboardLayout || {},
          draggedGroupId,
          targetGroupId
        ),
      allowGrouping: () =>
        state.dashboardLayout?.machineViewMode !== "flat" &&
        (
          state.dashboardLayout?.groupPresentationMode !== "tree" ||
          !largeDashboardQuery.matches
        ),
      allowReorder: () =>
        state.dashboardLayout?.groupPresentationMode !== "tree" ||
        !largeDashboardQuery.matches
    });
    groupedDragAndDropReady = true;
  };

  const { initDashboard } = createDashboardSession({
    applyDashboardTitle,
    armLoadingGuard,
    ensureAdminLink,
    ensureGroupedDragAndDrop,
    fetchAdminMachines,
    fetchDashboardLayout,
    fetchInvitesForAdmin,
    fetchLegacyMachines,
    fetchMachines,
    getDashboardSubscriptions,
    initDashboardTitleEditor,
    loadSuggestions,
    loadTodoCollaborators,
    loadTodos,
    markAdminLoadFailure,
    markAdminLoadSuccess,
    markOwnerLoadFailure,
    markOwnerLoadSuccess,
    migrateLegacyMachines,
    normalizeDashboardLayout,
    normalizeEmail,
    normalizeMachine,
    normalizeTabOrder,
    refreshStorageFullState,
    renderCards,
    resetDashboardRuntime,
    resetInitialMobileScroll,
    scheduleRebuild,
    state,
    t,
    updateLoading,
    upsertAccountDirectory,
    upsertDashboardLayout,
    withTimeout,
    getActiveDashboardUid: () => activeDashboardUid,
    getDashboardSessionVersion: () => dashboardSessionVersion
  });

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
      state.todoPage = 1;
      loadTodos({ preserveScroll: false });
      if (!state.todoCollaboratorsReady) {
        loadTodoCollaborators();
      }
    }
    renderCards({ preserveScroll: false });
  });

  largeDashboardQuery.addEventListener("change", () => {
    renderCards({ preserveScroll: true, preserveAnchor: false });
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
