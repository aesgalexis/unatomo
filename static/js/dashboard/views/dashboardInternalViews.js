import { t } from "../i18n.js";
import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  renderGlobalRegistryView
} from "./registry/globalRegistryView.js";
import {
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  renderSuggestionsView
} from "./suggestions/suggestionsView.js";

export {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  SUGGESTIONS_PAGE_SIZE
};

export const renderRegistryDashboardView = (container, machines = [], options = {}) => {
  renderGlobalRegistryView(container, machines, {
    query: options.query || "",
    seenAt: options.seenAt || "",
    visibleCount: options.visibleCount,
    onLoadMore: options.onLoadMore
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
