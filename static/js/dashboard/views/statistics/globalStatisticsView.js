import { t } from "../../i18n.js";
import { buildMachineStatistics } from "../../tabs/statisticsModel.mjs";
import { getTaskTiming } from "../../tabs/tasks/tasksTime.js";
import { createDownloadMenu } from "../../components/downloadMenu/downloadMenu.js";
import { downloadStatisticsCsv, printStatisticsPdf } from "./statisticsExport.js";

const DAY = 24 * 60 * 60 * 1000;
const PERIODS = { "30d": 30, "90d": 90, "1y": 365, all: null };

const formatDuration = (milliseconds) => {
  if (milliseconds == null) return t("stats.noData", "Sin datos");
  const hours = Math.max(0, Math.round(milliseconds / (60 * 60 * 1000)));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days) return `${days} d ${remainingHours} h`;
  return `${hours} h`;
};

const createMetric = (label, value, modifier = "", trend = null) => {
  const item = document.createElement("div");
  item.className = `global-statistics-metric ${modifier}`.trim();
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  item.append(valueEl, labelEl);
  if (trend) {
    const trendEl = document.createElement("small");
    trendEl.className = `global-statistics-trend is-${trend.state}`;
    trendEl.textContent = `${trend.arrow} ${trend.text}`;
    item.appendChild(trendEl);
  }
  return item;
};

const aggregateEntries = (entries) => entries.reduce((result, entry) => {
  result.operational += entry.stats.status.durations.operativa;
  result.outOfService += entry.stats.status.durations.fuera_de_servicio;
  result.incidents += entry.stats.incidents.total;
  result.completed += entry.stats.tasks.completed;
  result.onTime += entry.stats.tasks.completed * ((entry.stats.tasks.onTimeRate || 0) / 100);
  return result;
}, { operational: 0, outOfService: 0, incidents: 0, completed: 0, onTime: 0 });

const rate = (part, total) => total ? (part / total) * 100 : null;

const buildTrend = (current, previous, higherIsBetter, format = (value) => String(value)) => {
  if (current == null || previous == null) {
    return { arrow: "→", text: t("dashboard.statisticsNoComparison", "Sin comparación"), state: "neutral" };
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) {
    return { arrow: "→", text: t("dashboard.statisticsStable", "Sin cambios"), state: "neutral" };
  }
  const rising = delta > 0;
  return {
    arrow: rising ? "↑" : "↓",
    text: format(Math.abs(delta)),
    state: rising === higherIsBetter ? "positive" : "negative"
  };
};

const matchesQuery = (machine, query) => {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return true;
  return [machine.title, machine.location, machine.brand, machine.model, machine.serial]
    .some((value) => String(value || "").toLocaleLowerCase().includes(needle));
};

const machineStats = (machine, now, periodStart) => buildMachineStatistics(machine, now, {
  periodStart,
  isOverdue: (task, time) => task.frequency !== "puntual" && getTaskTiming(task, time).pending
});

const compareAttention = (a, b) =>
  Number(b.currentIncident) - Number(a.currentIncident) ||
  b.stats.tasks.overdue - a.stats.tasks.overdue ||
  b.stats.incidents.total - a.stats.incidents.total ||
  (a.stats.status.availability ?? 101) - (b.stats.status.availability ?? 101);

const tableSortValue = (entry, key) => ({
  equipment: String(entry.machine.title || "").toLocaleLowerCase(),
  availability: entry.stats.status.availability ?? -1,
  incidents: entry.stats.incidents.total,
  outOfService: entry.stats.status.durations.fuera_de_servicio,
  onTime: entry.stats.tasks.onTimeRate ?? -1,
  overdue: entry.stats.tasks.overdue
})[key];

const sortTableEntries = (entries, key, direction) => [...entries].sort((a, b) => {
  const left = tableSortValue(a, key);
  const right = tableSortValue(b, key);
  const result = typeof left === "string"
    ? left.localeCompare(right)
    : left - right;
  return direction === "asc" ? result : -result;
});

