import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  MAX_TODO_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  renderRegistryDashboardView,
  renderGalleryDashboardView,
  renderSuggestionsDashboardView,
  renderTodoDashboardView
} from "../views/dashboardInternalViews.js";
import {
  createDashboardSuggestion,
  deleteDashboardSuggestion,
  updateDashboardSuggestionResolved
} from "../views/suggestions/suggestionsRepo.js";
import {
  createDashboardTodo,
  deleteDashboardTodo,
  updateDashboardTodo
} from "../views/todo/todoRepo.js";

export const createDashboardInternalViewController = ({
  state,
  list,
  filterInfo,
  cardRefs,
  t,
  clearMobileDetailState,
  syncMobileDetailUI,
  rerender,
  syncMachineAccessListeners,
  updateLoading,
  loadSuggestions,
  loadTodos,
  notifyTopbar,
  setInlineStatus
}) => {
  const finish = () => {
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) updateLoading();
    return true;
  };
  const prepare = () => {
    clearMobileDetailState();
    syncMobileDetailUI();
    filterInfo.textContent = "";
    filterInfo.style.display = "none";
    cardRefs.clear();
  };
  const renderRegistry = (machines) => {
    prepare();
    renderRegistryDashboardView(list, machines, {
      query: state.searchQuery,
      seenAt: state.dashboardLayout?.registrySeenAt || "",
      visibleCount: state.registryVisibleCount,
      onLoadMore: () => {
        state.registryVisibleCount += GLOBAL_REGISTRY_PAGE_SIZE;
        rerender({ preserveScroll: true });
      }
    });
    return finish();
  };
  const renderGallery = (machines) => {
    prepare();
    renderGalleryDashboardView(list, machines, {
      query: state.searchQuery
    });
    return finish();
  };
  const renderSuggestions = () => {
    prepare();
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
        rerender({ preserveScroll: true });
      },
      onReply: (target) => {
        state.suggestionReplyTarget = target || null;
        rerender({ preserveScroll: true });
      },
      onCancelReply: () => {
        state.suggestionReplyTarget = null;
        rerender({ preserveScroll: true });
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
        if (prefix && textValue.startsWith(prefix)) textValue = textValue.slice(prefix.length);
        textValue = textValue.trim();
        const replyToSuggestionId = controls.replyToSuggestionId || "";
        const expectedReplyId = state.suggestionReplyTarget?.suggestionId || "";
        const status = controls.status;
        if (!textValue) return;
        if (expectedReplyId && !replyToSuggestionId) {
          if (status) {
            status.hidden = false;
            status.textContent = t("dashboard.suggestionsError", "No se pudo enviar la sugerencia");
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
          await createDashboardSuggestion(textValue.slice(0, MAX_SUGGESTION_LENGTH), {
            replyToSuggestionId
          });
          state.suggestionReplyTarget = null;
          if (controls.input) controls.input.value = "";
          if (status) status.textContent = t("dashboard.suggestionsSent", "Sugerencia enviada");
          await loadSuggestions({ preserveScroll: true });
        } catch {
          if (status) {
            status.textContent = t("dashboard.suggestionsError", "No se pudo enviar la sugerencia");
            status.dataset.state = "error";
          }
        } finally {
          if (controls.input) controls.input.disabled = false;
          if (controls.submit) controls.submit.disabled = false;
        }
      }
    });
    return finish();
  };
  const renderTodo = () => {
    prepare();
    renderTodoDashboardView(list, {
      items: state.todos,
      ready: state.todosReady,
      canTodo: state.canTodo || state.isSuperadmin,
      collaborators: state.todoCollaborators,
      query: state.searchQuery,
      page: state.todoPage,
      showCompleted: state.todoShowCompleted,
      onPageChange: (page) => {
        state.todoPage = page;
        rerender({ preserveScroll: true });
      },
      onShowCompletedChange: (showCompleted) => {
        state.todoShowCompleted = showCompleted;
        state.todoPage = 1;
        rerender({ preserveScroll: true });
      },
      onBack: () => { window.location.hash = "#/dashboard"; },
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
        setInlineStatus(t("dashboard.todoDeleting", "Eliminando..."));
        try {
          await deleteDashboardTodo(todoId);
          state.todos = (state.todos || []).filter((item) => item.id !== todoId);
          setInlineStatus(t("dashboard.todoDeleted", "Pendiente eliminado"), "ok");
          rerender({ preserveScroll: true });
          await loadTodos({ preserveScroll: true });
        } catch {
          if (button) button.disabled = false;
          setInlineStatus(t("dashboard.todoDeleteError", "No se pudo eliminar"), "error");
        }
      },
      onSubmit: async (rawText, controls = {}) => {
        const textValue = (rawText || "").toString().trim();
        if (!textValue) return;
        if (controls.input) controls.input.disabled = true;
        if (controls.submit) controls.submit.disabled = true;
        setInlineStatus(t("dashboard.todoSaving", "Guardando..."));
        try {
          await createDashboardTodo(textValue.slice(0, MAX_TODO_LENGTH));
          if (controls.input) controls.input.value = "";
          controls.resetRecipients?.();
          setInlineStatus(t("dashboard.todoSaved", "Pendiente añadido"), "ok");
          await loadTodos({ preserveScroll: true });
        } catch (error) {
          const reason = `${error?.code || ""} ${error?.message || ""}`;
          const message = reason.includes("todo-mention-not-found")
            ? t("dashboard.todoMentionNotFound", "No existe un usuario To Do con esa mención")
            : reason.includes("todo-mention-ambiguous")
              ? t("dashboard.todoMentionAmbiguous", "Esa mención corresponde a más de una cuenta")
              : reason.includes("todo-recipient-disabled")
                ? t("dashboard.todoRecipientDisabled", "Ese usuario no es colaborador")
                : t("dashboard.todoError", "No se pudo guardar");
          setInlineStatus(message, "error");
        } finally {
          if (controls.input) controls.input.disabled = false;
          if (controls.submit) controls.submit.disabled = false;
        }
      }
    });
    return finish();
  };

  const render = (view, machines) => {
    if (view === "sugerencias" && !state.canSuggest && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return true;
    }
    if (view === "todo" && !state.canTodo && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return true;
    }
    if (view === "registro") return renderRegistry(machines);
    if (view === "galeria") return renderGallery(machines);
    if (view === "sugerencias") return renderSuggestions();
    if (view === "todo") return renderTodo();
    return false;
  };

  return { render };
};
