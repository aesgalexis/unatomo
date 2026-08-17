import {
  loadHiddenTreeGroupIds,
  loadShowTreeIncidentCounts,
  loadShowTreeTaskCounts,
  loadStatisticsPeriod
} from "../runtime/dashboardGroupVisibilityStorage.js";

export const createDashboardLoadController = (dependencies) => {
  const {
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
    renderCards,
    renderDashboardEmptyPlaceholder,
    renderDashboardLoadErrorPlaceholder,
    resetDashboardLoadState,
    resetLoadingProgress,
    searchInput,
    setLoadingProgress,
    setTopbarLogoLoading,
    state,
    syncDashboardViewChrome,
    t,
    viewMenu,
  } = dependencies;
  let loadingCycle = 0;
  let completingLoadingCycle = null;

  const resetDashboardRuntime = (uid) => {
    loadingCycle += 1;
    completingLoadingCycle = null;
    clearDashboardTimer();
    cleanupDashboardSubscriptions();
    state.uid = uid;
    state.remoteMachines = [];
    state.ownerMachines = [];
    state.adminMachines = [];
    state.draftMachines = [];
    state.pendingInvites = [];
    state.pendingTransferInvites = [];
    state.persistentNotifications = [];
    state.suggestions = [];
    state.suggestionsReady = false;
    state.suggestionsCreateOpen = true;
    state.suggestionReplyTarget = null;
    state.todos = [];
    state.todosReady = false;
    state.todoPage = 1;
    state.todoShowCompleted = false;
    state.todoCreateOpen = false;
    state.todoCollaborators = [];
    state.todoCollaboratorsReady = false;
    state.usersContextOwnerUid = "";
    state.expandedUsers = [];
    state.usersCreateOpen = false;
    state.usersPolicyOpen = false;
    state.expandedById = [];
    state.selectedTabById = {};
    state.configSubtabById = {};
    state.tagStatusById = {};
    state.selectedTreeGroupId = "";
    state.selectedTreeMachineId = "";
    state.recentlyCreatedMachineIds = [];
    state.expandedTreeGroupIds = [];
    state.hiddenTreeGroupIds = loadHiddenTreeGroupIds(uid);
    state.showTreeIncidentCounts = loadShowTreeIncidentCounts(uid);
    state.showTreeTaskCounts = loadShowTreeTaskCounts(uid);
    state.statisticsPeriod = loadStatisticsPeriod(uid);
    clearMobileDetailState();
    resetDashboardLoadState(state);
    setTopbarLogoLoading("dashboard", true);
    state.initialGroupPriorityOrder = {};
    state.initialGroupPriorityReady = false;
    locallyVisibleEmptyGroupIds.clear();
    cardRefs.clear();
    list.innerHTML = "";
    loadingEl.style.display = "";
    resetLoadingProgress();
    syncDashboardViewChrome();
    if (["dashboard", "registro", "galeria", "estadisticas", "todo", "usuarios", "privacidad"].includes(state.activeView)) {
      renderCards({ preserveScroll: false });
    }
  };

  const updateLoading = () => {
    const progress = getDashboardLoadProgress(state);
    const displayedProgress = setLoadingProgress(progress.percent);
    if (!progress.complete || !state.loading || completingLoadingCycle === loadingCycle) return;

    const completedCycle = loadingCycle;
    completingLoadingCycle = completedCycle;
    displayedProgress.then(() => {
      if (loadingCycle !== completedCycle || !state.loading) return;
      if (!getDashboardLoadProgress(state).complete) return;
      state.loading = false;
      setTopbarLogoLoading("dashboard", false);
      if (state.loadingGuardTimer) {
        clearTimeout(state.loadingGuardTimer);
        state.loadingGuardTimer = null;
      }
      syncDashboardViewChrome();
      renderCards({ preserveScroll: false });
      setTimeout(() => {
        if (loadingCycle === completedCycle && !state.loading) {
          loadingEl.style.display = "none";
        }
      }, 2000);
    }).finally(() => {
      if (completingLoadingCycle === completedCycle) {
        completingLoadingCycle = null;
      }
    });
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
    }, 15000);
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
        "No se pudieron cargar las máquinas."
      ),
      {
        actionLabel: t("dashboard.retryLoad", "Reintentar"),
        onAction: () => window.location.reload()
      }
    );
  };
  return {
    armLoadingGuard,
    renderLoadErrorPlaceholder,
    renderPlaceholder,
    resetDashboardRuntime,
    updateLoading
  };

};
