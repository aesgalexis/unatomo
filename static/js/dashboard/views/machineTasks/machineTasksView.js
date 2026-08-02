import { t } from "/static/js/dashboard/i18n.js";
import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";
import { createDownloadMenu } from "/static/js/dashboard/components/downloadMenu/downloadMenu.js";
import { downloadHistoryRows } from "/static/js/dashboard/history/historyExport.js";

export const MACHINE_TASKS_PAGE_SIZE = 50;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");
const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString(getLocale()) : "";
};

const createTaskActionsMenu = ({ machine, task, forms, options }) => {
  const menu = document.createElement("span");
  menu.className = "todo-item-menu machine-task-item-menu";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "todo-item-menu-toggle";
  toggle.setAttribute("aria-label", t("general.moreOptions", "Más opciones"));
  toggle.setAttribute("aria-haspopup", "menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="3" cy="8" r="1.35"/><circle cx="8" cy="8" r="1.35"/><circle cx="13" cy="8" r="1.35"/></svg>';
  const panel = document.createElement("div");
  panel.className = "todo-item-menu-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;
  let documentClickHandler = null;
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (documentClickHandler) {
      document.removeEventListener("click", documentClickHandler, true);
      documentClickHandler = null;
    }
  };
  const open = () => {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    documentClickHandler = (event) => {
      if (!menu.contains(event.target)) close();
    };
    document.addEventListener("click", documentClickHandler, true);
  };
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel.hidden) open();
    else close();
  });
  const action = (label, handler, className = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `todo-item-menu-action ${className}`.trim();
    button.setAttribute("role", "menuitem");
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      close();
      handler();
    });
    panel.appendChild(button);
  };
  action(t("tasks.addNote", "Añadir nota"), () => {
    forms.replaceChildren();
    const form = document.createElement("div");
    form.className = "machine-task-inline-form";
    const textarea = document.createElement("textarea");
    textarea.className = "machine-task-inline-input";
    textarea.maxLength = 512;
    textarea.placeholder = t("tasks.note", "Nota");
    const save = document.createElement("button");
    save.type = "button";
    save.className = "todo-item-menu-action";
    save.textContent = t("general.save", "Guardar");
    save.addEventListener("click", async (event) => {
      event.stopPropagation();
      const text = textarea.value.trim();
      if (!text) return;
      save.disabled = true;
      await options.onAddTaskNote?.(machine.id, task.id, text);
    });
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "todo-item-menu-action";
    cancel.textContent = t("card.cancel", "Cancelar");
    cancel.addEventListener("click", (event) => {
      event.stopPropagation();
      forms.replaceChildren();
    });
    form.append(textarea, save, cancel);
    forms.appendChild(form);
    textarea.focus();
  });
  action(t("tasks.addImages", "Añadir imágenes"), () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = true;
    input.hidden = true;
    input.addEventListener("change", () => {
      const files = Array.from(input.files || []).slice(0, 10);
      input.remove();
      if (files.length) options.onAddTaskImages?.(machine.id, task.id, files);
    });
    document.body.appendChild(input);
    input.click();
  });
  action(t("tasks.markCompleted", "Marcar como completada"), () => {
    options.onCompleteTask?.(machine.id, task.id);
  });
  action(t("tasks.deleteTask", "Eliminar tarea"), () => {
    options.onRemoveTask?.(machine.id, task.id);
  }, "todo-item-delete");
  menu.append(toggle, panel);
  return menu;
};

const attachTooltip = (target) => {
  let tooltip = null;
  const hide = () => {
    tooltip?.remove();
    tooltip = null;
  };
  const show = () => {
    hide();
    const label = target.getAttribute("data-tooltip");
    if (!label) return;
    document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
    tooltip = document.createElement("div");
    tooltip.className = "mc-tooltip";
    tooltip.textContent = label;
    document.body.appendChild(tooltip);
    const rect = target.getBoundingClientRect();
    tooltip.style.top = `${Math.max(8, rect.top - tooltip.offsetHeight - 8)}px`;
    const centeredLeft = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
    tooltip.style.left = `${Math.max(8, Math.min(centeredLeft, window.innerWidth - tooltip.offsetWidth - 8))}px`;
  };
  target.addEventListener("mouseenter", show);
  target.addEventListener("mouseleave", hide);
  target.addEventListener("focus", show);
  target.addEventListener("blur", hide);
  target.addEventListener("click", hide);
};

const machineLabel = (machine) =>
  String(machine?.title || machine?.name || machine?.machineName || machine?.id || "").trim();

const isActiveTaskPending = (task, timing = getTaskTiming(task)) =>
  !task?.lastCompletedAt || timing.pending;

const flattenTasks = (machines = []) => machines.flatMap((machine) => {
  const pending = (Array.isArray(machine?.tasks) ? machine.tasks : [])
    .map((task) => ({ machine, task, timing: getTaskTiming(task), completed: false }))
    .filter((entry) => isActiveTaskPending(entry.task, entry.timing));
  const logs = Array.isArray(machine?.logs) ? machine.logs : [];
  const completed = logs
    .filter((log) => log?.type === "task")
    .map((log, index) => ({
      machine,
      completed: true,
      completionIndex: index,
      task: {
        id: log.taskId || `completed_${index}`,
        title: log.title || t("tasks.task", "Tarea"),
        description: log.description || "",
        assignedTo: log.assignedTo || null,
        createdAt: log.ts || "",
        lastCompletedAt: log.ts || "",
        notes: logs
          .filter((item) => item?.taskId === log.taskId && item?.type === "task_note_added")
          .map((item, noteIndex) => ({
            id: item.id || `completed_note_${index}_${noteIndex}`,
            text: item.note || "",
            createdAt: item.ts || "",
            createdBy: item.user || null
          }))
          .filter((note) => note.text),
        attachments: logs
          .filter((item) => item?.taskId === log.taskId && item?.type === "task_attachment_added")
          .map((item, attachmentIndex) => ({
            id: item.attachmentId || item.documentId || `completed_attachment_${index}_${attachmentIndex}`,
            name: item.attachmentName || t("tasks.image", "Imagen"),
            url: item.attachmentUrl || "",
            contentType: item.contentType || "",
            uploadedAt: item.ts || ""
          }))
          .filter((attachment) => attachment.url)
      },
      timing: { pending: false, nextDue: new Date(log.ts || 0).getTime(), label: "" }
    }));
  return [...pending, ...completed];
});

const matchesQuery = (entry, query) => {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  const { machine, task, timing, completed } = entry;
  return [
    task?.title,
    task?.description,
    ...(Array.isArray(task?.notes) ? task.notes.map((note) => note?.text) : []),
    ...(Array.isArray(task?.attachments) ? task.attachments.map((attachment) => attachment?.name) : []),
    task?.assignedTo?.username,
    timing?.label,
    completed ? "completed completada" : "pending pendiente",
    machineLabel(machine),
    machine?.location,
    machine?.ownerEmail,
    machine?.adminEmail,
    task?.source === "status-out-of-service" ? "reactivation reactivación" : "normal"
  ].join(" ").toLowerCase().includes(term);
};

