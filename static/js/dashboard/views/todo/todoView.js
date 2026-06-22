import { t } from "/static/js/dashboard/i18n.js";

export const TODO_PAGE_SIZE = 50;
export const MAX_TODO_LENGTH = 1024;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const formatDate = (value, locale) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
};

const getTextareaCaretPosition = (textarea) => {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  mirror.style.position = "fixed";
  mirror.style.left = "-9999px";
  mirror.style.top = "0";
  mirror.style.visibility = "hidden";
  mirror.style.boxSizing = "border-box";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  [
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "textAlign",
    "textTransform"
  ].forEach((property) => {
    mirror.style[property] = style[property];
  });
  const caret = textarea.selectionStart ?? textarea.value.length;
  mirror.textContent = textarea.value.slice(0, caret);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const position = {
    left: marker.offsetLeft - textarea.scrollLeft,
    top: marker.offsetTop - textarea.scrollTop
  };
  mirror.remove();
  return position;
};

const filterTodos = (items = [], query = "") => {
  const term = (query || "").toString().trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    [
      item.text,
      ...(item.sharedWith || []).flatMap((person) => [
        person.displayName,
        person.email,
        person.mention
      ]),
      formatDate(item.createdAt, getLocale()),
      item.completed ? "completed completada hecha done" : "pending pendiente"
    ].join(" ").toLowerCase().includes(term)
  );
};

const downloadTextFile = (content, filename) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const attachTodoTooltip = (target, extraClass = "") => {
  if (
    window.matchMedia &&
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) return;

  let tipEl = null;
  const hideTip = () => {
    tipEl?.remove();
    tipEl = null;
  };
  const showTip = () => {
    hideTip();
    const label = target.getAttribute("data-tooltip");
    if (!label) return;
    document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
    tipEl = document.createElement("div");
    tipEl.className = `mc-tooltip${extraClass ? ` ${extraClass}` : ""}`;
    tipEl.textContent = label;
    document.body.appendChild(tipEl);
    const rect = target.getBoundingClientRect();
    tipEl.style.top = `${Math.max(8, rect.top - tipEl.offsetHeight - 10)}px`;
    tipEl.style.left = `${Math.max(8, rect.right - tipEl.offsetWidth)}px`;
  };

  target.addEventListener("mouseenter", showTip);
  target.addEventListener("mouseleave", hideTip);
  target.addEventListener("focus", showTip);
  target.addEventListener("blur", hideTip);
  target.addEventListener("click", hideTip);
};

const buildTodoDownloadText = (items, locale) =>
  items.map((item) => {
    const date = formatDate(item.updatedAt || item.createdAt, locale);
    const status = item.completed
      ? t("tasks.completed", "Completada")
      : t("tasks.pending", "Pendiente");
    const text = String(item.text || "").replace(/\n/g, "\n  ");
    const people = (item.sharedWith || [])
      .map((person) => person.displayName || person.email || person.mention)
      .filter(Boolean);
    const shared = people.length
      ? ` [${t("dashboard.todoSharedWith", (names) => `Compartida con ${names}`)(people.join(", "))}]`
      : "";
    return `[${date}] [${status}]${shared} ${text}`;
  }).join("\n");

