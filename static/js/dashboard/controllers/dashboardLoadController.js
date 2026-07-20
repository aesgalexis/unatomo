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
    state,
    syncDashboardViewChrome,
    t,
    viewMenu,
  } = dependencies;
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
    state.todoPage = 1;
    state.todoShowCompleted = false;
    state.todoCollaborators = [];
    state.todoCollaboratorsReady = false;
    state.expandedById = [];
    state.selectedTabById = {};
    state.configSubtabById = {};
    state.tagStatusById = {};
    state.selectedTreeGroupId = "";
    state.expandedTreeGroupIds = [];
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
  return {
    armLoadingGuard,
    renderLoadErrorPlaceholder,
    renderPlaceholder,
    resetDashboardRuntime,
    updateLoading
  };

};
