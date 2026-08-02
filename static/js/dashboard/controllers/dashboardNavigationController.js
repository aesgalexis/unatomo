import { upsertDashboardLayout } from "../firestoreRepo.js";
import { countUnseenGlobalRegistryEntries } from "../views/registry/globalRegistryModel.js";
import {
  fetchDashboardSuggestions,
  markDashboardSuggestionsSeen
} from "../views/suggestions/suggestionsRepo.js";
import { countUnseenSuggestions } from "../views/suggestions/suggestionsView.js";
import { getTaskTiming } from "../tabs/tasks/tasksTime.js";

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
    todoLink.hidden = false;
    todoLink.classList.remove("dashboard-section-link-superadmin");
    const count = (state.draftMachines || []).reduce(
      (total, machine) => total + (Array.isArray(machine?.tasks) ? machine.tasks : [])
        .filter((task) => !task?.lastCompletedAt || getTaskTiming(task).pending).length,
      0
    );
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
    state.canTodo = true;
    state.todosReady = true;
    updateTodoNav();
    if (state.activeView === "todo") {
      renderCards({ preserveScroll });
    }
  };
  const loadTodoCollaborators = async () => {
    state.todoCollaborators.splice(0, state.todoCollaborators.length);
    state.todoCollaboratorsReady = true;
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