export const renderTodoView = (container, options = {}) => {
  const locale = getLocale();
  const items = Array.isArray(options.items) ? options.items : [];
  const searchedEntries = filterTodos(items, options.query || "");
  const showCompleted = options.showCompleted === true;
  const entries = showCompleted
    ? searchedEntries
    : searchedEntries.filter((item) => item.completed !== true);
  const pageCount = Math.max(1, Math.ceil(entries.length / TODO_PAGE_SIZE));
  const currentPage = Math.min(
    pageCount,
    Math.max(1, Number(options.page || 1))
  );
  const pageStart = (currentPage - 1) * TODO_PAGE_SIZE;
  const pageEntries = entries.slice(pageStart, pageStart + TODO_PAGE_SIZE);
  const canTodo = options.canTodo === true;
  const collaborators = Array.isArray(options.collaborators)
    ? options.collaborators
    : [];

  container.innerHTML = "";
  container.className = "todo-view";
  container.removeAttribute("data-has-ungrouped");

  const form = document.createElement("form");
  form.className = "todo-form";
  const composer = document.createElement("div");
  composer.className = "todo-composer";
  const chips = document.createElement("div");
  chips.className = "todo-recipient-chips";
  chips.hidden = true;
  const input = document.createElement("textarea");
  input.className = "todo-input";
  input.maxLength = MAX_TODO_LENGTH;
  input.rows = 3;
  input.placeholder = t("dashboard.todoPlaceholder", "Añadir pendiente...");
  input.disabled = !canTodo;
  const suggestions = document.createElement("div");
  suggestions.className = "todo-mention-suggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.hidden = true;
  let selectedRecipients = [];
  let visibleSuggestions = [];
  let activeSuggestionIndex = 0;

  const closeSuggestions = () => {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
    visibleSuggestions = [];
    activeSuggestionIndex = 0;
  };

  const renderChips = () => {
    chips.innerHTML = "";
    chips.hidden = selectedRecipients.length === 0;
    input.placeholder = selectedRecipients.length
      ? t(
          "dashboard.todoSharedPlaceholder",
          "Añadir pendiente compartido..."
        )
      : t("dashboard.todoPlaceholder", "Añadir pendiente...");
    selectedRecipients.forEach((person) => {
      const chip = document.createElement("span");
      chip.className = "todo-recipient-chip";
      const label = document.createElement("span");
      label.textContent = `@${person.mention}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "todo-recipient-remove";
      remove.setAttribute(
        "aria-label",
        t("dashboard.todoRemoveRecipient", "Quitar colaborador")
      );
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        selectedRecipients = selectedRecipients.filter(
          (item) => item.uid !== person.uid
        );
        renderChips();
        input.focus();
      });
      chip.appendChild(label);
      chip.appendChild(remove);
      chips.appendChild(chip);
    });
  };

  const getMentionToken = () => {
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    const start = before.lastIndexOf("@");
    if (start < 0) return null;
    const previous = start > 0 ? before[start - 1] : "";
    if (previous && /[a-z0-9._-]/i.test(previous)) return null;
    const query = before.slice(start + 1);
    if (!query || !/^[a-z0-9._-]+$/i.test(query)) return null;
    return { start, caret, query: query.toLowerCase() };
  };

  const selectRecipient = (person, token = getMentionToken()) => {
    if (!person || !token) return;
    if (!selectedRecipients.some((item) => item.uid === person.uid)) {
      selectedRecipients.push(person);
      renderChips();
    }
    input.value =
      input.value.slice(0, token.start) + input.value.slice(token.caret);
    input.setSelectionRange(token.start, token.start);
    closeSuggestions();
    input.focus();
  };

  const renderSuggestions = () => {
    const token = getMentionToken();
    if (!token) {
      closeSuggestions();
      return;
    }
    const selectedUids = new Set(selectedRecipients.map((person) => person.uid));
    const matches = collaborators
      .filter((person) => !selectedUids.has(person.uid))
      .filter((person) => (person.mention || "")
        .toLowerCase()
        .startsWith(token.query));
    if (matches.length === 1 && matches[0].mention === token.query) {
      selectRecipient(matches[0], token);
      return;
    }
    visibleSuggestions = matches.length === 1 ? matches : [];
    suggestions.innerHTML = "";
    suggestions.hidden = visibleSuggestions.length === 0;
    activeSuggestionIndex = 0;
    visibleSuggestions.forEach((person, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "todo-mention-option";
      option.classList.toggle("is-active", index === activeSuggestionIndex);
      option.setAttribute("role", "option");
      const mention = document.createElement("strong");
      mention.textContent = person.mention.slice(token.query.length);
      option.setAttribute(
        "aria-label",
        `@${person.mention} ${person.displayName || person.email || ""}`.trim()
      );
      option.appendChild(mention);
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => selectRecipient(person, token));
      suggestions.appendChild(option);
    });
    if (!suggestions.hidden) {
      const caret = getTextareaCaretPosition(input);
      const preferredLeft = input.offsetLeft + caret.left;
      const maxLeft = Math.max(
        8,
        composer.clientWidth - suggestions.offsetWidth - 8
      );
      suggestions.style.left = `${Math.max(8, Math.min(preferredLeft, maxLeft))}px`;
      suggestions.style.top = `${input.offsetTop + caret.top}px`;
    }
  };

  const refreshActiveSuggestion = () => {
    suggestions.querySelectorAll(".todo-mention-option").forEach(
      (option, index) => {
        option.classList.toggle("is-active", index === activeSuggestionIndex);
      }
    );
  };
  input.addEventListener("input", renderSuggestions);
  input.addEventListener("keydown", (event) => {
    if (!suggestions.hidden && visibleSuggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeSuggestionIndex = (
          activeSuggestionIndex + direction + visibleSuggestions.length
        ) % visibleSuggestions.length;
        refreshActiveSuggestion();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
        return;
      }
      if (
        (event.key === "Enter" && !event.shiftKey) ||
        event.key === "Tab"
      ) {
        event.preventDefault();
        selectRecipient(visibleSuggestions[activeSuggestionIndex]);
        return;
      }
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    form.requestSubmit();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(closeSuggestions, 120);
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save todo-submit";
  submit.textContent = t("dashboard.todoAdd", "Añadir");
  submit.disabled = !canTodo;
  composer.appendChild(chips);
  composer.appendChild(input);
  composer.appendChild(suggestions);
  form.appendChild(composer);
  form.appendChild(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (options.onSubmit) {
      const mentions = selectedRecipients
        .map((person) => `@${person.mention}`)
        .join(" ");
      const value = [mentions, input.value.trim()].filter(Boolean).join(" ");
      options.onSubmit(value, {
        input,
        submit,
        resetRecipients: () => {
          selectedRecipients = [];
          renderChips();
        }
      });
    }
  });
  container.appendChild(form);

  const header = document.createElement("div");
  header.className = "todo-header";
  const title = document.createElement("h3");
  title.textContent = t("dashboard.todoTitle", "To-do");
  const headerActions = document.createElement("div");
  headerActions.className = "todo-header-actions";
  const count = document.createElement("span");
  count.className = "todo-count";
  count.textContent = `${entries.length}/${searchedEntries.length}`;
  const completedToggle = document.createElement("button");
  completedToggle.type = "button";
  completedToggle.className = "todo-completed-toggle";
  const completedTooltip = showCompleted
    ? t("dashboard.todoHideCompleted", "Ocultar completados")
    : t("dashboard.todoShowCompleted", "Mostrar completados");
  completedToggle.setAttribute("aria-label", completedTooltip);
  completedToggle.setAttribute("data-tooltip", completedTooltip);
  completedToggle.setAttribute("aria-pressed", showCompleted ? "true" : "false");
  completedToggle.innerHTML = showCompleted
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a15.6 15.6 0 0 1-2 4.1M6.6 6.6A12.8 12.8 0 0 0 2 12c1 4 5 8 10 8a10.8 10.8 0 0 0 5.4-1.4"/></svg>';
  attachTodoTooltip(completedToggle);
  completedToggle.addEventListener("click", () => {
    if (options.onShowCompletedChange) {
      options.onShowCompletedChange(!showCompleted);
    }
  });

  const download = document.createElement("button");
  download.type = "button";
  download.className = "mc-log-download todo-download";
  const downloadLabel = t(
    "dashboard.todoDownload",
    "Descargar registro completo de tareas"
  );
  download.setAttribute("aria-label", downloadLabel);
  download.setAttribute("data-tooltip", downloadLabel);
  attachTodoTooltip(download, "todo-download-tooltip");
  download.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/></svg>';
  download.addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      buildTodoDownloadText(searchedEntries, locale),
      `todo_${stamp}.txt`
    );
  });

  header.appendChild(title);
  headerActions.appendChild(count);
  headerActions.appendChild(completedToggle);
  headerActions.appendChild(download);
  header.appendChild(headerActions);
  container.appendChild(header);

  if (!options.ready) {
    const loading = document.createElement("div");
    loading.className = "todo-empty";
    loading.textContent = t("dashboard.todoLoading", "Cargando lista...");
    container.appendChild(loading);
    return;
  }

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "todo-empty";
    empty.textContent = (options.query || "").trim()
      ? t("dashboard.noResults", (value) => `No results for "${value}".`)(options.query)
      : t("dashboard.todoEmpty", "Sin pendientes.");
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "todo-list";
  pageEntries.forEach((item) => {
    const row = document.createElement("article");
    row.className = "todo-row";
    row.classList.toggle("is-completed", item.completed === true);

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.completed === true;
    check.className = "todo-check";
    check.addEventListener("change", () => {
      if (options.onToggle) options.onToggle(item.id, check.checked);
    });

    const body = document.createElement("div");
    body.className = "todo-body";
    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = item.text;
    const meta = document.createElement("time");
    meta.className = "todo-meta";
    meta.dateTime = item.updatedAt || item.createdAt || "";
    meta.textContent = formatDate(item.updatedAt || item.createdAt, locale);
    body.appendChild(text);
    if (meta.textContent) body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "todo-actions";
    if (item.isShared && item.sharedWith?.length) {
      const people = item.sharedWith
        .map((person) => person.displayName || person.email || person.mention)
        .filter(Boolean);
      const tooltip = t(
        "dashboard.todoSharedWith",
        (names) => `Compartida con ${names}`
      )(people.join(", "));
      const shared = document.createElement("button");
      shared.type = "button";
      shared.className = "todo-shared";
      shared.setAttribute("aria-label", tooltip);
      shared.setAttribute("data-tooltip", tooltip);
      shared.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><circle cx="18" cy="5" r="3"/>' +
        '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49"/></svg>';
      attachTodoTooltip(shared, "todo-shared-tooltip");
      actions.appendChild(shared);
    }

    if (item.canDelete) {
      const menu = document.createElement("div");
      menu.className = "todo-item-menu";
      const menuToggle = document.createElement("button");
      menuToggle.type = "button";
      menuToggle.className = "todo-item-menu-toggle";
      menuToggle.setAttribute(
        "aria-label",
        t("general.moreOptions", "Más opciones")
      );
      menuToggle.setAttribute("aria-haspopup", "menu");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "•••";
      const menuPanel = document.createElement("div");
      menuPanel.className = "todo-item-menu-panel";
      menuPanel.setAttribute("role", "menu");
      menuPanel.hidden = true;
      const closeMenu = () => {
        menuPanel.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
      };
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "todo-item-menu-action todo-item-delete";
      remove.setAttribute("role", "menuitem");
      remove.textContent = t("dashboard.todoDelete", "Eliminar");
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        if (options.onDelete) options.onDelete(item.id, remove);
      });
      menuToggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = menuPanel.hidden;
        menuPanel.hidden = !nextOpen;
        menuToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      });
      menuToggle.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeMenu();
        menuToggle.blur();
      });
      menu.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (!menu.contains(document.activeElement)) closeMenu();
        }, 0);
      });
      menuPanel.appendChild(remove);
      menu.appendChild(menuToggle);
      menu.appendChild(menuPanel);
      actions.appendChild(menu);
    }

    row.appendChild(check);
    row.appendChild(body);
    row.appendChild(actions);
    list.appendChild(row);
  });
  container.appendChild(list);

  const pagination = document.createElement("div");
  pagination.className = "todo-pagination";
  const pageControls = document.createElement("div");
  pageControls.className = "todo-page-controls";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "todo-page-button";
  previous.disabled = currentPage <= 1;
  previous.setAttribute(
    "aria-label",
    t("dashboard.todoPreviousPage", "Página anterior")
  );
  previous.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg>';
  previous.addEventListener("click", () => {
    if (options.onPageChange) options.onPageChange(currentPage - 1);
  });
  const pageLabel = document.createElement("span");
  pageLabel.className = "todo-page-label";
  pageLabel.textContent = `${currentPage}/${pageCount}`;
  const next = document.createElement("button");
  next.type = "button";
  next.className = "todo-page-button";
  next.disabled = currentPage >= pageCount;
  next.setAttribute(
    "aria-label",
    t("dashboard.todoNextPage", "Página siguiente")
  );
  next.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" d="m9 18 6-6-6-6"/></svg>';
  next.addEventListener("click", () => {
    if (options.onPageChange) options.onPageChange(currentPage + 1);
  });
  pageControls.appendChild(previous);
  pageControls.appendChild(pageLabel);
  pageControls.appendChild(next);
  const pageNav = document.createElement("div");
  pageNav.className = "scroll-top-container todo-page-nav";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "scroll-top-button";
  back.textContent = t("dashboard.todoBack", "Volver");
  back.addEventListener("click", () => {
    if (options.onBack) options.onBack();
  });
  const top = document.createElement("button");
  top.type = "button";
  top.className = "scroll-top-button";
  top.textContent = t("dashboard.todoTop", "Arriba");
  top.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  pageNav.appendChild(back);
  pageNav.appendChild(top);
  pagination.appendChild(pageControls);
  pagination.appendChild(pageNav);
  container.appendChild(pagination);
};
