import { t } from "/static/js/dashboard/i18n.js";

export const SUGGESTIONS_PAGE_SIZE = 254;
export const MAX_SUGGESTION_LENGTH = 1024;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const formatDate = (value, locale) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
};

export const countUnseenSuggestions = (items = [], seenAt = "") => {
  const seenTime = toTime(seenAt);
  return items.filter((item) => toTime(item.createdAt) > seenTime).length;
};

const filterSuggestions = (items = [], query = "") => {
  const term = (query || "").toString().trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => {
    const haystack = [
      item.text,
      item.authorName,
      item.authorEmail,
      formatDate(item.createdAt, getLocale()),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
};

export const renderSuggestionsView = (container, options = {}) => {
  const locale = getLocale();
  const items = Array.isArray(options.items) ? options.items : [];
  const query = (options.query || "").toString().trim();
  const entries = filterSuggestions(items, query);
  const visibleCount = Math.max(
    SUGGESTIONS_PAGE_SIZE,
    Number(options.visibleCount || SUGGESTIONS_PAGE_SIZE)
  );
  const canSuggest = options.canSuggest === true;
  const seenAt = options.seenAt || "";

  container.innerHTML = "";
  container.className = "suggestions-view";
  container.removeAttribute("data-has-ungrouped");

  const form = document.createElement("form");
  form.className = "suggestions-form";
  const input = document.createElement("textarea");
  input.className = "suggestions-input";
  input.maxLength = MAX_SUGGESTION_LENGTH;
  input.rows = 3;
  input.placeholder = t(
    "dashboard.suggestionsPlaceholder",
    "Escribe una sugerencia..."
  );
  input.disabled = !canSuggest;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save suggestions-submit";
  submit.textContent = t("dashboard.suggestionsSend", "Enviar");
  submit.disabled = !canSuggest;
  const status = document.createElement("p");
  status.className = "suggestions-status";
  status.hidden = true;
  form.appendChild(input);
  form.appendChild(submit);
  form.appendChild(status);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (options.onSubmit) options.onSubmit(input.value || "", { input, submit, status });
  });
  container.appendChild(form);

  const header = document.createElement("div");
  header.className = "suggestions-header";
  const title = document.createElement("h3");
  title.textContent = t("dashboard.suggestionsTitle", "Sugerencias");
  const count = document.createElement("span");
  count.className = "suggestions-count";
  count.textContent = `${Math.min(visibleCount, entries.length)}/${entries.length}`;
  header.appendChild(title);
  header.appendChild(count);
  container.appendChild(header);

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "suggestions-empty";
    empty.textContent = query
      ? t("dashboard.noResults", (value) => `No results for "${value}".`)(query)
      : t("dashboard.suggestionsEmpty", "Sin sugerencias.");
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "suggestions-list";
  entries.slice(0, visibleCount).forEach((item) => {
    const row = document.createElement("article");
    row.className = "suggestions-row";
    row.classList.toggle("is-unseen", toTime(item.createdAt) > toTime(seenAt));

    const meta = document.createElement("div");
    meta.className = "suggestions-meta";
    const time = document.createElement("time");
    time.dateTime = item.createdAt || "";
    time.textContent = formatDate(item.createdAt, locale);
    const author = document.createElement("span");
    author.className = "suggestions-author";
    author.textContent =
      item.authorName || item.authorEmail || t("dashboard.anonymousUser", "Un usuario");
    const email = document.createElement("span");
    email.className = "suggestions-email";
    email.textContent = item.authorEmail || "";
    meta.appendChild(time);
    meta.appendChild(author);
    if (item.authorEmail) meta.appendChild(email);

    const body = document.createElement("div");
    body.className = "suggestions-message";
    body.textContent = item.text;

    row.appendChild(meta);
    row.appendChild(body);
    list.appendChild(row);
  });
  container.appendChild(list);

  if (visibleCount < entries.length) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "global-registry-load-more";
    loadMore.textContent = t("dashboard.registryLoadMore", "Cargar mas");
    loadMore.addEventListener("click", () => {
      if (options.onLoadMore) options.onLoadMore();
    });
    container.appendChild(loadMore);
  }
};
