import { t } from "../i18n.js";
import { getTaskTiming } from "./tasks/tasksTime.js";
import { buildMachineStatistics } from "./statisticsModel.mjs";

const selectedPeriodByMachine = new Map();
const DAY = 24 * 60 * 60 * 1000;
const PERIODS = [
  { id: "30d", days: 30, labelKey: "stats.period30" },
  { id: "90d", days: 90, labelKey: "stats.period90" },
  { id: "1y", days: 365, labelKey: "stats.periodYear" },
  { id: "all", days: null, labelKey: "stats.periodAll" }
];

const formatDuration = (milliseconds) => {
  if (milliseconds == null) return t("stats.noData", "Sin datos");
  const minutes = Math.max(0, Math.round(milliseconds / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days} d ${hours} h`;
  if (hours) return `${hours} h ${mins} min`;
  return `${mins} min`;
};

const metric = (label, value, modifier = "") => {
  const node = document.createElement("div");
  node.className = `mc-stat-metric ${modifier}`.trim();
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  node.append(valueEl, labelEl);
  return node;
};

const section = (title) => {
  const node = document.createElement("section");
  node.className = "mc-stat-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  node.appendChild(heading);
  return node;
};

export const render = (container, machine) => {
  container.innerHTML = "";
  const now = Date.now();
  const selectedPeriod = selectedPeriodByMachine.get(machine.id) || "1y";
  const period = PERIODS.find((item) => item.id === selectedPeriod) || PERIODS[0];
  const stats = buildMachineStatistics(machine, now, {
    periodStart: period.days === null ? null : now - period.days * DAY,
    isOverdue: (task, now) => task.frequency !== "puntual" && getTaskTiming(task, now).pending
  });
  const root = document.createElement("div");
  root.className = "mc-stats";

  const periodNav = document.createElement("div");
  periodNav.className = "mc-stat-periods";
  periodNav.setAttribute("aria-label", t("stats.periodLabel", "Periodo de estadísticas"));
  PERIODS.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mc-stat-period-button";
    button.classList.toggle("is-active", item.id === period.id);
    button.setAttribute("aria-pressed", item.id === period.id ? "true" : "false");
    button.textContent = t(item.labelKey, item.id);
    button.addEventListener("click", () => {
      selectedPeriodByMachine.set(machine.id, item.id);
      render(container, machine);
    });
    periodNav.appendChild(button);
  });
  root.appendChild(periodNav);

  const availability = section(t("stats.availability", "Disponibilidad registrada"));
  if (!stats.status.hasData) {
    const empty = document.createElement("p");
    empty.className = "mc-stat-empty";
    empty.textContent = t("stats.insufficientStatusData", "Aún no hay cambios de estado suficientes para calcular la disponibilidad.");
    availability.appendChild(empty);
  } else {
    const availabilityValue = stats.status.availability == null
      ? t("stats.noData", "Sin datos")
      : `${Math.round(stats.status.availability)}%`;
    const grid = document.createElement("div");
    grid.className = "mc-stat-grid";
    grid.append(
      metric(t("stats.availability", "Disponibilidad registrada"), availabilityValue, "is-primary"),
      metric(t("stats.operationalTime", "Tiempo operativo"), formatDuration(stats.status.durations.operativa), "is-success"),
      metric(t("stats.outOfServiceTime", "Fuera de servicio"), formatDuration(stats.status.durations.fuera_de_servicio), "is-danger"),
      metric(t("stats.disconnectedTime", "Desconectada"), formatDuration(stats.status.durations.desconectada))
    );
    availability.appendChild(grid);

    const total = Object.values(stats.status.durations).reduce((sum, value) => sum + value, 0);
    if (total > 0) {
      const bar = document.createElement("div");
      bar.className = "mc-stat-status-bar";
      bar.setAttribute("aria-label", t("stats.availability", "Disponibilidad registrada"));
      ["operativa", "fuera_de_servicio", "desconectada"].forEach((status) => {
        const segment = document.createElement("span");
        segment.className = `is-${status}`;
        segment.style.width = `${(stats.status.durations[status] / total) * 100}%`;
        bar.appendChild(segment);
      });
      availability.appendChild(bar);
    }
  }

  const incidents = section(t("stats.incidents", "Incidencias"));
  if (stats.incidents.total === 0) {
    const clearState = document.createElement("div");
    clearState.className = "mc-stat-clear-state";
    clearState.innerHTML = '<span aria-hidden="true">✓</span>';
    const clearText = document.createElement("strong");
    clearText.textContent = t("stats.noIncidentsPeriod", "Sin incidencias registradas en este periodo");
    clearState.appendChild(clearText);
    incidents.appendChild(clearState);
  } else {
    const incidentGrid = document.createElement("div");
    incidentGrid.className = "mc-stat-grid";
    incidentGrid.append(
      metric(t("stats.totalIncidents", "Incidencias registradas"), String(stats.incidents.total)),
      metric(t("stats.recoveryMedian", "Mediana de recuperación"), stats.incidents.closed ? formatDuration(stats.incidents.medianRecovery) : t("stats.incidentInProgress", "Incidencia en curso")),
      metric(t("stats.longestIncident", "Incidencia más larga"), formatDuration(stats.incidents.longest)),
      metric(t("stats.currentStateFor", "Estado actual desde hace"), stats.status.currentSince ? formatDuration(now - stats.status.currentSince) : t("stats.noData", "Sin datos"))
    );
    incidents.appendChild(incidentGrid);
  }

  const maintenance = section(t("stats.maintenance", "Mantenimiento y tareas"));
  const taskGrid = document.createElement("div");
  taskGrid.className = "mc-stat-grid";
  taskGrid.append(
    metric(t("stats.completedTasks", "Tareas completadas"), String(stats.tasks.completed)),
    metric(
      t("stats.onTimeRate", "Cumplimiento en plazo"),
      stats.tasks.onTimeRate == null ? "0" : `${Math.round(stats.tasks.onTimeRate)}%`
    ),
    metric(t("stats.pendingNow", "Pendientes ahora"), String(stats.tasks.pending)),
    metric(t("stats.overdueNow", "Vencidas ahora"), String(stats.tasks.overdue), stats.tasks.overdue ? "is-warning" : "")
  );
  maintenance.appendChild(taskGrid);

  root.append(availability, incidents, maintenance);
  container.appendChild(root);
};
