import { t } from "/static/js/dashboard/i18n.js";
import {
  CUSTOM_TASK_UNITS,
  MAX_TASK_DESCRIPTION,
  MAX_TASK_NOTE,
  MAX_TASK_TITLE,
  createTask,
  normalizeTasks
} from "./tasksModel.js";
import { getTaskTiming } from "./tasksTime.js";

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

const createFrequencySelect = (value = "puntual") => {
  const select = document.createElement("select");
  select.className = "task-frequency-select";
  frequencyKeys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = frequencyLabel(key);
    select.appendChild(option);
  });
  select.value = value || "puntual";
  select.addEventListener("click", (event) => event.stopPropagation());
  return select;
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

const createTaskActions = ({ machine, task, hooks, openNoteForm, openEditForm }) => {
  const actions = document.createElement("span");
  actions.className = "task-actions";

  const note = document.createElement("button");
  note.type = "button";
  note.className = "task-note-action";
  note.setAttribute("aria-label", t("tasks.addNote", "Añadir nota"));
  note.setAttribute("data-tooltip", t("tasks.addNote", "Añadir nota"));
  note.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M5 4h10l4 4v12H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M15 4v5h5M8 14h8M12 10v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  note.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openNoteForm();
  });

  const menu = document.createElement("span");
  menu.className = "mc-doc-menu task-menu";

  const dots = document.createElement("button");
  dots.type = "button";
  dots.className = "mc-doc-menu-dots";
  dots.setAttribute("aria-label", t("general.moreOptions", "Más opciones"));
  dots.textContent = "...";
  dots.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    menu.classList.toggle("is-open");
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "mc-doc-menu-link task-menu-link";
  edit.textContent = t("general.edit", "Editar");
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.remove("is-open");
    openEditForm();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mc-doc-menu-link mc-doc-menu-delete task-menu-link";
  remove.textContent = t("tasks.remove", "Eliminar");
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onRemoveTask) hooks.onRemoveTask(machine.id, task.id);
  });

  menu.appendChild(dots);
  menu.appendChild(remove);
  menu.appendChild(edit);
  actions.appendChild(note);
  actions.appendChild(menu);
  return actions;
};

const renderNotes = (item, task) => {
  const notes = Array.isArray(task.notes) ? task.notes : [];
  if (!notes.length) return;
  const details = document.createElement("details");
  details.className = "task-notes";
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

export const renderTasksPanel = (panel, machine, hooks, options = {}, context = {}) => {
  panel.innerHTML = "";
  const canEditTasks = options.canEditTasks !== false;
  const canCompleteTasks = options.canCompleteTasks !== false;

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
      title.textContent = task.title || t("tasks.task", "Tarea");

      const meta = document.createElement("div");
      meta.className = "task-meta";

      const timing = getTaskTiming(task);
      const remaining = document.createElement("span");
      remaining.className = "task-remaining";
      remaining.textContent = timing.label;
      meta.appendChild(remaining);

      if (timing.pending) {
        const pending = document.createElement("span");
        pending.className = "task-pending";
        pending.textContent = t("tasks.pending", "Pendiente");
        meta.appendChild(pending);
      }

      if (canCompleteTasks) {
        const completeBtn = document.createElement("button");
        completeBtn.type = "button";
        completeBtn.className = "task-complete-btn";
        completeBtn.textContent = t("tasks.completed", "Completada");
        completeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          if (hooks.onCompleteTask) hooks.onCompleteTask(machine.id, task.id, context);
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
        const custom = createCustomControls(task);
        custom.wrap.hidden = freqSelect.value !== "custom";
        freqSelect.addEventListener("change", () => {
          custom.wrap.hidden = freqSelect.value !== "custom";
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
              customDueUnit: custom.unit.value
            });
          }
        });
        wrap.appendChild(titleInput);
        wrap.appendChild(descInput);
        wrap.appendChild(freqSelect);
        wrap.appendChild(custom.wrap);
        wrap.appendChild(save);
        forms.appendChild(wrap);
        titleInput.focus();
      };

      line1.appendChild(title);
      const side = document.createElement("div");
      side.className = "task-side";
      if (canEditTasks) {
        side.appendChild(createTaskActions({ machine, task, hooks, openNoteForm, openEditForm }));
      }
      side.appendChild(meta);
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
      renderNotes(item, task);
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

  if (canEditTasks) {
    const formRow = document.createElement("div");
    formRow.className = "task-form";

    const titleInput = document.createElement("input");
    titleInput.className = "task-title-input";
    titleInput.type = "text";
    titleInput.placeholder = t("tasks.task", "Tarea");
    titleInput.maxLength = MAX_TASK_TITLE;
    titleInput.addEventListener("click", (event) => event.stopPropagation());

    const descInput = document.createElement("input");
    descInput.className = "task-desc-input";
    descInput.type = "text";
    descInput.placeholder = t("tasks.description", "Descripción");
    descInput.maxLength = MAX_TASK_DESCRIPTION;
    descInput.addEventListener("click", (event) => event.stopPropagation());

    const freqSelect = createFrequencySelect("puntual");
    const custom = createCustomControls();
    custom.wrap.hidden = true;
    freqSelect.addEventListener("change", () => {
      custom.wrap.hidden = freqSelect.value !== "custom";
    });

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "task-create-btn";
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
    });

    formRow.appendChild(titleInput);
    formRow.appendChild(descInput);
    formRow.appendChild(freqSelect);
    formRow.appendChild(custom.wrap);
    formRow.appendChild(createBtn);

    panel.appendChild(formRow);
  }
};