const getTaskRelatedItems = (task = {}) => [
  ...(Array.isArray(task.notes) ? task.notes : []).map((note) => ({
    type: "note",
    time: note.createdAt || "",
    text: note.text || "",
    user: note.createdBy?.username || note.createdBy || ""
  })),
  ...(Array.isArray(task.attachments) ? task.attachments : []).map((attachment) => ({
    type: "attachment",
    time: attachment.uploadedAt || attachment.createdAt || "",
    name: attachment.name || t("tasks.image", "Imagen"),
    url: attachment.url || "",
    contentType: attachment.contentType || "",
    user: attachment.uploadedBy?.username || attachment.uploadedBy || ""
  }))
].filter((item) => item.type === "note" ? item.text : item.url)
  .sort((left, right) => toTime(left.time) - toTime(right.time));

const appendTaskRelatedRows = (list, entry) => {
  getTaskRelatedItems(entry.task).forEach((related) => {
    const row = document.createElement("article");
    row.className = "global-registry-row global-registry-row-note machine-task-related-row";
    const meta = document.createElement("div");
    meta.className = "global-registry-meta";
    const time = document.createElement("time");
    time.className = "global-registry-time";
    time.dateTime = related.time || "";
    time.textContent = formatDate(related.time);
    meta.appendChild(time);
    if (related.user) {
      const user = document.createElement("span");
      user.textContent = related.user;
      meta.appendChild(user);
    }
    const body = document.createElement("div");
    body.className = "global-registry-message";
    if (related.type === "attachment") {
      body.append(`${t("history.imageAdded", "Imagen añadida")}: `);
      const link = document.createElement("a");
      link.className = "global-registry-attachment-link";
      link.href = related.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = related.name;
      body.appendChild(link);
    } else {
      body.textContent = `${t("tasks.note", "Nota")}: ${related.text}`;
    }
    row.append(meta, body);
    list.appendChild(row);
  });
};

const taskSortTime = (entry, includeRelated = false) => {
  const values = [entry.task?.createdAt, entry.task?.lastCompletedAt];
  if (includeRelated) {
    getTaskRelatedItems(entry.task).forEach((item) => values.push(item.time));
  }
  return values.reduce((max, value) => Math.max(max, toTime(value)), 0);
};

/* Legacy advanced filter menu removed from the task UI; filtering now uses the dashboard view menu.
const createTaskFilterMenu = ({
  entries,
  filters,
  statusFilter,
  sort,
  showCompleted,
  onFiltersChange,
  onStatusFilterChange,
  onSortChange,
  onResetFilters
}) => {
  const wrapper = document.createElement("div");
  wrapper.className = "todo-filter-menu";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn-order todo-filter-toggle";
  const filterLabel = t("dashboard.todoFilter", "Filtrar y ordenar");
  toggle.setAttribute("aria-label", filterLabel);
  toggle.setAttribute("data-tooltip", filterLabel);
  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="13" cy="18" r="1.5" fill="currentColor"/></svg>';
  attachTooltip(toggle);
  const panel = document.createElement("div");
  panel.className = "todo-filter-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", filterLabel);
  const current = normalizeTaskFilters(filters);
  const currentStatus = ["visible", "pending", "completed", "all"].includes(statusFilter)
    ? statusFilter
    : "visible";

  const uniqueOptions = (items) => Array.from(new Map(items.map((item) => [item.value, item])).values())
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
  const machineOptions = uniqueOptions(entries.map(({ machine }) => ({
    value: String(machine.id || ""),
    label: machineLabel(machine)
  })).filter((item) => item.value));
  const assigneeOptions = uniqueOptions(entries.map(({ task }) => ({
    value: taskAssigneeKey(task),
    label: task.assignedTo?.username || ""
  })).filter((item) => item.value));
  const frequencyOptions = uniqueOptions(entries.map(({ task }) => ({
    value: task.frequency || "puntual",
    label: (() => {
      const frequency = COMMAND_FREQUENCIES.find(([value]) => value === (task.frequency || "puntual"));
      return frequency ? t(`tasks.${frequency[1]}`, frequency[2]) : task.frequency || "puntual";
    })()
  })));
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", outsideClick, true);
  };
  const outsideClick = (event) => {
    if (!wrapper.contains(event.target)) close();
  };
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    if (!panel.hidden) document.addEventListener("click", outsideClick, true);
    else document.removeEventListener("click", outsideClick, true);
  });
  const field = (labelText, control) => {
    const wrap = document.createElement("label");
    wrap.className = "todo-filter-field";
    const label = document.createElement("span");
    label.textContent = labelText;
    wrap.append(label, control);
    return wrap;
  };
  const select = ({ values, multiple = false, size = 1 }) => {
    const control = document.createElement("select");
    control.className = "todo-filter-select";
    control.multiple = multiple;
    if (multiple) control.size = Math.min(size, Math.max(2, values.length));
    values.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      control.appendChild(option);
    });
    return control;
  };
  const statusSelect = select({
    values: [
      ["visible", t("dashboard.todoStatusVisible", "Según el ojo")],
      ["pending", t("dashboard.todoStatusPending", "Pendientes")],
      ["completed", t("dashboard.todoStatusCompleted", "Completadas")],
      ["all", t("dashboard.todoStatusAll", "Todas")]
    ].map(([value, label]) => ({ value, label }))
  });
  statusSelect.value = currentStatus;
  statusSelect.addEventListener("change", () => onStatusFilterChange?.(statusSelect.value));
  panel.appendChild(field(t("dashboard.todoStatus", "Estado"), statusSelect));

  const sortSelect = select({
    values: [
      ["created-desc", "todoSortNewest"],
      ["created-asc", "todoSortOldest"],
      ["due-asc", "todoSortDue"],
      ["machine-asc", "todoSortMachine"],
      ["title-asc", "todoSortTitle"],
      ["updated-desc", "todoSortUpdated"]
    ].map(([value, key]) => ({ value, label: t(`dashboard.${key}`, value) }))
  });
  sortSelect.value = sort || "created-desc";
  sortSelect.addEventListener("change", () => onSortChange?.(sortSelect.value));
  panel.appendChild(field(t("dashboard.todoSort", "Ordenar por"), sortSelect));

  const updateMulti = (key, control) => {
    const next = { ...current, [key]: Array.from(control.selectedOptions).map((option) => option.value) };
    onFiltersChange?.(next);
  };
  const machineSelect = select({ values: machineOptions, multiple: true, size: 5 });
  current.machineIds.forEach((value) => {
    const option = Array.from(machineSelect.options).find((item) => item.value === value);
    if (option) option.selected = true;
  });
  machineSelect.addEventListener("change", () => updateMulti("machineIds", machineSelect));
  panel.appendChild(field(t("dashboard.todoMachineFilter", "Equipo"), machineSelect));
  const assigneeSelect = select({ values: assigneeOptions, multiple: true, size: 4 });
  current.assignees.forEach((value) => {
    const option = Array.from(assigneeSelect.options).find((item) => item.value === value);
    if (option) option.selected = true;
  });
  assigneeSelect.addEventListener("change", () => updateMulti("assignees", assigneeSelect));
  panel.appendChild(field(t("dashboard.todoAssigneeFilter", "Asignación"), assigneeSelect));
  const frequencySelect = select({ values: frequencyOptions, multiple: true, size: 4 });
  current.frequencies.forEach((value) => {
    const option = Array.from(frequencySelect.options).find((item) => item.value === value);
    if (option) option.selected = true;
  });
  frequencySelect.addEventListener("change", () => updateMulti("frequencies", frequencySelect));
  panel.appendChild(field(t("dashboard.todoFrequencyFilter", "Frecuencia"), frequencySelect));
  const sourceSelect = select({
    values: [
      ["all", "todoSourceAll"],
      ["normal", "todoSourceNormal"],
      ["restore", "todoSourceRestore"]
    ].map(([value, key]) => ({ value, label: t(`dashboard.${key}`, value) }))
  });
  sourceSelect.value = current.source;
  sourceSelect.addEventListener("change", () => onFiltersChange?.({ ...current, source: sourceSelect.value }));
  panel.appendChild(field(t("dashboard.todoSourceFilter", "Tipo"), sourceSelect));
  const content = document.createElement("fieldset");
  content.className = "todo-filter-checks";
  const legend = document.createElement("legend");
  legend.textContent = t("dashboard.todoContentFilter", "Contenido");
  content.appendChild(legend);
  [["hasNotes", "todoWithNotes"], ["hasAttachments", "todoWithAttachments"]].forEach(([key, labelKey]) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = current[key];
    checkbox.addEventListener("change", () => onFiltersChange?.({ ...current, [key]: checkbox.checked }));
    label.append(checkbox, t(`dashboard.${labelKey}`, labelKey));
    content.appendChild(label);
  });
  panel.appendChild(content);
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "todo-filter-clear";
  clear.textContent = t("dashboard.todoClearFilters", "Limpiar filtros");
  clear.addEventListener("click", () => {
    if (onResetFilters) onResetFilters();
    else {
      onFiltersChange?.({ ...DEFAULT_TASK_FILTERS, machineIds: [], assignees: [], frequencies: [] });
      onStatusFilterChange?.("visible");
      onSortChange?.("created-desc");
    }
    close();
  });
  panel.appendChild(clear);
  wrapper.append(toggle, panel);
  const active = currentStatus !== "visible" || (sort && sort !== "created-desc") ||
    current.machineIds.length || current.assignees.length || current.frequencies.length ||
    current.hasNotes || current.hasAttachments || current.source !== "all" || showCompleted;
  toggle.classList.toggle("is-active", !!active);
  return wrapper;
}; */

