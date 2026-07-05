import { t } from "../i18n.js";
import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  renderGlobalRegistryView
} from "./registry/globalRegistryView.js";
import { renderGalleryView } from "./gallery/galleryView.js";
import {
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  renderSuggestionsView
} from "./suggestions/suggestionsView.js";
import {
  MAX_TODO_LENGTH,
  TODO_PAGE_SIZE,
  renderTodoView
} from "./todo/todoView.js";

export {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  MAX_TODO_LENGTH,
  TODO_PAGE_SIZE
};

export const renderRegistryDashboardView = (container, machines = [], options = {}) => {
  renderGlobalRegistryView(container, machines, {
    query: options.query || "",
    seenAt: options.seenAt || "",
    visibleCount: options.visibleCount,
    onLoadMore: options.onLoadMore
  });
};

export const renderGalleryDashboardView = (container, machines = [], options = {}) => {
  renderGalleryView(container, machines, {
    query: options.query || ""
  });
};

export const renderTodoDashboardView = (container, options = {}) => {
  renderTodoView(container, {
    items: options.items || [],
    ready: !!options.ready,
    canTodo: !!options.canTodo,
    collaborators: options.collaborators || [],
    query: options.query || "",
    page: options.page,
    showCompleted: !!options.showCompleted,
    onPageChange: options.onPageChange,
    onShowCompletedChange: options.onShowCompletedChange,
    onBack: options.onBack,
    onSubmit: options.onSubmit,
    onToggle: options.onToggle,
    onDelete: options.onDelete
  });
};

export const renderSuggestionsDashboardView = (container, options = {}) => {
  if (!options.ready) {
    const loading = document.createElement("div");
    loading.className = "suggestions-empty";
    loading.textContent = t("dashboard.suggestionsLoading", "Cargando sugerencias...");
    container.appendChild(loading);
    return;
  }

  renderSuggestionsView(container, {
    items: options.items || [],
    canSuggest: !!options.canSuggest,
    isSuperadmin: !!options.isSuperadmin,
    seenAt: options.seenAt || "",
    query: options.query || "",
    replyTarget: options.replyTarget || null,
    visibleCount: options.visibleCount,
    onLoadMore: options.onLoadMore,
    onSubmit: options.onSubmit,
    onReply: options.onReply,
    onCancelReply: options.onCancelReply,
    onResolve: options.onResolve,
    onDelete: options.onDelete
  });
};
