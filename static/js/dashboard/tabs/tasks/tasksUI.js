import { t } from "/static/js/dashboard/i18n.js";
import {
  CUSTOM_TASK_UNITS,
  MAX_TASK_DESCRIPTION,
  MAX_TASK_NOTE,
  MAX_TASK_TITLE,
  RESTORE_OPERATION_TASK_SOURCE,
  createTask,
  normalizeTaskAssignee,
  normalizeTasks
} from "./tasksModel.js";
import { getTaskTiming } from "./tasksTime.js";

const TASK_COMPLETION_FEEDBACK_MS = 3000;
const ONE_OFF_COMPLETION_ANIMATION_MS = 420;
const animatedTaskCompletions = new Set();

const waitForOneOffCompletionAnimation = () => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  return new Promise((resolve) => window.setTimeout(resolve, ONE_OFF_COMPLETION_ANIMATION_MS));
};

const getRecentRecurringCompletionRemaining = (task) => {
  if (!task?.lastCompletedAt || task.frequency === "puntual") return 0;
  const completedAt = new Date(task.lastCompletedAt).getTime();
  if (!Number.isFinite(completedAt)) return 0;
  return Math.max(0, TASK_COMPLETION_FEEDBACK_MS - (Date.now() - completedAt));
};

const attachTaskTooltip = (target) => {
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

const frequencyLabel = (key) =>
  ({
    puntual: t("tasks.oneOff", "Tarea puntual"),
    custom: t("tasks.custom", "Personalizada"),
    diaria: t("tasks.daily", "Diaria"),
    semanal: t("tasks.weekly", "Semanal"),
    mensual: t("tasks.monthly", "Mensual"),
    trimestral: t("tasks.quarterly", "Trimestral"),
    semestral: t("tasks.semiannual", "Semestral"),
    anual: t("tasks.annual", "Anual"),
  })[key] || key;

const unitLabel = (key) =>
  ({
    hours: t("tasks.hours", "horas"),
    days: t("tasks.days", "días"),
    weeks: t("tasks.weeks", "semanas"),
    months: t("tasks.months", "meses"),
  })[key] || key;

const frequencyKeys = [
  "puntual",
  "diaria",
  "semanal",
  "mensual",
  "trimestral",
  "semestral",
  "anual",
  "custom"
];

const createFrequencySelect = (value = "") => {
  const select = document.createElement("select");
  select.className = "task-frequency-select";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("tasks.frequency", "Frecuencia");
  placeholder.disabled = true;
  select.appendChild(placeholder);
  frequencyKeys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = frequencyLabel(key);
    select.appendChild(option);
  });
  select.value = value || "";
  select.addEventListener("click", (event) => event.stopPropagation());
  return select;
};

const normalizeRole = (value) =>
  value === "tecnico" || value === "technician" ? "technician" : "operator";

const getAssignableUsers = (machine = {}) => {
  const source = Array.isArray(machine.assignableUsers)
    ? machine.assignableUsers
    : Array.isArray(machine.users)
      ? machine.users
      : [];
  const seen = new Set();
  return source
    .filter((user) =>
      ["operator", "technician", "usuario", "tecnico"].includes(
        String(user?.role || "").trim().toLowerCase()
      )
    )
    .map((user) => ({
        userId: String(user?.userId || user?.id || "").trim(),
        username: String(user?.username || "").trim(),
        role: normalizeRole(user?.role)
      }))
    .filter((user) => {
      const key = user.userId || user.username.toLowerCase();
      if (!key || !user.username || seen.has(key)) return false;
      seen.add(key);
      return user.role === "operator" || user.role === "technician";
    })
    .sort((left, right) =>
      left.username.localeCompare(right.username, undefined, { sensitivity: "base" })
    );
};

const getAssigneeKey = (assignee) => {
  const normalized = normalizeTaskAssignee(assignee);
  return normalized ? normalized.userId || `username:${normalized.username.toLowerCase()}` : "";
};

