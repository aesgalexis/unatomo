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
  MACHINE_TASKS_PAGE_SIZE,
  renderMachineTasksView
} from "./machineTasks/machineTasksView.js";
import { MAX_TODO_LENGTH, TODO_PAGE_SIZE } from "./todo/todoView.js";
import { renderUsersView } from "./users/usersView.js";

export {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  MACHINE_TASKS_PAGE_SIZE,
  MAX_TODO_LENGTH,
  TODO_PAGE_SIZE
};

export const renderRegistryDashboardView = (container, machines = [], options = {}) => {
  renderGlobalRegistryView(container, machines, {
    headerContainer: options.headerContainer,
    loadingElement: options.loadingElement,
    loading: !!options.loading,
    query: options.query || "",
    seenAt: options.seenAt || "",
    visibleCount: options.visibleCount,
    onLoadMore: options.onLoadMore
  });
};

export const renderGalleryDashboardView = (container, machines = [], options = {}) => {
  renderGalleryView(container, machines, {
    headerContainer: options.headerContainer,
    loadingElement: options.loadingElement,
    loading: !!options.loading,
    query: options.query || ""
  });
};

export const renderUsersDashboardView = (container, machines = [], options = {}) => {
  renderUsersView(container, machines, options);
};

export const renderTodoDashboardView = (container, machines = [], options = {}) => {
  renderMachineTasksView(container, machines, {
    headerContainer: options.headerContainer,
    loadingElement: options.loadingElement,
    loading: !!options.loading,
    query: options.query || "",
    page: options.page,
    createOpen: !!options.createOpen,
    showCompleted: !!options.showCompleted,
    statusFilter: options.statusFilter,
    sort: options.sort,
    onPageChange: options.onPageChange,
    onShowCompletedChange: options.onShowCompletedChange,
    onCreate: options.onCreate,
    onCloseCreate: options.onCloseCreate,
    onAddTaskNote: options.onAddTaskNote,
    onAddTaskImages: options.onAddTaskImages,
    onCompleteTask: options.onCompleteTask,
    onRemoveTask: options.onRemoveTask,
    uploadMachineDocument: options.uploadMachineDocument,
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
    headerContainer: options.headerContainer,
    items: options.items || [],
    canSuggest: !!options.canSuggest,
    isSuperadmin: !!options.isSuperadmin,
    seenAt: options.seenAt || "",
    query: options.query || "",
    replyTarget: options.replyTarget || null,
    createOpen: options.createOpen !== false,
    visibleCount: options.visibleCount,
    onLoadMore: options.onLoadMore,
    onSubmit: options.onSubmit,
    onReply: options.onReply,
    onCancelReply: options.onCancelReply,
    onResolve: options.onResolve,
    onDelete: options.onDelete
  });
};
