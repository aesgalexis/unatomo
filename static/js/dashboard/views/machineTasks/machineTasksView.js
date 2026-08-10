import { t } from "/static/js/dashboard/i18n.js";
import { createDownloadMenu } from "/static/js/dashboard/components/downloadMenu/downloadMenu.js";
import { downloadHistoryRows } from "/static/js/dashboard/history/historyExport.js";
import {
  MACHINE_TASKS_PAGE_SIZE,
  getTaskRelatedItems,
  machineLabel,
  prepareMachineTaskEntries
} from "./machineTasksData.js";
import { renderMachineTaskComposer } from "./machineTasksComposer.js";
import {
  attachTooltip,
  formatDate,
  renderMachineTaskRows
} from "./machineTasksRows.js";

export { MACHINE_TASKS_PAGE_SIZE };

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
  header.appendChild(heading);
  if (options.loadingElement) header.appendChild(options.loadingElement);
  if (!options.loading) header.appendChild(headerActions);
  const headerContainer = options.headerContainer || root;

  if (options.loading) {
    headerContainer.appendChild(header);
    container.appendChild(root);
    return;
  }

  if (!machines.length) {
    headerContainer.appendChild(header);
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-state";
    empty.textContent = t("dashboard.machineTasksNoMachines", "No hay máquinas disponibles.");
    root.appendChild(empty);
    container.appendChild(root);
    return;
  }

  renderMachineTaskComposer(root, machines, options.onCreate, options.createOpen, options.onCloseCreate);
  headerContainer.appendChild(header);

  const {
    searchedEntries,
    entries,
    pageCount,
    page,
    visible
  } = prepareMachineTaskEntries(machines, {
    query: options.query,
    statusFilter,
    showCompleted,
    sort: options.sort,
    page: options.page
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

  const list = document.createElement("div");
  list.className = "global-registry-list machine-tasks-list";
  renderMachineTaskRows(list, visible, options);
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