const createAssigneeSelect = (machine, value = null) => {
  const select = document.createElement("select");
  select.className = "task-assignee-select";
  const unassigned = document.createElement("option");
  unassigned.value = "";
  unassigned.textContent = t("tasks.unassigned", "Sin asignar");
  select.appendChild(unassigned);
  getAssignableUsers(machine).forEach((user) => {
    const option = document.createElement("option");
    option.value = user.userId || `username:${user.username.toLowerCase()}`;
    option.textContent = `${user.username} · ${
      user.role === "technician"
        ? t("config.technician", "Técnico")
        : t("config.operator", "Operario")
    }`;
    option.dataset.userId = user.userId;
    option.dataset.username = user.username;
    option.dataset.role = user.role;
    select.appendChild(option);
  });
  const current = normalizeTaskAssignee(value);
  const currentKey = getAssigneeKey(current);
  if (
    currentKey &&
    !Array.from(select.options).some((option) => option.value === currentKey)
  ) {
    const unavailable = document.createElement("option");
    unavailable.value = currentKey;
    unavailable.textContent = t(
      "tasks.assigneeUnavailable",
      (username) => `${username} · no disponible`
    )(current.username);
    unavailable.dataset.userId = current.userId;
    unavailable.dataset.username = current.username;
    unavailable.dataset.role = current.role;
    select.appendChild(unavailable);
  }
  select.value = currentKey;
  if (!select.value) select.value = "";
  select.setAttribute("aria-label", t("tasks.assignTo", "Asignar a"));
  select.addEventListener("click", (event) => event.stopPropagation());
  return select;
};

const readAssigneeSelect = (select) => {
  const option = select.options[select.selectedIndex];
  if (!option?.value) return null;
  return normalizeTaskAssignee({
    userId: option.dataset.userId,
    username: option.dataset.username,
    role: option.dataset.role
  });
};

const createCustomControls = (task = {}) => {
  const wrap = document.createElement("div");
  wrap.className = "task-custom-controls";
  const amount = document.createElement("input");
  amount.className = "task-custom-amount";
  amount.type = "number";
  amount.min = "1";
  amount.max = "999";
  amount.step = "1";
  amount.value = String(task.customDueAmount || 1);
  amount.addEventListener("click", (event) => event.stopPropagation());

  const unit = document.createElement("select");
  unit.className = "task-custom-unit";
  CUSTOM_TASK_UNITS.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = unitLabel(key);
    unit.appendChild(option);
  });
  unit.value = task.customDueUnit || "days";
  unit.addEventListener("click", (event) => event.stopPropagation());

  wrap.appendChild(amount);
  wrap.appendChild(unit);
  return { wrap, amount, unit };
};

const TASK_MENU_ICONS = {
  complete: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.4 14.2-4.1-4.1 1.4-1.4 2.7 2.7 5.5-5.5 1.4 1.4-6.9 6.9Z"></path>',
  note: '<path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 4v3H8v2h3v3h2v-3h3v-2h-3V7h-2Z"></path>',
  images: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.5 7A2.5 2.5 0 1 1 6 9.5 2.5 2.5 0 0 1 8.5 7ZM5 19l4.5-6 3.5 4.5 2.5-3L19 19H5Z"></path>',
  edit: '<path d="m17.7 2.3 4 4a1 1 0 0 1 0 1.4L9.4 20H4v-5.4L16.3 2.3a1 1 0 0 1 1.4 0ZM6 15.4V18h2.6l9.9-9.9-2.6-2.6L6 15.4Z"></path>',
  remove: '<path d="M8 3h8l1 2h5v2H2V5h5l1-2Zm-3 6h14l-1 13H6L5 9Zm4 2v8h2v-8H9Zm4 0v8h2v-8h-2Z"></path>'
};

const setTaskMenuActionContent = (button, icon, label) => {
  const iconElement = document.createElement("span");
  iconElement.className = "task-menu-action-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${icon}</svg>`;
  const labelElement = document.createElement("span");
  labelElement.className = "task-menu-action-label";
  labelElement.textContent = label;
  button.replaceChildren(iconElement, labelElement);
};

