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
  return items.filter((item) =>
    toTime(item.createdAt) > seenTime ||
    (item.replies || []).some((reply) => toTime(reply.createdAt) > seenTime)
  ).length;
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
      ...(item.replies || []).flatMap((reply) => [
        reply.text,
        reply.authorName,
        reply.authorEmail,
        formatDate(reply.createdAt, getLocale()),
      ]),
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
  const isSuperadmin = options.isSuperadmin === true;
  const seenAt = options.seenAt || "";
  const replyTarget = options.replyTarget || null;

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
  if (replyTarget?.suggestionId) {
    const prefix = `@${formatDate(replyTarget.createdAt, locale)} `;
    input.value = prefix;
    input.dataset.replyPrefix = prefix;
    input.classList.add("is-active-reply");
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }
  input.disabled = !canSuggest;
  const replyStatus = document.createElement("div");
  replyStatus.className = "suggestions-reply-target";
  replyStatus.hidden = !replyTarget?.suggestionId;
  if (replyTarget?.suggestionId) {
    const label = document.createElement("span");
    label.textContent = t(
      "dashboard.suggestionsReplyingTo",
      (value) => `Respondiendo a ${value}`
    )(formatDate(replyTarget.createdAt, locale));
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("card.cancel", "Cancelar");
    cancel.addEventListener("click", () => {
      if (options.onCancelReply) options.onCancelReply();
    });
    replyStatus.appendChild(label);
    replyStatus.appendChild(cancel);
  }
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save suggestions-submit";
  submit.textContent = t("dashboard.suggestionsSend", "Enviar");
  submit.disabled = !canSuggest;
  const status = document.createElement("p");
  status.className = "suggestions-status";
  status.hidden = true;
  form.appendChild(input);
  form.appendChild(replyStatus);
  form.appendChild(submit);
  form.appendChild(status);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (options.onSubmit) {
      options.onSubmit(input.value || "", {
        input,
        submit,
        status,
        replyToSuggestionId: replyTarget?.suggestionId || "",
      });
    }
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
  const appendReply = (parent, item, reply) => {
    const row = document.createElement("article");
    row.className = "suggestions-row suggestions-row-reply";
    row.classList.toggle("is-unseen", toTime(reply.createdAt) > toTime(seenAt));

    const meta = document.createElement("div");
    meta.className = "suggestions-meta";
    const time = document.createElement("time");
    time.dateTime = reply.createdAt || "";
    time.textContent = formatDate(reply.createdAt, locale);
    const author = document.createElement("span");
    author.className = "suggestions-author";
    author.textContent =
      reply.authorName || reply.authorEmail || t("dashboard.anonymousUser", "Un usuario");
    meta.appendChild(time);
    meta.appendChild(author);
    if (reply.authorEmail) {
      const email = document.createElement("span");
      email.className = "suggestions-email";
      email.textContent = reply.authorEmail;
      meta.appendChild(email);
    }

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "suggestions-message-wrap";
    const body = document.createElement("div");
    body.className = "suggestions-message";
    body.textContent = reply.text;
    bodyWrap.appendChild(body);

    row.appendChild(meta);
    row.appendChild(bodyWrap);
    parent.appendChild(row);
  };

  const createSuggestionMenu = (item) => {
    const menu = document.createElement("div");
    menu.className = "mc-doc-menu suggestions-menu";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mc-doc-menu-dots";
    toggle.setAttribute("aria-label", t("dashboard.suggestionsMenu", "Opciones"));
    toggle.textContent = "...";
    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "mc-doc-menu-link";
    replyBtn.textContent = t("dashboard.suggestionsReply", "Responder");
    replyBtn.addEventListener("click", () => {
      if (options.onReply) {
        options.onReply({
          suggestionId: item.id,
          createdAt: item.createdAt,
        });
      }
    });
    const completedBtn = document.createElement("button");
    completedBtn.type = "button";
    completedBtn.className = "mc-doc-menu-link";
    completedBtn.textContent = item.resolved
      ? t("dashboard.suggestionsReopen", "Reabrir")
      : t("dashboard.suggestionsComplete", "Completada");
    completedBtn.addEventListener("click", () => {
      if (options.onResolve) options.onResolve(item.id, !item.resolved);
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "mc-doc-menu-link mc-doc-menu-delete";
    deleteBtn.textContent = t("dashboard.suggestionsDelete", "Eliminar");
    deleteBtn.addEventListener("click", () => {
      if (options.onDelete) options.onDelete(item.id);
    });
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("is-open");
    });
    menu.appendChild(toggle);
    menu.appendChild(replyBtn);
    if (isSuperadmin) {
      menu.appendChild(completedBtn);
      menu.appendChild(deleteBtn);
    }
    return menu;
  };

  entries.slice(0, visibleCount).forEach((item) => {
    const row = document.createElement("article");
    row.className = "suggestions-row";
    row.classList.toggle("is-unseen", toTime(item.createdAt) > toTime(seenAt));
    row.classList.toggle("is-resolved", item.resolved === true);

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

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "suggestions-message-wrap";
    bodyWrap.appendChild(createSuggestionMenu(item));
    const body = document.createElement("div");
    body.className = "suggestions-message";
    body.textContent = item.text;
    bodyWrap.appendChild(body);

    row.appendChild(meta);
    row.appendChild(bodyWrap);
    list.appendChild(row);
    (item.replies || [])
      .slice()
      .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt))
      .forEach((reply) => appendReply(list, item, reply));
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
