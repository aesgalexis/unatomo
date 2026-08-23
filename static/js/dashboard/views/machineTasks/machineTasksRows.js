import { t } from "/static/js/dashboard/i18n.js";
import {
  MOBILE_ACTION_ICONS,
  createMobileActionSheet,
  decorateMobileAction
} from "/static/js/dashboard/components/mobileActionSheet/mobileActionSheet.js";
import {
  getTaskRelatedItems,
  machineLabel
} from "./machineTasksData.js";

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");
const ONE_OFF_COMPLETION_ANIMATION_MS = 420;

const waitForOneOffCompletionAnimation = () => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  return new Promise((resolve) => window.setTimeout(resolve, ONE_OFF_COMPLETION_ANIMATION_MS));
};

export const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString(getLocale()) : "";
};

export const attachTooltip = (target) => {
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

export const createTaskCompletionControl = ({ machine, task, onCompleteTask }) => {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "task-complete-btn";
  control.setAttribute("role", "checkbox");
  control.setAttribute("aria-checked", "false");
  const isRestoreTask = task.source === "status-out-of-service";
  const label = isRestoreTask
    ? t("tasks.markIncidentResolved", "Marcar incidencia como resuelta")
    : t("tasks.markCompleted", "Marcar como completada");
  control.setAttribute("aria-label", label);
  control.setAttribute("data-tooltip", label);
  control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" pathLength="1"/><path d="m8.5 12 2.25 2.25L15.5 9.5"/></svg>';
  control.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onCompleteTask || control.disabled) return;
    control.disabled = true;
    const animateBeforeRemoval =
      task.frequency === "puntual" && task.source !== "status-out-of-service";
    if (animateBeforeRemoval) {
      control.classList.add("is-completing");
      control.classList.add("is-one-off-completing");
    }
    try {
      if (animateBeforeRemoval) await waitForOneOffCompletionAnimation();
      await onCompleteTask(machine.id, task.id);
    } finally {
      if (control.isConnected) {
        control.disabled = false;
        control.classList.remove("is-completing");
        control.classList.remove("is-one-off-completing");
      }
    }
  });
  attachTooltip(control);
  return control;
};

export const createTaskActionsMenu = ({ machine, task, forms, options }) => {
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
  let actionSheet = null;
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    actionSheet?.close();
    if (documentClickHandler) {
      document.removeEventListener("click", documentClickHandler, true);
      documentClickHandler = null;
    }
  };
  const open = () => {
    actionSheet?.open();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    documentClickHandler = (event) => {
      if (!menu.contains(event.target) && !panel.contains(event.target)) close();
    };
    document.addEventListener("click", documentClickHandler, true);
  };
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel.hidden) open();
    else close();
  });
  actionSheet = createMobileActionSheet({ container: menu, panel, onRequestClose: close });
  const action = (label, handler, className = "", icon = MOBILE_ACTION_ICONS.edit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `todo-item-menu-action ${className}`.trim();
    button.setAttribute("role", "menuitem");
    decorateMobileAction(button, icon, label);
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
  }, "", MOBILE_ACTION_ICONS.note);
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
  }, "", MOBILE_ACTION_ICONS.images);
  action(t("tasks.deleteTask", "Eliminar tarea"), () => {
    options.onRemoveTask?.(machine.id, task.id);
  }, "todo-item-delete", MOBILE_ACTION_ICONS.delete);
  menu.append(toggle, panel);
  return menu;
};

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

export const renderMachineTaskRows = (list, entries, options) => {
  entries.forEach(({ machine, task, timing, completed }) => {
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
    const titleWrap = document.createElement("span");
    titleWrap.className = "machine-tasks-title-wrap";
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
      titleWrap.append(title, createTaskActionsMenu({ machine, task, forms, options }));
      titleActions.appendChild(createTaskCompletionControl({
        machine,
        task,
        onCompleteTask: options.onCompleteTask
      }));
    } else {
      titleWrap.appendChild(title);
    }
    titleLine.append(titleWrap, titleActions);
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
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-state";
    empty.textContent = options.hasTasksOutsideSidebarScope
      ? t(
          "tasks.sidebarFilterEmpty",
          "No hay tareas en las máquinas visibles. Muestra más máquinas en la barra lateral para ver sus tareas."
        )
      : t("tasks.emptyList", "No hay tareas que mostrar, crea una tarea para comenzar");
    list.appendChild(empty);
  }
};