const createTaskMenu = ({
  machine,
  task,
  hooks,
  completeTask,
  openNoteForm,
  openImagePicker,
  openEditForm,
  canCompleteTask,
  canAddNotes,
  canUploadImages,
  canEditTask,
  canDeleteTask
}) => {
  const menu = document.createElement("span");
  menu.className = "task-menu";

  const dots = document.createElement("button");
  dots.type = "button";
  dots.className = "task-menu-toggle";
  dots.setAttribute("aria-label", t("general.moreOptions", "Más opciones"));
  dots.setAttribute("aria-haspopup", "menu");
  dots.setAttribute("aria-expanded", "false");
  dots.textContent = "•••";

  const panel = document.createElement("div");
  panel.className = "task-menu-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "task-menu-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  let documentClickHandler = null;
  const mobileMenuQuery = window.matchMedia("(max-width: 768px)");

  const restorePanel = () => {
    panel.classList.remove("is-mobile-sheet");
    backdrop.classList.remove("is-visible");
    backdrop.remove();
    document.documentElement.classList.remove("task-action-sheet-open");
    menu.appendChild(panel);
  };

  const closeMenu = () => {
    panel.hidden = true;
    dots.setAttribute("aria-expanded", "false");
    restorePanel();
    if (documentClickHandler) {
      document.removeEventListener("click", documentClickHandler, true);
      documentClickHandler = null;
    }
  };

  const openMenu = () => {
    if (mobileMenuQuery.matches) {
      panel.classList.add("is-mobile-sheet");
      document.documentElement.classList.add("task-action-sheet-open");
      document.body.appendChild(backdrop);
      document.body.appendChild(panel);
      requestAnimationFrame(() => backdrop.classList.add("is-visible"));
    }
    panel.hidden = false;
    dots.setAttribute("aria-expanded", "true");
    if (documentClickHandler) return;
    documentClickHandler = (event) => {
      if (menu.contains(event.target) || panel.contains(event.target)) return;
      closeMenu();
    };
    document.addEventListener("click", documentClickHandler, true);
  };

  dots.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextOpen = panel.hidden;
    if (nextOpen) openMenu();
    else closeMenu();
  });

  const complete = document.createElement("button");
  complete.type = "button";
  complete.className = "task-menu-action";
  complete.setAttribute("role", "menuitem");
  setTaskMenuActionContent(
    complete,
    TASK_MENU_ICONS.complete,
    t("dashboard.taskCompletionModalConfirm", "Completar tarea")
  );
  complete.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    completeTask();
  });

  const note = document.createElement("button");
  note.type = "button";
  note.className = "task-menu-action";
  note.setAttribute("role", "menuitem");
  setTaskMenuActionContent(note, TASK_MENU_ICONS.note, t("tasks.addNote", "Añadir nota"));
  note.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    openNoteForm();
  });

  const images = document.createElement("button");
  images.type = "button";
  images.className = "task-menu-action";
  images.setAttribute("role", "menuitem");
  setTaskMenuActionContent(images, TASK_MENU_ICONS.images, t("tasks.addImages", "Añadir imágenes"));
  images.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    openImagePicker();
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "task-menu-action";
  edit.setAttribute("role", "menuitem");
  setTaskMenuActionContent(edit, TASK_MENU_ICONS.edit, t("general.edit", "Editar"));
  edit.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    openEditForm();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "task-menu-action task-menu-delete";
  remove.setAttribute("role", "menuitem");
  setTaskMenuActionContent(remove, TASK_MENU_ICONS.remove, t("tasks.remove", "Eliminar"));
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    if (hooks.onRemoveTask) hooks.onRemoveTask(machine.id, task.id);
  });

  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.appendChild(dots);
  if (canCompleteTask) panel.appendChild(complete);
  if (canAddNotes) panel.appendChild(note);
  if (canUploadImages) panel.appendChild(images);
  if (canEditTask) panel.appendChild(edit);
  if (canDeleteTask) panel.appendChild(remove);
  menu.appendChild(panel);
  return menu;
};