const chooseMachine = (machines) => new Promise((resolve) => {
  if (machines.length <= 1) {
    resolve(machines[0] || null);
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "machine-task-picker-overlay";
  const dialog = document.createElement("section");
  dialog.className = "machine-task-picker";
  dialog.tabIndex = -1;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const heading = document.createElement("h3");
  heading.textContent = t("dashboard.machineTaskChooseMachine", "Elige una máquina");
  const list = document.createElement("div");
  list.className = "machine-task-picker-list";
  const close = (machine = null) => {
    overlay.remove();
    resolve(machine);
  };
  machines.forEach((machine) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "machine-task-picker-option";
    button.textContent = machineLabel(machine);
    button.addEventListener("click", () => close(machine));
    list.appendChild(button);
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "machine-task-picker-cancel";
  cancel.textContent = t("common.cancel", "Cancelar");
  cancel.addEventListener("click", () => close());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  dialog.append(heading, list, cancel);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  dialog.focus();
});

const renderCreateForm = (root, machines, onCreate) => {
  const form = document.createElement("form");
  form.className = "todo-form";
  const composer = document.createElement("div");
  composer.className = "todo-composer";

  const title = document.createElement("textarea");
  title.className = "todo-input";
  title.maxLength = 64;
  title.rows = 3;
  title.required = true;
  title.placeholder = t("dashboard.todoPlaceholder", "Añadir tarea...");

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save todo-submit";
  submit.textContent = t("tasks.create", "Crear");

  composer.appendChild(title);
  form.append(composer, submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!title.value.trim()) return;
    const machine = await chooseMachine(machines);
    if (!machine) return;
    submit.disabled = true;
    try {
      await onCreate?.({
        machineId: machine.id,
        title: title.value,
        description: "",
        frequency: "puntual",
        assignedTo: null
      });
      title.value = "";
      title.focus();
    } finally {
      submit.disabled = false;
    }
  });
  root.appendChild(form);
};