export const renderGlobalStatisticsView = (container, machines = [], options = {}) => {
  container.className = "global-statistics-container";
  const root = document.createElement("section");
  root.className = "machine-tasks-view global-statistics-view";
  const now = Date.now();
  const period = Object.prototype.hasOwnProperty.call(PERIODS, options.period)
    ? options.period
    : "1y";
  const periodDays = PERIODS[period];
  const periodStart = periodDays === null ? null : now - periodDays * DAY;
  const filteredMachines = machines.filter((machine) => matchesQuery(machine, options.query));
  const entries = filteredMachines.map((machine) => ({
    machine,
    stats: machineStats(machine, now, periodStart),
    currentIncident: machine.status === "fuera_de_servicio" || machine.status === "desconectada"
  }));
  const previousEntries = periodDays === null ? null : filteredMachines.map((machine) => ({
    machine,
    stats: machineStats(machine, periodStart, periodStart - periodDays * DAY)
  }));

  const header = document.createElement("header");
  header.className = "machine-tasks-header global-statistics-header";
  const heading = document.createElement("h3");
  heading.textContent = t("dashboard.statisticsTitle", "Estadísticas");
  const headerActions = document.createElement("div");
  headerActions.className = "todo-header-actions global-statistics-header-actions";
  const scope = document.createElement("span");
  scope.className = "machine-tasks-summary";
  const totalMachineCount = Math.max(entries.length, Number(options.totalMachineCount) || 0);
  scope.textContent = entries.length === totalMachineCount
    ? t("dashboard.statisticsEquipmentCount", (count) => `${count} equipos`)(entries.length)
    : t("dashboard.statisticsEquipmentScopeCount", (count, total) => `${count} de ${total} equipos`)(entries.length, totalMachineCount);
  headerActions.appendChild(scope);
  header.append(heading, headerActions);
  if (options.loadingElement) header.insertBefore(options.loadingElement, headerActions);
  (options.headerContainer || root).appendChild(header);

  if (options.loading) {
    container.appendChild(root);
    return;
  }
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-state";
    empty.textContent = options.query
      ? t("dashboard.statisticsNoResults", "No hay equipos para esa búsqueda.")
      : t("dashboard.statisticsNoMachines", "No hay equipos disponibles.");
    root.appendChild(empty);
    container.appendChild(root);
    return;
  }

  const current = entries.reduce((totals, entry) => {
    const status = entry.machine.status || "operativa";
    if (status === "fuera_de_servicio") totals.outOfService += 1;
    else if (status === "desconectada") totals.disconnected += 1;
    else totals.operational += 1;
    totals.overdue += entry.stats.tasks.overdue;
    return totals;
  }, { operational: 0, outOfService: 0, disconnected: 0, overdue: 0 });

  const snapshot = document.createElement("section");
  snapshot.className = "global-statistics-section";
  const snapshotTitle = document.createElement("h4");
  snapshotTitle.textContent = t("dashboard.statisticsCurrent", "Estado actual");
  const snapshotGrid = document.createElement("div");
  snapshotGrid.className = "global-statistics-grid";
  snapshotGrid.append(
    createMetric(t("dashboard.statisticsOperational", "Operativas"), String(current.operational), "is-success"),
    createMetric(t("dashboard.statisticsOutOfService", "Fuera de servicio"), String(current.outOfService), "is-danger"),
    createMetric(t("dashboard.statisticsOverdueTasksNow", "Tareas vencidas ahora"), String(current.overdue), current.overdue ? "is-warning" : ""),
    createMetric(t("dashboard.statisticsDisconnected", "Desconectadas"), String(current.disconnected))
  );
  snapshot.append(snapshotTitle, snapshotGrid);

  const totals = aggregateEntries(entries);
  const previousTotals = previousEntries ? aggregateEntries(previousEntries) : null;
  const availabilityBase = totals.operational + totals.outOfService;
  const availability = availabilityBase ? Math.round((totals.operational / availabilityBase) * 100) : null;
  const onTimeRate = totals.completed ? Math.round((totals.onTime / totals.completed) * 100) : null;
  const previousAvailability = previousTotals
    ? rate(previousTotals.operational, previousTotals.operational + previousTotals.outOfService)
    : null;
  const previousOnTimeRate = previousTotals
    ? rate(previousTotals.onTime, previousTotals.completed)
    : null;

  const performance = document.createElement("section");
  performance.className = "global-statistics-section";
  const performanceTitle = document.createElement("h4");
  performanceTitle.textContent = t("dashboard.statisticsPerformance", "Rendimiento del periodo");
  const performanceGrid = document.createElement("div");
  performanceGrid.className = "global-statistics-grid";
  performanceGrid.append(
    createMetric(t("stats.availability", "Disponibilidad registrada"), availability == null ? t("stats.noData", "Sin datos") : `${availability}%`, "is-primary", buildTrend(availability, previousAvailability, true, (value) => `${Math.round(value)}%`)),
    createMetric(t("stats.outOfServiceTime", "Fuera de servicio"), formatDuration(totals.outOfService), totals.outOfService ? "is-danger" : "", buildTrend(totals.outOfService, previousTotals?.outOfService ?? null, false, formatDuration)),
    createMetric(t("stats.totalIncidents", "Incidencias registradas"), String(totals.incidents), "", buildTrend(totals.incidents, previousTotals?.incidents ?? null, false)),
    createMetric(t("stats.onTimeRate", "Cumplimiento en plazo"), onTimeRate == null ? t("stats.noData", "Sin datos") : `${onTimeRate}%`, "", buildTrend(onTimeRate, previousOnTimeRate, true, (value) => `${Math.round(value)}%`))
  );
  performance.append(performanceTitle, performanceGrid);

  const attentionEntries = [...entries].sort(compareAttention);
  const attention = document.createElement("section");
  attention.className = "global-statistics-section";
  const attentionTitle = document.createElement("h4");
  attentionTitle.textContent = t("dashboard.statisticsAttention", "Máquinas que requieren atención");
  attention.appendChild(attentionTitle);
  const requiringAttention = attentionEntries.filter((entry) =>
    entry.currentIncident ||
    entry.stats.tasks.overdue ||
    entry.stats.incidents.total >= 2 ||
    (entry.stats.status.availability !== null && entry.stats.status.availability < 95)
  ).slice(0, 6);
  if (!requiringAttention.length) {
    const clear = document.createElement("div");
    clear.className = "mc-stat-clear-state";
    clear.innerHTML = `<span aria-hidden="true">✓</span><strong>${t("dashboard.statisticsNoAttention", "No hay máquinas que requieran atención")}</strong>`;
    attention.appendChild(clear);
  } else {
    const list = document.createElement("div");
    list.className = "global-statistics-attention-list";
    requiringAttention.forEach((entry) => {
      const button = document.createElement(options.onSelectMachine ? "button" : "div");
      if (options.onSelectMachine) button.type = "button";
      button.className = "global-statistics-attention-item";
      const title = document.createElement("strong");
      title.textContent = entry.machine.title || t("machine.machine", "Equipo");
      const reason = document.createElement("span");
      const reasons = [];
      if (entry.currentIncident) reasons.push(t("dashboard.statisticsCurrentlyUnavailable", "Actualmente no operativa"));
      if (entry.stats.tasks.overdue) reasons.push(t("dashboard.statisticsOverdueCount", (count) => `${count} tareas vencidas`)(entry.stats.tasks.overdue));
      if (entry.stats.incidents.total >= 2) reasons.push(t("dashboard.statisticsIncidentCount", (count) => `${count} incidencias`)(entry.stats.incidents.total));
      if (
        entry.stats.status.availability !== null &&
        entry.stats.status.availability < 95
      ) reasons.push(t("dashboard.statisticsAvailabilityValue", (value) => `${value}% de disponibilidad`)(Math.round(entry.stats.status.availability)));
      reason.textContent = reasons.join(" · ");
      button.append(title, reason);
      if (options.onSelectMachine) {
        button.addEventListener("click", () => options.onSelectMachine(entry.machine.id));
      }
      list.appendChild(button);
    });
    attention.appendChild(list);
  }

  const comparison = document.createElement("section");
  comparison.className = "global-statistics-section";
  const comparisonTitle = document.createElement("h4");
  comparisonTitle.textContent = t("dashboard.statisticsComparison", "Comparativa de equipos");
  comparison.appendChild(comparisonTitle);
  const tableWrap = document.createElement("div");
  tableWrap.className = "global-statistics-table-wrap";
  const table = document.createElement("table");
  table.className = "global-statistics-table";
  const headers = [
    t("dashboard.statisticsMachine", "Equipo"),
    t("stats.availability", "Disponibilidad"),
    t("stats.totalIncidents", "Incidencias"),
    t("stats.outOfServiceTime", "Tiempo fuera"),
    t("stats.onTimeRate", "En plazo"),
    t("dashboard.statisticsOverdueTasks", "Tareas vencidas")
  ];
  const headerKeys = ["equipment", "availability", "incidents", "outOfService", "onTime", "overdue"];
  const sortState = { key: "availability", direction: "desc" };
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const syncSortHeaders = () => {
    headRow.querySelectorAll("th").forEach((cell) => {
      const active = cell.dataset.sortKey === sortState.key;
      cell.setAttribute("aria-sort", active
        ? (sortState.direction === "asc" ? "ascending" : "descending")
        : "none");
      const indicator = cell.querySelector(".global-statistics-sort-indicator");
      if (indicator) indicator.textContent = active
        ? (sortState.direction === "asc" ? "▲" : "▼")
        : "";
    });
  };
  headers.forEach((label, index) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.dataset.sortKey = headerKeys[index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "global-statistics-sort-button";
    const text = document.createElement("span");
    text.textContent = label;
    const indicator = document.createElement("span");
    indicator.className = "global-statistics-sort-indicator";
    indicator.setAttribute("aria-hidden", "true");
    button.append(text, indicator);
    button.addEventListener("click", () => {
      const key = headerKeys[index];
      if (sortState.key === key) {
        sortState.direction = sortState.direction === "desc" ? "asc" : "desc";
      } else {
        sortState.key = key;
        sortState.direction = key === "equipment" ? "asc" : "desc";
      }
      syncSortHeaders();
      renderRows();
    });
    cell.appendChild(button);
    headRow.appendChild(cell);
  });
  head.appendChild(headRow);
  const body = document.createElement("tbody");
  const tableRowValues = (entry) => [
    entry.machine.title || t("machine.machine", "Equipo"),
    entry.stats.status.availability == null ? "-" : `${Math.round(entry.stats.status.availability)}%`,
    String(entry.stats.incidents.total),
    formatDuration(entry.stats.status.durations.fuera_de_servicio),
    entry.stats.tasks.onTimeRate == null ? "-" : `${Math.round(entry.stats.tasks.onTimeRate)}%`,
    String(entry.stats.tasks.overdue)
  ];
  const renderRows = () => {
    body.replaceChildren();
    sortTableEntries(entries, sortState.key, sortState.direction).forEach((entry) => {
    const row = document.createElement("tr");
    if (options.onSelectMachine) {
      row.tabIndex = 0;
      row.addEventListener("click", () => options.onSelectMachine(entry.machine.id));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") options.onSelectMachine(entry.machine.id);
      });
    }
    const values = tableRowValues(entry);
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = value;
      row.appendChild(cell);
    });
      body.appendChild(row);
    });
  };
  syncSortHeaders();
  renderRows();
  const periodLabels = {
    "30d": t("dashboard.statisticsPeriod30", "30 días"),
    "90d": t("dashboard.statisticsPeriod90", "90 días"),
    "1y": t("dashboard.statisticsPeriodYear", "1 año"),
    all: t("dashboard.statisticsPeriodAll", "Desde el inicio")
  };
  const downloadMenu = createDownloadMenu({
    placement: "bottom",
    className: "machine-tasks-download global-statistics-download",
    formats: [
      { id: "csv", label: t("history.downloadExcel", "Excel (.csv)"), extension: "CSV" },
      { id: "pdf", label: t("dashboard.statisticsDownloadPdf", "PDF (.pdf)"), extension: "PDF" }
    ],
    onSelect: (format) => {
      const rows = sortTableEntries(entries, sortState.key, sortState.direction)
        .map(tableRowValues);
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `estadisticas_equipos_${stamp}`;
      if (format === "pdf") {
        printStatisticsPdf(
          t("dashboard.statisticsComparison", "Comparativa de equipos"),
          periodLabels[period],
          headers,
          rows
        );
      } else {
        downloadStatisticsCsv(headers, rows, filename);
      }
    }
  });
  const downloadLabel = t("dashboard.statisticsDownload", "Descargar comparativa");
  downloadMenu.toggle.setAttribute("data-tooltip", downloadLabel);
  downloadMenu.toggle.setAttribute("aria-label", downloadLabel);
  headerActions.appendChild(downloadMenu.wrap);
  table.append(head, body);
  tableWrap.appendChild(table);
  comparison.appendChild(tableWrap);
  if (options.hasTreeScope) {
    const clearScopeWrap = document.createElement("div");
    clearScopeWrap.className = "global-statistics-clear-scope-wrap";
    const clearScope = document.createElement("button");
    clearScope.type = "button";
    clearScope.className = "dashboard-users-secondary";
    clearScope.textContent = t("dashboard.statisticsShowAll", "Ver todos los equipos");
    clearScope.addEventListener("click", () => options.onClearScope?.());
    clearScopeWrap.appendChild(clearScope);
    comparison.appendChild(clearScopeWrap);
  }

  root.append(snapshot, performance, comparison);
  container.appendChild(root);
};