const renderNotes = (item, task, hooks) => {
  const notes = Array.isArray(task.notes) ? task.notes : [];
  if (!notes.length) return;
  const details = document.createElement("details");
  details.className = "task-notes";
  details.addEventListener("toggle", () => {
    if (hooks.onContentResize) {
      const preserveScroll = !details.open;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      requestAnimationFrame(() => {
        hooks.onContentResize();
        if (preserveScroll) {
          requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
          });
        }
      });
    }
  });
  const summary = document.createElement("summary");
  summary.textContent = t("tasks.notesCount", (count) => `Notas (${count})`)(notes.length);
  details.appendChild(summary);
  const list = document.createElement("div");
  list.className = "task-notes-list";
  notes.forEach((note) => {
    const row = document.createElement("div");
    row.className = "task-note";
    row.textContent = note.text || "";
    list.appendChild(row);
  });
  details.appendChild(list);
  item.appendChild(details);
};

const createAttachmentLink = (attachment) => {
  const link = document.createElement("a");
  link.className = "task-attachment-link";
  link.href = attachment.url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = attachment.name || t("tasks.image", "Imagen");
  link.addEventListener("click", (event) => event.stopPropagation());
  return link;
};

const renderAttachments = (item, task, hooks) => {
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];
  if (!attachments.length) return;
  const onlyImages = attachments.every((attachment) =>
    String(attachment.contentType || "").startsWith("image/")
  );

  if (attachments.length === 1) {
    const row = document.createElement("div");
    row.className = "task-attachments task-attachment-single";
    const label = document.createElement("span");
    label.textContent = `${t(onlyImages ? "tasks.image" : "tasks.file", onlyImages ? "Imagen" : "Archivo")}:`;
    row.appendChild(label);
    row.appendChild(createAttachmentLink(attachments[0]));
    item.appendChild(row);
    return;
  }

  const details = document.createElement("details");
  details.className = "task-attachments";
  details.addEventListener("toggle", () => {
    if (hooks.onContentResize) requestAnimationFrame(() => hooks.onContentResize());
  });
  const summary = document.createElement("summary");
  summary.textContent = t(
    onlyImages ? "tasks.imagesCount" : "tasks.filesCount",
    (count) => `${onlyImages ? "Imágenes" : "Archivos"} (${count})`
  )(attachments.length);
  details.appendChild(summary);
  const list = document.createElement("div");
  list.className = "task-attachments-list";
  attachments.forEach((attachment) => {
    const row = document.createElement("div");
    row.className = "task-attachment";
    row.appendChild(createAttachmentLink(attachment));
    list.appendChild(row);
  });
  details.appendChild(list);
  item.appendChild(details);
};

