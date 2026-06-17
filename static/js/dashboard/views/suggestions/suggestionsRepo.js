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

const normalizeSuggestion = (item = {}) => ({
  id: (item.id || "").toString(),
  text: (item.text || "").toString(),
  authorUid: (item.authorUid || "").toString(),
  authorEmail: (item.authorEmail || "").toString(),
  authorName: (item.authorName || "").toString(),
  createdAt: (item.createdAt || "").toString(),
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

export const createDashboardSuggestion = async (text) => {
  const response = await createSuggestionCallable({ text });
  return response?.data || {};
};

export const markDashboardSuggestionsSeen = async () => {
  const response = await markSuggestionsSeenCallable();
  return response?.data || {};
};