const renderExpandedCreateForm = (root, machines, onCreate, fieldsOpen = false) => {
  const form = document.createElement("form");
  form.className = "machine-task-create-form";
  const control = (tag, placeholder) => {
    const element = document.createElement(tag);
    element.className = "machine-task-create-control";
    if (tag === "input") element.type = "text";
    if (placeholder) element.placeholder = placeholder;
    return element;
  };
  const addPlaceholder = (select, label) => {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = label;
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
  };

  const machineSelect = control("select");
  addPlaceholder(machineSelect, t("dashboard.machine", "Equipo"));
  machines
    .slice()
    .sort((left, right) => machineLabel(left).localeCompare(
      machineLabel(right),
      document.documentElement.lang === "en" ? "en" : "es",
      { sensitivity: "base" }
    ))
    .forEach((machine) => {
    const option = document.createElement("option");
    option.value = machine.id;
    option.textContent = machineLabel(machine);
    machineSelect.appendChild(option);
  });
  const title = control("input", t("tasks.taskIncidentPlaceholder", "Título"));
  title.maxLength = 64;
  const description = control("input", t("tasks.description", "Descripción"));
  description.maxLength = 1024;
  const frequency = control("select");
  addPlaceholder(frequency, t("tasks.frequency", "Frecuencia"));
  [["puntual", t("tasks.oneOff", "Tarea puntual")], ["diaria", t("tasks.daily", "Diaria")], ["semanal", t("tasks.weekly", "Semanal")], ["mensual", t("tasks.monthly", "Mensual")], ["trimestral", t("tasks.quarterly", "Trimestral")], ["semestral", t("tasks.semiannual", "Semestral")], ["anual", t("tasks.annual", "Anual")], ["custom", t("tasks.custom", "Personalizada")]]
    .forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      frequency.appendChild(option);
    });
  const assignee = control("select");
  const fillAssignees = () => {
    assignee.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = t("tasks.assignTo", "Asignar");
    assignee.appendChild(empty);
    const machine = machines.find((item) => item.id === machineSelect.value);
    const users = Array.isArray(machine?.assignableUsers)
      ? machine.assignableUsers
      : Array.isArray(machine?.users) ? machine.users : [];
    users
      .filter((user) => ["operator", "technician", "usuario", "tecnico"].includes(String(user?.role || "").toLowerCase()))
      .forEach((user) => {
        const option = document.createElement("option");
        option.value = String(user.userId || user.id || user.username || "");
        option.textContent = String(user.username || option.value);
        option.dataset.userId = String(user.userId || user.id || "");
        option.dataset.username = String(user.username || "");
        option.dataset.role = ["technician", "tecnico"].includes(user.role) ? "technician" : "operator";
        assignee.appendChild(option);
      });
  };
  const customAmount = control("input");
  customAmount.type = "number";
  customAmount.min = "1";
  customAmount.max = "999";
  customAmount.value = "1";
  customAmount.hidden = true;
  const customUnit = control("select");
  [["hours", t("tasks.hours", "horas")], ["days", t("tasks.days", "días")], ["weeks", t("tasks.weeks", "semanas")], ["months", t("tasks.months", "meses")]].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    customUnit.appendChild(option);
  });
  customUnit.value = "days";
  customUnit.hidden = true;
  const fields = document.createElement("div");
  fields.className = "machine-task-create-fields";
  fields.hidden = !fieldsOpen;
  fields.append(machineSelect, title, description, frequency, assignee, customAmount, customUnit);
  const composer = document.createElement("div");
  composer.className = "todo-composer";
  const details = document.createElement("textarea");
  details.className = "todo-input";
  details.maxLength = 1024;
  details.rows = 3;
  details.placeholder = t("dashboard.todoPlaceholder", "Añadir tarea...");
  composer.appendChild(details);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save todo-submit machine-task-create-submit";
  submit.textContent = t("tasks.create", "Crear");
  const validate = () => {
    const customValid = frequency.value !== "custom" || Number(customAmount.value) >= 1;
    submit.disabled = !(machineSelect.value && title.value.trim() && customValid);
  };
  machineSelect.addEventListener("change", () => { fillAssignees(); validate(); });
  frequency.addEventListener("change", () => {
    const isCustom = frequency.value === "custom";
    customAmount.hidden = !isCustom;
    customUnit.hidden = !isCustom;
    validate();
  });
  [title, description, details, customAmount].forEach((element) => element.addEventListener("input", validate));
  fillAssignees();
  validate();
  form.append(fields, composer, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validate();
    if (submit.disabled) return;
    const selected = assignee.selectedOptions[0];
    submit.disabled = true;
    try {
      await onCreate?.({
        machineId: machineSelect.value,
        title: title.value,
        description: [description.value.trim(), details.value.trim()].filter(Boolean).join("\n\n"),
        frequency: frequency.value || "puntual",
        customDueAmount: customAmount.value,
        customDueUnit: customUnit.value,
        assignedTo: selected?.value ? {
          userId: selected.dataset.userId || selected.value,
          username: selected.dataset.username || selected.textContent || "",
          role: selected.dataset.role || "operator"
        } : null
      });
      title.value = "";
      description.value = "";
      details.value = "";
      frequency.value = "";
      assignee.value = "";
      customAmount.value = "1";
      customAmount.hidden = true;
      customUnit.hidden = true;
    } finally {
      validate();
    }
  });
  root.appendChild(form);
};

const COMMAND_FREQUENCIES = [
  ["puntual", "oneOff", "Tarea puntual"],
  ["diaria", "daily", "Diaria"],
  ["semanal", "weekly", "Semanal"],
  ["mensual", "monthly", "Mensual"],
  ["trimestral", "quarterly", "Trimestral"],
  ["semestral", "semiannual", "Semestral"],
  ["anual", "annual", "Anual"],
  ["custom", "custom", "Personalizada"]
];