export const renderTasksPanel = (panel, machine, hooks, options = {}, context = {}) => {
  panel.innerHTML = "";
  const canCreateTasks = options.canCreateTasks ?? options.canEditTasks !== false;
  const canEditTasks = options.canEditTasks !== false;
  const canDeleteTasks = options.canDeleteTasks ?? canEditTasks;
  const canCompleteTasks = options.canCompleteTasks !== false;
  const canAddTaskNotes = options.canAddTaskNotes ?? canEditTasks;
  const canUploadTaskImages = options.canUploadTaskImages ?? canEditTasks;

  const list = document.createElement("div");
  list.className = "task-list";

  const tasks = normalizeTasks(machine.tasks || []);
  if (tasks.length) {
    tasks.forEach((task) => {
      const item = document.createElement("div");
      item.className = "task-item";

      const body = document.createElement("div");
      body.className = "task-body";

      const line1 = document.createElement("div");
      line1.className = "task-line task-line-main";

      const title = document.createElement("strong");
      title.className = "task-title";
      const isLegacyRestoreTitle =
        task.source === RESTORE_OPERATION_TASK_SOURCE &&
        task.title === "Volver a poner la máquina en operatividad";
      title.textContent = isLegacyRestoreTitle
        ? t("tasks.restoreOperation", "Volver a poner el equipo en operatividad")
        : task.title || t("tasks.task", "Tarea");

      const meta = document.createElement("div");
      meta.className = "task-meta";

      if (task.assignedTo?.username) {
        const assignee = document.createElement("span");
        assignee.className = "task-assignee";
        assignee.textContent = t(
          "tasks.assignedTo",
          (username) => `Asignada a ${username}`
        )(task.assignedTo.username);
        meta.appendChild(assignee);
      }

      const timing = getTaskTiming(task);
      const completionFeedbackRemaining = getRecentRecurringCompletionRemaining(task);
      const remaining = document.createElement("span");
      remaining.className = "task-remaining";
      remaining.textContent = completionFeedbackRemaining
        ? t("tasks.completedNow", "Completada ahora")
        : timing.label;
      meta.appendChild(remaining);

      if (timing.pending) {
        const pending = document.createElement("span");
        pending.className = "task-pending";
        const isActiveRestoreTask =
          task.source === RESTORE_OPERATION_TASK_SOURCE &&
          machine.status === "fuera_de_servicio";
        pending.classList.toggle("is-active-restore", isActiveRestoreTask);
        pending.textContent = t("tasks.pending", "Pendiente");
        meta.appendChild(pending);
      }

      let completeBtn = null;
      if (canCompleteTasks) {
        completeBtn = document.createElement("button");
        completeBtn.type = "button";
        completeBtn.className = "task-complete-btn";
        completeBtn.setAttribute("role", "checkbox");
        completeBtn.setAttribute("aria-checked", "false");
        const isRestoreTask = task.source === RESTORE_OPERATION_TASK_SOURCE;
        const actionLabel = isRestoreTask
          ? t("tasks.markIncidentResolved", "Marcar incidencia como resuelta")
          : t("tasks.markCompleted", "Marcar como completada");
        completeBtn.setAttribute("aria-label", actionLabel);
        completeBtn.setAttribute("data-tooltip", actionLabel);
        completeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" pathLength="1"/><path d="m8.5 12 2.25 2.25L15.5 9.5"/></svg>';
        if (completionFeedbackRemaining) {
          completeBtn.classList.add("is-completion-feedback");
          const completionKey = `${machine.id}:${task.id}:${task.lastCompletedAt}`;
          if (!animatedTaskCompletions.has(completionKey)) {
            animatedTaskCompletions.add(completionKey);
            completeBtn.classList.add("is-completion-feedback-animated");
            window.setTimeout(() => animatedTaskCompletions.delete(completionKey), 10000);
          }
          window.setTimeout(() => {
            completeBtn.classList.remove("is-completion-feedback");
            completeBtn.classList.remove("is-completion-feedback-animated");
            remaining.textContent = timing.label;
          }, completionFeedbackRemaining);
        }
        attachTaskTooltip(completeBtn);
        completeBtn.addEventListener("click", async (event) => {
          event.stopPropagation();
          if (!hooks.onCompleteTask || completeBtn.disabled) return;
          completeBtn.disabled = true;
          const animateBeforeRemoval =
            task.frequency === "puntual" && task.source !== RESTORE_OPERATION_TASK_SOURCE;
          if (animateBeforeRemoval) {
            completeBtn.classList.add("is-completing");
            completeBtn.classList.add("is-one-off-completing");
          }
          try {
            if (animateBeforeRemoval) await waitForOneOffCompletionAnimation();
            await hooks.onCompleteTask(machine.id, task.id, context);
          } finally {
            if (completeBtn.isConnected) {
              completeBtn.disabled = false;
              completeBtn.classList.remove("is-completing");
              completeBtn.classList.remove("is-one-off-completing");
            }
          }
        });
        meta.appendChild(completeBtn);
      }

      const forms = document.createElement("div");
      forms.className = "task-inline-forms";

      const openNoteForm = () => {
        forms.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "task-note-form";
        const textarea = document.createElement("textarea");
        textarea.className = "task-note-input";
        textarea.maxLength = MAX_TASK_NOTE;
        textarea.placeholder = t("tasks.note", "Nota");
        textarea.addEventListener("click", (event) => event.stopPropagation());
        const save = document.createElement("button");
        save.type = "button";
        save.className = "task-create-btn";
        save.textContent = t("general.save", "Guardar");
        save.addEventListener("click", (event) => {
          event.stopPropagation();
          const text = textarea.value.trim();
          if (!text) return;
          if (hooks.onAddTaskNote) hooks.onAddTaskNote(machine.id, task.id, text);
        });
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "task-create-btn";
        cancel.textContent = t("card.cancel", "Cancelar");
        cancel.addEventListener("click", (event) => {
          event.stopPropagation();
          forms.innerHTML = "";
        });
        wrap.appendChild(textarea);
        wrap.appendChild(save);
        wrap.appendChild(cancel);
        forms.appendChild(wrap);
        textarea.focus();
        if (hooks.onContentResize) {
          requestAnimationFrame(() => hooks.onContentResize());
        }
      };

      const openEditForm = () => {
        forms.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "task-edit-form";
        const titleInput = document.createElement("input");
        titleInput.className = "task-title-input";
        titleInput.type = "text";
        titleInput.maxLength = MAX_TASK_TITLE;
        titleInput.value = task.title || "";
        titleInput.addEventListener("click", (event) => event.stopPropagation());
        const descInput = document.createElement("input");
        descInput.className = "task-desc-input";
        descInput.type = "text";
        descInput.maxLength = MAX_TASK_DESCRIPTION;
        descInput.value = task.description || "";
        descInput.addEventListener("click", (event) => event.stopPropagation());
        const freqSelect = createFrequencySelect(task.frequency);
        const assigneeSelect = createAssigneeSelect(machine, task.assignedTo);
        const custom = createCustomControls(task);
        custom.wrap.hidden = freqSelect.value !== "custom";
        freqSelect.addEventListener("change", () => {
          custom.wrap.hidden = freqSelect.value !== "custom";
          if (hooks.onContentResize) {
            requestAnimationFrame(() => hooks.onContentResize());
          }
        });
        const save = document.createElement("button");
        save.type = "button";
        save.className = "task-create-btn";
        save.textContent = t("general.save", "Guardar");
        save.addEventListener("click", (event) => {
          event.stopPropagation();
          if (hooks.onEditTask) {
            hooks.onEditTask(machine.id, task.id, {
              title: titleInput.value,
              description: descInput.value,
              frequency: freqSelect.value,
              customDueAmount: custom.amount.value,
              customDueUnit: custom.unit.value,
              assignedTo: readAssigneeSelect(assigneeSelect)
            });
          }
        });
        wrap.appendChild(titleInput);
        wrap.appendChild(descInput);
        wrap.appendChild(freqSelect);
        wrap.appendChild(assigneeSelect);
        wrap.appendChild(custom.wrap);
        wrap.appendChild(save);
        forms.appendChild(wrap);
        titleInput.focus();
        if (hooks.onContentResize) {
          requestAnimationFrame(() => hooks.onContentResize());
        }
      };

      const titleWrap = document.createElement("div");
      titleWrap.className = "task-title-wrap";
      titleWrap.appendChild(title);
      if (canCompleteTasks || canAddTaskNotes || canUploadTaskImages || canEditTasks || canDeleteTasks) {
        const openImagePicker = () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/jpeg,image/png,image/webp";
          input.multiple = true;
          input.hidden = true;
          input.addEventListener("change", () => {
            const files = Array.from(input.files || []).slice(0, 10);
            input.remove();
            if (files.length && hooks.onAddTaskImages) {
              hooks.onAddTaskImages(machine.id, task.id, files);
            }
          });
          document.body.appendChild(input);
          input.click();
        };
        titleWrap.appendChild(createTaskMenu({
          machine,
          task,
          hooks,
          completeTask: () => completeBtn?.click(),
          openNoteForm,
          openImagePicker,
          openEditForm,
          canCompleteTask: canCompleteTasks,
          canAddNotes: canAddTaskNotes,
          canUploadImages: canUploadTaskImages,
          canEditTask: canEditTasks,
          canDeleteTask: canDeleteTasks
        }));
      }

      const side = document.createElement("div");
      side.className = "task-side";
      side.appendChild(meta);
      line1.appendChild(titleWrap);
      line1.appendChild(side);
      body.appendChild(line1);

      const line2 = document.createElement("div");
      line2.className = "task-line task-line-desc";
      const desc = document.createElement("span");
      desc.className = "task-desc";
      desc.textContent = task.description || "";
      line2.appendChild(desc);
      body.appendChild(line2);

      item.appendChild(body);
      item.appendChild(forms);
      renderAttachments(item, task, hooks);
      renderNotes(item, task, hooks);
      list.appendChild(item);
    });
  } else {
    const empty = document.createElement("div");
    empty.className = "task-item task-empty";
    const emptyIcon = document.createElement("span");
    emptyIcon.className = "task-empty-icon";
    emptyIcon.innerHTML =
      '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<rect x="14" y="10" width="36" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="4"/>' +
      '<path d="M24 25h16M24 35h9" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M25 45l5 5 11-13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    const emptyText = document.createElement("span");
    emptyText.className = "task-empty-text";
    emptyText.textContent = t("tasks.emptyList", "No hay tareas que mostrar, crea una tarea para comenzar");
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    list.appendChild(empty);
  }

  panel.appendChild(list);

  if (canCreateTasks) {
    const formRow = document.createElement("div");
    formRow.className = "task-form";

    const titleInput = document.createElement("input");
    titleInput.className = "task-title-input";
    titleInput.type = "text";
    titleInput.placeholder = t("tasks.taskIncidentPlaceholder", "Tarea / incidencia");
    titleInput.maxLength = MAX_TASK_TITLE;
    titleInput.addEventListener("click", (event) => event.stopPropagation());

    const descInput = document.createElement("input");
    descInput.className = "task-desc-input";
    descInput.type = "text";
    descInput.placeholder = t("tasks.description", "Descripción");
    descInput.maxLength = MAX_TASK_DESCRIPTION;
    descInput.addEventListener("click", (event) => event.stopPropagation());

    const freqSelect = createFrequencySelect("");
    const assigneeSelect = createAssigneeSelect(machine);
    const custom = createCustomControls();
    custom.wrap.hidden = true;
    freqSelect.addEventListener("change", () => {
      custom.wrap.hidden = freqSelect.value !== "custom";
      if (hooks.onContentResize) {
        requestAnimationFrame(() => hooks.onContentResize());
      }
    });

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "task-create-btn task-create-submit";
    createBtn.textContent = t("tasks.create", "Crear");
    createBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const { task, error } = createTask({
        title: titleInput.value,
        description: descInput.value,
        frequency: freqSelect.value,
        customDueAmount: custom.amount.value,
        customDueUnit: custom.unit.value,
        createdBy: context.createdBy || null,
        assignedTo: readAssigneeSelect(assigneeSelect),
      });
      if (error) {
        const prev = createBtn.textContent;
        createBtn.textContent = t("tasks.reviewForm", "Revisa el formulario");
        setTimeout(() => (createBtn.textContent = prev), 1000);
        return;
      }
      if (hooks.onAddTask) hooks.onAddTask(machine.id, task, createBtn);
      titleInput.value = "";
      descInput.value = "";
      custom.amount.value = "1";
      custom.unit.value = "days";
      assigneeSelect.value = "";
    });

    formRow.appendChild(titleInput);
    formRow.appendChild(descInput);
    formRow.appendChild(freqSelect);
    formRow.appendChild(assigneeSelect);
    formRow.appendChild(custom.wrap);
    formRow.appendChild(createBtn);

    panel.appendChild(formRow);
  }
};
