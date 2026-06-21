import { t } from "/static/js/dashboard/i18n.js";

export const TODO_PAGE_SIZE = 254;
export const MAX_TODO_LENGTH = 1024;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const formatDate = (value, locale) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
};

const filterTodos = (items = [], query = "") => {
  const term = (query || "").toString().trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    [
      item.text,
      formatDate(item.createdAt, getLocale()),
      item.completed ? "completed completada hecha done" : "pending pendiente"
    ].join(" ").toLowerCase().includes(term)
  );
};

export const renderTodoView = (container, options = {}) => {
  const locale = getLocale();
  const items = Array.isArray(options.items) ? options.items : [];
  const entries = filterTodos(items, options.query || "");
  const visibleCount = Math.max(
    TODO_PAGE_SIZE,
    Number(options.visibleCount || TODO_PAGE_SIZE)
  );
  const canTodo = options.canTodo === true;

  container.innerHTML = "";
  container.className = "todo-view";
  container.removeAttribute("data-has-ungrouped");

  const form = document.createElement("form");
  form.className = "todo-form";
  const input = document.createElement("textarea");
  input.className = "todo-input";
  input.maxLength = MAX_TODO_LENGTH;
  input.rows = 2;
  input.placeholder = t("dashboard.todoPlaceholder", "Añadir pendiente...");
  input.disabled = !canTodo;
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    form.requestSubmit();
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save todo-submit";
  submit.textContent = t("dashboard.todoAdd", "Añadir");
  submit.disabled = !canTodo;
  form.appendChild(input);
  form.appendChild(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (options.onSubmit) {
      options.onSubmit(input.value || "", { input, submit });
    }
  });
  container.appendChild(form);

  const header = document.createElement("div");
  header.className = "todo-header";
  const title = document.createElement("h3");
  title.textContent = t("dashboard.todoTitle", "To do");
  const count = document.createElement("span");
  count.className = "todo-count";
  count.textContent = `${Math.min(visibleCount, entries.length)}/${entries.length}`;
  header.appendChild(title);
  header.appendChild(count);
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
  entries.slice(0, visibleCount).forEach((item) => {
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

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "todo-delete";
    remove.setAttribute("aria-label", t("dashboard.todoDelete", "Eliminar"));
    remove.title = t("dashboard.todoDelete", "Eliminar");
    remove.textContent = "x";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (options.onDelete) options.onDelete(item.id, remove);
    });

    row.appendChild(check);
    row.appendChild(body);
    row.appendChild(remove);
    list.appendChild(row);
  });
  container.appendChild(list);

  if (visibleCount < entries.length) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "global-registry-load-more";
    loadMore.textContent = t("dashboard.registryLoadMore", "Cargar más");
    loadMore.addEventListener("click", () => {
      if (options.onLoadMore) options.onLoadMore();
    });
    container.appendChild(loadMore);
  }
};
