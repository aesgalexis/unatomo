import { normalizeTasks, createTask, MAX_TASK_TITLE } from "./tasksModel.js";
import { getTaskTiming } from "./tasksTime.js";

export const renderTasksPanel = (panel, machine, hooks, options = {}, context = {}) => {
  panel.innerHTML = "";
  const canEditTasks = options.canEditTasks !== false;
  const canCompleteTasks = options.canCompleteTasks !== false;

  const list = document.createElement("div");
  list.className = "task-list";

  const tasks = normalizeTasks(machine.tasks || []);
  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "task-empty";
    empty.textContent = "Sin tareas.";
    list.appendChild(empty);
  } else {
    tasks.forEach((task) => {
      const item = document.createElement("div");
      item.className = "task-item";

      const line1 = document.createElement("div");
      line1.className = "task-line task-line-main";

      const title = document.createElement("strong");
      title.className = "task-title";
      title.textContent = task.title || "Tarea";

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
        pending.textContent = "Pendiente";
        meta.appendChild(pending);
      }

      if (canCompleteTasks) {
        const completeBtn = document.createElement("button");
        completeBtn.type = "button";
        completeBtn.className = "task-complete-btn";
        completeBtn.textContent = "Completada";
        completeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          if (hooks.onCompleteTask) hooks.onCompleteTask(machine.id, task.id, context);
        });
        meta.appendChild(completeBtn);
      }

      line1.appendChild(title);
      line1.appendChild(meta);

      const line2 = document.createElement("div");
      line2.className = "task-line task-line-desc";

      const desc = document.createElement("span");
      desc.className = "task-desc";
      desc.textContent = task.description || "";
      line2.appendChild(desc);

      item.appendChild(line1);
      item.appendChild(line2);

      if (canEditTasks) {
        const remove = document.createElement("a");
        remove.className = "task-remove-link";
        remove.textContent = "eliminar";
        remove.href = "#";
        remove.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (hooks.onRemoveTask) hooks.onRemoveTask(machine.id, task.id);
        });
        item.appendChild(remove);
      }

      list.appendChild(item);
    });
  }

  panel.appendChild(list);

  if (canEditTasks) {
    const sep = document.createElement("hr");
    sep.className = "mc-sep";

    const formRow = document.createElement("div");
    formRow.className = "task-form";

    const titleInput = document.createElement("input");
    titleInput.className = "task-title-input";
    titleInput.type = "text";
    titleInput.placeholder = "T?tulo (m?x 64 caracteres)";
    titleInput.maxLength = MAX_TASK_TITLE;
    titleInput.addEventListener("click", (event) => event.stopPropagation());

    const descInput = document.createElement("input");
    descInput.className = "task-desc-input";
    descInput.type = "text";
    descInput.placeholder = "Descripci?n de la tarea";
    descInput.maxLength = 255;
    descInput.addEventListener("click", (event) => event.stopPropagation());

    const freqSelect = document.createElement("select");
    freqSelect.className = "task-frequency-select";
    ["diaria", "semanal", "mensual", "trimestral", "semestral", "anual"].forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent =
        key === "diaria"
          ? "Diaria"
          : key === "semanal"
          ? "Semanal"
          : key === "mensual"
          ? "Mensual"
          : key === "trimestral"
          ? "Trimestral"
          : key === "semestral"
          ? "Semestral"
          : "Anual";
      freqSelect.appendChild(option);
    });
    freqSelect.addEventListener("click", (event) => event.stopPropagation());

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "task-create-btn";
    createBtn.textContent = "Crear";
    createBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const { task, error } = createTask({
        title: titleInput.value,
        description: descInput.value,
        frequency: freqSelect.value,
        createdBy: context.createdBy || null
      });
      if (error) {
        titleInput.setAttribute("aria-invalid", "true");
        const prev = createBtn.textContent;
        createBtn.textContent = "Revisa el t?tulo";
        setTimeout(() => (createBtn.textContent = prev), 1000);
        return;
      }
      titleInput.removeAttribute("aria-invalid");
      if (hooks.onAddTask) hooks.onAddTask(machine.id, task, createBtn);
      titleInput.value = "";
      descInput.value = "";
    });

    formRow.appendChild(titleInput);
    formRow.appendChild(descInput);
    formRow.appendChild(freqSelect);
    formRow.appendChild(createBtn);

    panel.appendChild(sep);
    panel.appendChild(formRow);
  }
};
