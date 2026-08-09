export const installDashboardRouteController = ({
  getDashboardInternalView,
  largeDashboardQuery,
  loadSuggestions,
  loadTodoCollaborators,
  loadTodos,
  markRegistrySeen,
  markSuggestionsSeen,
  registryPageSize,
  renderCards,
  scrollSuggestionsViewToTop,
  state,
  suggestionsPageSize
}) => {
  window.addEventListener("hashchange", () => {
    const nextView = getDashboardInternalView();
    if (nextView === state.activeView) return;
    const previousView = state.activeView;
    state.activeView = nextView;
    if (nextView !== "dashboard") state.recentlyCreatedMachineIds = [];
    state.internalViewChromeExpanded = false;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (previousView === "registro" && nextView !== "registro") markRegistrySeen();
    if (previousView === "sugerencias" && nextView !== "sugerencias") markSuggestionsSeen();
    if (nextView === "registro") state.registryVisibleCount = registryPageSize;
    if (nextView === "sugerencias") {
      state.suggestionsVisibleCount = suggestionsPageSize;
      state.suggestionsCreateOpen = true;
      loadSuggestions({ preserveScroll: false });
      scrollSuggestionsViewToTop();
    }
    if (nextView === "todo") {
      state.todoPage = 1;
      state.todoCreateOpen = false;
      loadTodos({ preserveScroll: false });
      if (!state.todoCollaboratorsReady) loadTodoCollaborators();
    }
    renderCards({ preserveScroll: false });
    if (nextView === "sugerencias") scrollSuggestionsViewToTop();
  });

  largeDashboardQuery.addEventListener("change", () => {
    renderCards({ preserveScroll: true, preserveAnchor: false });
  });
};