const normalizeCommandText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const getCommandAssignableUsers = (machine = {}) => {
  const safeMachine = machine && typeof machine === "object" ? machine : {};
  const users = Array.isArray(safeMachine.assignableUsers)
    ? safeMachine.assignableUsers
    : Array.isArray(safeMachine.users) ? safeMachine.users : [];
  const seen = new Set();
  return users
    .filter((user) => ["operator", "technician", "usuario", "tecnico"]
      .includes(String(user?.role || "").toLowerCase()))
    .map((user) => ({
      userId: String(user.userId || user.id || ""),
      username: String(user.username || "").trim(),
      role: ["technician", "tecnico"].includes(user.role) ? "technician" : "operator"
    }))
    .filter((user) => {
      const key = user.userId || normalizeCommandText(user.username);
      if (!key || !user.username || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.username.localeCompare(right.username, undefined, { sensitivity: "base" }));
};

const renderCommandCreateForm = (root, machines, onCreate, fieldsOpen = false) => {
  const sortedMachines = machines.slice().sort((left, right) =>
    machineLabel(left).localeCompare(machineLabel(right), undefined, { sensitivity: "base" })
  );
  const form = document.createElement("form");
  form.className = "machine-task-create-form machine-task-command-form";
  const fields = document.createElement("div");
  fields.className = "machine-task-create-fields";
  fields.hidden = !fieldsOpen;
  const createControl = (tag, placeholder = "") => {
    const element = document.createElement(tag);
    element.className = "machine-task-create-control";
    if (tag === "input") element.type = "text";
    if (placeholder) element.placeholder = placeholder;
    return element;
  };
  const addPlaceholder = (select, label) => {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = label;
    select.appendChild(option);
  };

  const machineSelect = createControl("select");
  addPlaceholder(machineSelect, t("dashboard.machine", "Equipo"));
  sortedMachines.forEach((machine) => {
    const option = document.createElement("option");
    option.value = machine.id;
    option.textContent = machineLabel(machine);
    machineSelect.appendChild(option);
  });
  const titleInput = createControl("input", t("tasks.taskIncidentPlaceholder", "Título"));
  titleInput.maxLength = 64;
  const descriptionInput = createControl("input", t("tasks.description", "Descripción"));
  descriptionInput.maxLength = 1024;
  const frequencySelect = createControl("select");
  addPlaceholder(frequencySelect, t("tasks.frequency", "Frecuencia"));
  COMMAND_FREQUENCIES.forEach(([value, key, fallback]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`tasks.${key}`, fallback);
    frequencySelect.appendChild(option);
  });
  const assigneeSelect = createControl("select");
  const customAmount = createControl("input");
  customAmount.type = "number";
  customAmount.min = "1";
  customAmount.max = "999";
  customAmount.value = "1";
  customAmount.hidden = true;
  const customUnit = createControl("select");
  const commandUnits = [
    ["hours", "hours", "horas"],
    ["days", "days", "días"],
    ["weeks", "weeks", "semanas"],
    ["months", "months", "meses"]
  ];
  commandUnits.forEach(([value, key, fallback]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`tasks.${key}`, fallback);
    customUnit.appendChild(option);
  });
  customUnit.value = "days";
  customUnit.hidden = true;
  fields.append(
    machineSelect,
    titleInput,
    descriptionInput,
    frequencySelect,
    assigneeSelect,
    customAmount,
    customUnit
  );

  const composer = document.createElement("div");
  composer.className = "todo-composer machine-task-command-composer";
  const editor = document.createElement("div");
  editor.className = "todo-input machine-task-command-editor";
  editor.contentEditable = "true";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.dataset.placeholder = t(
    "dashboard.todoCommandPlaceholder",
    "#Equipo, Título, Descripción, Frecuencia, @Asignación"
  );
  const suggestions = document.createElement("div");
  suggestions.className = "machine-task-command-suggestions";
  suggestions.hidden = true;
  suggestions.setAttribute("role", "listbox");
  composer.append(editor, suggestions);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-save todo-submit machine-task-create-submit";
  submit.textContent = t("tasks.create", "Crear");
  form.append(fields, composer, submit);

  let draft = {
    machineId: "",
    title: "",
    description: "",
    frequency: "",
    customDueAmount: "1",
    customDueUnit: "days",
    assignedTo: null
  };
  let activeSuggestion = 0;
  let visibleSuggestions = [];
  let activeSuggestionRange = null;
  let showInlineSuggestion = false;

  const getMachine = (machineId = draft.machineId) =>
    sortedMachines.find((machine) => machine.id === machineId) || null;
  const fillAssignees = (selected = draft.assignedTo) => {
    assigneeSelect.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = t("tasks.assignTo", "Asignar");
    assigneeSelect.appendChild(empty);
    getCommandAssignableUsers(getMachine()).forEach((user) => {
      const option = document.createElement("option");
      option.value = user.userId || `username:${normalizeCommandText(user.username)}`;
      option.textContent = user.username;
      option.dataset.userId = user.userId;
      option.dataset.username = user.username;
      option.dataset.role = user.role;
      assigneeSelect.appendChild(option);
    });
    const key = selected?.userId || (selected?.username
      ? `username:${normalizeCommandText(selected.username)}` : "");
    assigneeSelect.value = key;
    if (!assigneeSelect.value) assigneeSelect.value = "";
  };
  const readAssignee = () => {
    const option = assigneeSelect.selectedOptions[0];
    if (!option?.value) return null;
    return {
      userId: option.dataset.userId || "",
      username: option.dataset.username || option.textContent || "",
      role: option.dataset.role || "operator"
    };
  };
  const frequencyToken = () => {
    if (!draft.frequency) return "";
    if (draft.frequency !== "custom") return `/${draft.frequency}`;
    const unitLabel = commandUnits.find(([value]) => value === draft.customDueUnit)?.[2] || "días";
    return `/cada ${draft.customDueAmount || 1} ${unitLabel}`;
  };
  const setCaretAtEnd = () => {
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const renderEditor = (focus = false) => {
    editor.replaceChildren();
    const appendSpace = () => {
      if (editor.childNodes.length) editor.appendChild(document.createTextNode(" "));
    };
    const machine = getMachine();
    if (machine) {
      const token = document.createElement("span");
      token.className = "machine-task-command-token";
      token.textContent = `#${machineLabel(machine)}`;
      editor.appendChild(token);
      editor.appendChild(document.createTextNode(","));
    }
    if (draft.title) {
      appendSpace();
      const strong = document.createElement("strong");
      strong.textContent = draft.title;
      editor.appendChild(strong);
      if (draft.description || draft.frequency || draft.assignedTo) {
        editor.appendChild(document.createTextNode(","));
      }
    }
    if (draft.description) {
      appendSpace();
      editor.appendChild(document.createTextNode(draft.description));
      if (draft.frequency || draft.assignedTo) editor.appendChild(document.createTextNode(","));
    }
    const frequency = frequencyToken();
    if (frequency) {
      appendSpace();
      const token = document.createElement("span");
      token.className = "machine-task-command-token";
      token.textContent = frequency;
      editor.appendChild(token);
      if (draft.assignedTo) editor.appendChild(document.createTextNode(","));
    }
    if (draft.assignedTo?.username) {
      appendSpace();
      const token = document.createElement("span");
      token.className = "machine-task-command-token";
      token.textContent = `@${draft.assignedTo.username}`;
      editor.appendChild(token);
    }
    if (focus) {
      editor.focus();
      setCaretAtEnd();
    }
  };
  const validate = () => {
    const customValid = draft.frequency !== "custom" || Number(draft.customDueAmount) >= 1;
    submit.disabled = !(draft.machineId && draft.title.trim() && customValid);
  };
  const syncFieldsFromDraft = () => {
    machineSelect.value = draft.machineId;
    titleInput.value = draft.title;
    descriptionInput.value = draft.description;
    frequencySelect.value = draft.frequency;
    customAmount.value = draft.customDueAmount || "1";
    customUnit.value = draft.customDueUnit || "days";
    const custom = draft.frequency === "custom";
    customAmount.hidden = !custom;
    customUnit.hidden = !custom;
    fillAssignees(draft.assignedTo);
    validate();
  };
  const removeOnce = (source, fragment) => {
    if (!fragment) return source;
    const index = source.toLowerCase().indexOf(fragment.toLowerCase());
    return index < 0 ? source : `${source.slice(0, index)} ${source.slice(index + fragment.length)}`;
  };
  const parseEditor = () => {
    const text = String(editor.textContent || "").trim();
    let remainder = text;
    const machine = sortedMachines
      .slice()
      .sort((a, b) => machineLabel(b).length - machineLabel(a).length)
      .find((item) => normalizeCommandText(text).includes(normalizeCommandText(`#${machineLabel(item)}`)));
    if (machine) remainder = removeOnce(remainder, `#${machineLabel(machine)}`);
    const structuredSegments = /^\s*,/.test(remainder)
      ? remainder.replace(/^\s*,\s*/, "").split(",")
      : null;
    const renderedTitle = editor.querySelector("strong")?.textContent?.replace(/,+\s*$/, "").trim() || "";
    const titleMatch = remainder.match(/\*\*([^*]+)\*\*/);
    const structuredTitle = structuredSegments?.[0]?.replace(/^\*\*|\*\*$/g, "").trim() || "";
    let title = renderedTitle || titleMatch?.[1]?.trim() || structuredTitle;
    if (titleMatch) remainder = removeOnce(remainder, titleMatch[0]);
    else if (renderedTitle) remainder = removeOnce(remainder, renderedTitle);
    else {
      const plainTitleMatch = remainder.match(/^\s*,\s*([^,/@]+?)(?=\s*(?:,|\/|@|$))/);
      if (plainTitleMatch) {
        title = plainTitleMatch[1].trim();
        remainder = remainder.slice(plainTitleMatch[0].length).replace(/^\s*,\s*/, "");
      }
    }
    let frequency = "";
    let customDueAmount = "1";
    let customDueUnit = "days";
    const customMatch = remainder.match(/\/cada\s+(\d{1,3})\s+(horas?|d[ií]as?|semanas?|meses?)/i);
    if (customMatch) {
      frequency = "custom";
      customDueAmount = customMatch[1];
      const normalizedUnit = normalizeCommandText(customMatch[2]);
      customDueUnit = normalizedUnit.startsWith("hora") ? "hours"
        : normalizedUnit.startsWith("semana") ? "weeks"
          : normalizedUnit.startsWith("mes") ? "months" : "days";
      remainder = removeOnce(remainder, customMatch[0]);
    } else {
      const frequencyMatch = remainder.match(/\/(puntual|diaria|semanal|mensual|trimestral|semestral|anual)\b/i);
      if (frequencyMatch) {
        frequency = frequencyMatch[1].toLowerCase();
        remainder = removeOnce(remainder, frequencyMatch[0]);
      }
    }
    const users = getCommandAssignableUsers(machine || getMachine());
    const assigned = users
      .slice()
      .sort((a, b) => b.username.length - a.username.length)
      .find((user) => normalizeCommandText(text).includes(normalizeCommandText(`@${user.username}`))) || null;
    if (assigned) remainder = removeOnce(remainder, `@${assigned.username}`);
    draft = {
      machineId: machine?.id || "",
      title,
      description: structuredSegments && structuredSegments.length > 1
        ? structuredSegments[1].replace(/\s+/g, " ").trim()
        : remainder.replace(/\s+/g, " ").trim(),
      frequency,
      customDueAmount,
      customDueUnit,
      assignedTo: assigned
    };
    syncFieldsFromDraft();
  };
  const syncDraftFromFields = () => {
    draft = {
      machineId: machineSelect.value,
      title: titleInput.value.trim().slice(0, 64),
      description: descriptionInput.value.trim().slice(0, 1024),
      frequency: frequencySelect.value,
      customDueAmount: customAmount.value || "1",
      customDueUnit: customUnit.value || "days",
      assignedTo: readAssignee()
    };
    renderEditor();
    validate();
  };
  const getCaretOffset = () => {
    const selection = window.getSelection?.();
    if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) {
      return String(editor.textContent || "").length;
    }
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(editor);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString().length;
  };
  const setCaretOffset = (offset) => {
    const selection = window.getSelection?.();
    if (!selection) return;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, offset);
    let node = walker.nextNode();
    while (node) {
      if (remaining <= node.textContent.length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= node.textContent.length;
      node = walker.nextNode();
    }
    setCaretAtEnd();
  };
  const formatTypedTitle = () => {
    const text = String(editor.textContent || "");
    const machine = getMachine();
    if (!machine) return;
    const machineToken = `#${machineLabel(machine)}`;
    const machineStart = normalizeCommandText(text).indexOf(normalizeCommandText(machineToken));
    if (machineStart < 0) return;
    const firstComma = text.indexOf(",", machineStart + machineToken.length);
    if (firstComma < 0) return;
    const secondComma = text.indexOf(",", firstComma + 1);
    const rawTitleEnd = secondComma < 0 ? text.length : secondComma;
    const titleStart = firstComma + 1 + (text.slice(firstComma + 1, rawTitleEnd).match(/^\s*/)?.[0].length || 0);
    const titleEnd = rawTitleEnd - (text.slice(titleStart, rawTitleEnd).match(/\s*$/)?.[0].length || 0);
    if (titleEnd <= titleStart) return;
    const caret = getCaretOffset();
    const prefix = document.createTextNode(text.slice(0, machineStart));
    const machineNode = document.createElement("span");
    machineNode.className = "machine-task-command-token";
    machineNode.textContent = text.slice(machineStart, machineStart + machineToken.length);
    const beforeTitle = document.createTextNode(text.slice(machineStart + machineToken.length, titleStart));
    const titleNode = document.createElement("strong");
    titleNode.textContent = text.slice(titleStart, titleEnd);
    const suffix = document.createTextNode(text.slice(titleEnd));
    editor.replaceChildren(prefix, machineNode, beforeTitle, titleNode, suffix);
    setCaretOffset(caret);
  };
  const closeSuggestions = () => {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    visibleSuggestions = [];
    activeSuggestion = 0;
    activeSuggestionRange = null;
    showInlineSuggestion = false;
    delete editor.dataset.inlineSuggestion;
  };
  const showStageHint = (label) => {
    closeSuggestions();
    if (label) editor.dataset.inlineSuggestion = ` ${label}`;
  };
  const replaceActiveCommand = (replacement) => {
    const text = String(editor.textContent || "");
    const caret = getCaretOffset();
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)([#/@])([^\s,]*)$/);
    const range = activeSuggestionRange || (match ? {
      start: caret - match[0].length + (match[1] ? 1 : 0),
      end: caret
    } : null);
    if (!range) return;
    editor.textContent = `${text.slice(0, range.start)}${replacement} ${text.slice(range.end)}`.trim();
    parseEditor();
    renderEditor(true);
    closeSuggestions();
    refreshSuggestions();
  };
  const refreshSuggestions = () => {
    const text = String(editor.textContent || "");
    const caret = getCaretOffset();
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)([#/@])([^\s,]*)$/);
    activeSuggestionRange = null;
    showInlineSuggestion = false;
    delete editor.dataset.inlineSuggestion;
    if (match) {
      activeSuggestionRange = {
        start: caret - match[0].length + (match[1] ? 1 : 0),
        end: caret
      };
      const marker = match[2];
      const query = normalizeCommandText(match[3]);
      if (marker === "#") {
        visibleSuggestions = sortedMachines
          .filter((machine) => normalizeCommandText(machineLabel(machine)).includes(query))
          .map((machine) => ({ label: machineLabel(machine), replacement: `#${machineLabel(machine)}` }));
        if (!query) editor.dataset.inlineSuggestion = ` ${t("dashboard.machine", "Equipo")}`;
      } else if (marker === "@") {
        visibleSuggestions = getCommandAssignableUsers(getMachine())
          .filter((user) => normalizeCommandText(user.username).includes(query))
          .map((user) => ({ label: `@${user.username}`, replacement: `@${user.username}` }));
      } else {
        visibleSuggestions = COMMAND_FREQUENCIES
          .filter(([value]) => value !== "custom" && normalizeCommandText(value).includes(query))
          .map(([value, key, fallback]) => ({
            label: t(`tasks.${key}`, fallback),
            replacement: `/${value}`
          }));
        if (normalizeCommandText("cada").includes(query)) {
          visibleSuggestions.push({ label: t("tasks.custom", "Personalizada"), replacement: "/cada 1 días" });
        }
      }
    } else {
      const machine = getMachine();
      const machineToken = machine ? `#${machineLabel(machine)}` : "";
      const machineStart = machineToken
        ? normalizeCommandText(before).indexOf(normalizeCommandText(machineToken))
        : -1;
      const afterMachine = machineStart >= 0 ? before.slice(machineStart + machineToken.length) : "";
      const commaCount = (afterMachine.match(/,/g) || []).length;
      if (!/,\s*$/.test(before)) {
        closeSuggestions();
        return;
      }
      if (commaCount === 1) {
        showStageHint(t("tasks.taskIncidentPlaceholder", "Título"));
        return;
      }
      if (commaCount === 2) {
        showStageHint(t("tasks.description", "Descripción"));
        return;
      }
      if (commaCount < 3) {
        closeSuggestions();
        return;
      }
      activeSuggestionRange = { start: caret, end: caret };
      showInlineSuggestion = true;
      if (commaCount === 3) {
        visibleSuggestions = COMMAND_FREQUENCIES.map(([value, key, fallback]) => ({
          label: t(`tasks.${key}`, fallback),
          replacement: value === "custom" ? "/cada 1 días" : `/${value}`
        }));
      } else {
        visibleSuggestions = getCommandAssignableUsers(machine)
          .map((user) => ({ label: `@${user.username}`, replacement: `@${user.username}` }));
      }
    }
    if (showInlineSuggestion && visibleSuggestions.length) {
      editor.dataset.inlineSuggestion = ` ${visibleSuggestions[activeSuggestion]?.label || visibleSuggestions[0].label}`;
    }
    suggestions.replaceChildren();
    activeSuggestion = Math.min(activeSuggestion, Math.max(0, visibleSuggestions.length - 1));
    visibleSuggestions.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "machine-task-command-suggestion";
      button.classList.toggle("is-active", index === activeSuggestion);
      button.textContent = item.label;
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => replaceActiveCommand(item.replacement));
      suggestions.appendChild(button);
    });
    suggestions.hidden = !visibleSuggestions.length;
  };
  const refreshActiveSuggestion = () => {
    suggestions.querySelectorAll(".machine-task-command-suggestion").forEach((button, index) => {
      button.classList.toggle("is-active", index === activeSuggestion);
    });
    if (showInlineSuggestion && visibleSuggestions.length) {
      editor.dataset.inlineSuggestion = ` ${visibleSuggestions[activeSuggestion].label}`;
    }
  };

  machineSelect.addEventListener("change", () => {
    draft.machineId = machineSelect.value;
    draft.assignedTo = null;
    fillAssignees();
    syncDraftFromFields();
  });
  [titleInput, descriptionInput].forEach((input) => input.addEventListener("input", syncDraftFromFields));
  frequencySelect.addEventListener("change", () => {
    const custom = frequencySelect.value === "custom";
    customAmount.hidden = !custom;
    customUnit.hidden = !custom;
    syncDraftFromFields();
  });
  customAmount.addEventListener("input", syncDraftFromFields);
  customUnit.addEventListener("change", syncDraftFromFields);
  assigneeSelect.addEventListener("change", syncDraftFromFields);
  editor.addEventListener("input", () => {
    parseEditor();
    formatTypedTitle();
    refreshSuggestions();
  });
  editor.addEventListener("keydown", (event) => {
    if (!suggestions.hidden && visibleSuggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeSuggestion = (activeSuggestion + direction + visibleSuggestions.length) % visibleSuggestions.length;
        refreshActiveSuggestion();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        replaceActiveCommand(visibleSuggestions[activeSuggestion].replacement);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  editor.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!suggestions.matches(":hover")) closeSuggestions();
      parseEditor();
      renderEditor();
    }, 120);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    parseEditor();
    validate();
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      await onCreate?.({
        machineId: draft.machineId,
        title: draft.title,
        description: draft.description,
        frequency: draft.frequency || "puntual",
        customDueAmount: draft.customDueAmount,
        customDueUnit: draft.customDueUnit,
        assignedTo: draft.assignedTo
      });
      draft = {
        machineId: "",
        title: "",
        description: "",
        frequency: "",
        customDueAmount: "1",
        customDueUnit: "days",
        assignedTo: null
      };
      syncFieldsFromDraft();
      renderEditor(true);
    } finally {
      validate();
    }
  });
  fillAssignees();
  renderEditor();
  validate();
  root.appendChild(form);
};

