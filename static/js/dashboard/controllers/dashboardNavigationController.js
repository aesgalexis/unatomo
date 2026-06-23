import { upsertDashboardLayout } from "../firestoreRepo.js";
import { countUnseenGlobalRegistryEntries } from "../views/registry/globalRegistryModel.js";
import {
  fetchDashboardSuggestions,
  markDashboardSuggestionsSeen
} from "../views/suggestions/suggestionsRepo.js";
import { countUnseenSuggestions } from "../views/suggestions/suggestionsView.js";
import {
  fetchDashboardTodoCollaborators,
  fetchDashboardTodos
} from "../views/todo/todoRepo.js";

export const createDashboardNavigationController = ({
  state,
  normalizeDashboardLayout,
  notifyTopbar,
  registryBadge,
  registryLink,
  renderCards,
  suggestionsBadge,
  suggestionsLink,
  t,
  todoBadge,
  todoLink
}) => {
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
  const loadTodoCollaborators = async () => {
    if (!state.canTodo && !state.isSuperadmin) return;
    try {
      const collaborators = await fetchDashboardTodoCollaborators();
      state.todoCollaborators.splice(
        0,
        state.todoCollaborators.length,
        ...collaborators
      );
    } catch {
      state.todoCollaborators.splice(0, state.todoCollaborators.length);
    } finally {
      state.todoCollaboratorsReady = true;
    }
  };
  return {
    loadSuggestions,
    loadTodoCollaborators,
    loadTodos,
    markRegistrySeen,
    markSuggestionsSeen,
    updateRegistryBadge,
    updateSuggestionsBadge,
    updateTodoNav
  };
};

