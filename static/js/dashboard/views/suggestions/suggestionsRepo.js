import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createSuggestionCallable = httpsCallable(
  functions,
  "createDashboardSuggestion"
);
const listSuggestionsCallable = httpsCallable(
  functions,
  "listDashboardSuggestions"
);
const markSuggestionsSeenCallable = httpsCallable(
  functions,
  "markDashboardSuggestionsSeen"
);
const updateSuggestionResolvedCallable = httpsCallable(
  functions,
  "updateDashboardSuggestionResolved"
);
const deleteSuggestionCallable = httpsCallable(
  functions,
  "deleteDashboardSuggestion"
);

const normalizeReply = (item = {}) => ({
  id: (item.id || "").toString(),
  text: (item.text || "").toString(),
  authorUid: (item.authorUid || "").toString(),
  authorEmail: (item.authorEmail || "").toString(),
  authorName: (item.authorName || "").toString(),
  createdAt: (item.createdAt || "").toString(),
});

const normalizeSuggestion = (item = {}) => ({
  id: (item.id || "").toString(),
  text: (item.text || "").toString(),
  authorUid: (item.authorUid || "").toString(),
  authorEmail: (item.authorEmail || "").toString(),
  authorName: (item.authorName || "").toString(),
  createdAt: (item.createdAt || "").toString(),
  lastActivityAt: (item.lastActivityAt || item.createdAt || "").toString(),
  resolved: item.resolved === true,
  resolvedAt: (item.resolvedAt || "").toString(),
  resolvedByUid: (item.resolvedByUid || "").toString(),
  replies: Array.isArray(item.replies)
    ? item.replies.map(normalizeReply).filter((reply) => reply.id)
    : [],
});

export const fetchDashboardSuggestions = async (limit = 254) => {
  const response = await listSuggestionsCallable({ limit });
  const data = response?.data || {};
  return {
    canSuggest: data.canSuggest === true,
    isSuperadmin: data.isSuperadmin === true,
    suggestionsSeenAt: (data.suggestionsSeenAt || "").toString(),
    items: Array.isArray(data.items)
      ? data.items.map(normalizeSuggestion).filter((item) => item.id)
      : [],
  };
};

export const createDashboardSuggestion = async (text, options = {}) => {
  const payload = { text };
  if (options.replyToSuggestionId) {
    payload.replyToSuggestionId = options.replyToSuggestionId;
  }
  const response = await createSuggestionCallable(payload);
  return response?.data || {};
};

export const markDashboardSuggestionsSeen = async () => {
  const response = await markSuggestionsSeenCallable();
  return response?.data || {};
};

export const updateDashboardSuggestionResolved = async (suggestionId, resolved) => {
  const response = await updateSuggestionResolvedCallable({
    suggestionId,
    resolved: resolved === true,
  });
  return response?.data || {};
};

export const deleteDashboardSuggestion = async (suggestionId) => {
  const response = await deleteSuggestionCallable({ suggestionId });
  return response?.data || {};
};