export const renderMachineTasksView = (container, machines = [], options = {}) => {
  const root = document.createElement("section");
  root.className = "machine-tasks-view";

  const header = document.createElement("header");
  header.className = "machine-tasks-header";
  const heading = document.createElement("h3");
  heading.textContent = t("dashboard.todoTitle", "Tareas");
  const summary = document.createElement("span");
  summary.className = "machine-tasks-summary";
  const headerActions = document.createElement("div");
  headerActions.className = "todo-header-actions";
  const statusFilter = ["visible", "pending", "completed", "all"].includes(options.statusFilter)
    ? options.statusFilter
    : "visible";
  const completedToggle = document.createElement("button");
  completedToggle.type = "button";
  completedToggle.className = "todo-completed-toggle";
  const showCompleted = options.showCompleted === true;
  const eyeShowsCompleted = showCompleted || statusFilter === "completed" || statusFilter === "all";
  const completedLabel = eyeShowsCompleted
    ? t("dashboard.todoHideCompleted", "Ocultar completadas")
    : t("dashboard.todoShowCompleted", "Mostrar completadas");
  completedToggle.setAttribute("aria-label", completedLabel);
  completedToggle.setAttribute("data-tooltip", completedLabel);
  completedToggle.setAttribute("aria-pressed", eyeShowsCompleted ? "true" : "false");
  completedToggle.innerHTML = eyeShowsCompleted
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a15.6 15.6 0 0 1-2 4.1M6.6 6.6A12.8 12.8 0 0 0 2 12c1 4 5 8 10 8a10.8 10.8 0 0 0 5.4-1.4"/></svg>';
  attachTooltip(completedToggle);
  completedToggle.addEventListener("click", () => options.onShowCompletedChange?.(!eyeShowsCompleted));
  headerActions.append(summary, completedToggle);
  header.append(heading, headerActions);

  if (!machines.length) {
    root.appendChild(header);
    const empty = document.createElement("p");
    empty.className = "todo-empty";
    empty.textContent = t("dashboard.machineTasksNoMachines", "No hay máquinas disponibles.");
    root.appendChild(empty);
    container.appendChild(root);
    return;
  }

  renderCommandCreateForm(root, machines, options.onCreate, options.createOpen);
  root.appendChild(header);

  const allEntries = flattenTasks(machines);
  const searchedEntries = allEntries
    .filter((entry) => matchesQuery(entry, options.query));
  const entries = searchedEntries
    .filter(({ completed }) => {
      if (statusFilter === "pending") return !completed;
      if (statusFilter === "completed") return completed;
      if (statusFilter === "visible") return options.showCompleted || !completed;
      return true;
    })
    .sort((a, b) => {
      const order = options.sort || "created-desc";
      if (order === "created-asc") return taskSortTime(a) - taskSortTime(b);
      if (order === "machine-asc") return machineLabel(a.machine).localeCompare(machineLabel(b.machine), undefined, { sensitivity: "base" });
      if (order === "title-asc") return String(a.task?.title || "").localeCompare(String(b.task?.title || ""), undefined, { sensitivity: "base" });
      return taskSortTime(b) - taskSortTime(a);
    });
  summary.textContent = `${entries.length}/${searchedEntries.length}`;

  const downloadMenu = createDownloadMenu({
    placement: "bottom",
    className: "machine-tasks-download",
    onSelect: (format) => {
      const rows = searchedEntries.flatMap(({ machine, task, timing, completed }) => [
        {
          date: formatDate(task.lastCompletedAt || task.createdAt),
          machine: machineLabel(machine),
          location: String(machine.location || "").trim(),
          event: [
            completed ? t("tasks.completed", "Completada") : t("tasks.pending", "Pendiente"),
            task.title || t("tasks.task", "Tarea"),
            task.description || "",
            completed ? "" : timing.label
          ].filter(Boolean).join(" - "),
          user: String(task.assignedTo?.username || ""),
          type: completed ? "task_completed" : "task_pending",
          indent: false
        },
        ...getTaskRelatedItems(task).map((related) => ({
          date: formatDate(related.time),
          machine: machineLabel(machine),
          location: String(machine.location || "").trim(),
          event: related.type === "attachment"
            ? `${t("history.imageAdded", "Imagen añadida")}: ${related.name}`
            : `${t("tasks.note", "Nota")}: ${related.text}`,
          user: String(related.user || ""),
          type: related.type === "attachment" ? "task_attachment" : "task_note",
          indent: true
        }))
      ]);
      downloadHistoryRows(rows, `tareas_${new Date().toISOString().slice(0, 10)}`, format);
    }
  });
  downloadMenu.toggle.setAttribute(
    "data-tooltip",
    t("dashboard.todoDownload", "Descargar registro completo de tareas")
  );
  attachTooltip(downloadMenu.toggle);
  headerActions.appendChild(downloadMenu.wrap);

  const pageCount = Math.max(1, Math.ceil(entries.length / MACHINE_TASKS_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(options.page || 1)));
  const visible = entries.slice((page - 1) * MACHINE_TASKS_PAGE_SIZE, page * MACHINE_TASKS_PAGE_SIZE);
  const list = document.createElement("div");
  list.className = "global-registry-list machine-tasks-list";
  visible.forEach(({ machine, task, timing, completed }) => {
    const row = document.createElement("article");
    row.className = "global-registry-row";
    const meta = document.createElement("div");
    meta.className = "global-registry-meta";
    const time = document.createElement("time");
    time.className = "global-registry-time";
    time.dateTime = task.createdAt || "";
    time.textContent = formatDate(task.createdAt);
    const machineName = document.createElement("span");
    machineName.className = "global-registry-machine";
    machineName.textContent = machineLabel(machine);
    meta.append(time, machineName);
    if (machine.location) {
      const location = document.createElement("span");
      location.className = "global-registry-location";
      location.textContent = machine.location;
      meta.appendChild(location);
    }
    const body = document.createElement("div");
    body.className = "global-registry-message machine-tasks-body";
    const titleLine = document.createElement("div");
    titleLine.className = "machine-tasks-title-line";
    const title = document.createElement("strong");
    title.textContent = task.title || t("tasks.task", "Tarea");
    const status = document.createElement("span");
    const criticalRestore = !completed &&
      task.source === "status-out-of-service" &&
      String(machine.status || "").trim().toLowerCase() === "fuera_de_servicio";
    status.className = `machine-tasks-status ${
      completed ? "is-completed" : criticalRestore ? "is-critical" : "is-pending"
    }`;
    status.textContent = completed
      ? t("tasks.completed", "Completada")
      : t("tasks.pending", "Pendiente");
    const titleActions = document.createElement("span");
    titleActions.className = "machine-tasks-title-actions";
    titleActions.appendChild(status);
    const forms = document.createElement("div");
    forms.className = "machine-task-inline-actions";
    if (!completed) {
      titleActions.appendChild(createTaskActionsMenu({ machine, task, forms, options }));
    }
    titleLine.append(title, titleActions);
    const taskMeta = document.createElement("div");
    taskMeta.className = "machine-tasks-meta";
    taskMeta.textContent = [task.assignedTo?.username, completed ? "" : timing.label]
      .filter(Boolean).join(" · ");
    body.append(titleLine, taskMeta);
    if (task.description) {
      const description = document.createElement("p");
      description.textContent = task.description;
      body.appendChild(description);
    }
    row.append(meta, body, forms);
    list.appendChild(row);
    appendTaskRelatedRows(list, { machine, task, timing, completed });
  });
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "todo-empty";
    empty.textContent = t("tasks.emptyList", "No hay tareas que mostrar, crea una tarea para comenzar");
    list.appendChild(empty);
  }
  root.appendChild(list);

  if (pageCount > 1) {
    const pagination = document.createElement("nav");
    pagination.className = "todo-pagination";
    const pageControls = document.createElement("div");
    pageControls.className = "todo-page-controls";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "todo-page-button";
    previous.disabled = page <= 1;
    previous.setAttribute("aria-label", t("dashboard.todoPreviousPage", "Página anterior"));
    previous.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg>';
    previous.addEventListener("click", () => options.onPageChange?.(page - 1));
    const label = document.createElement("span");
    label.className = "todo-page-label";
    label.textContent = `${page}/${pageCount}`;
    const next = document.createElement("button");
    next.type = "button";
    next.className = "todo-page-button";
    next.disabled = page >= pageCount;
    next.setAttribute("aria-label", t("dashboard.todoNextPage", "Página siguiente"));
    next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6"/></svg>';
    next.addEventListener("click", () => options.onPageChange?.(page + 1));
    pageControls.append(previous, label, next);
    pagination.appendChild(pageControls);
    root.appendChild(pagination);
  }
  container.appendChild(root);
};
