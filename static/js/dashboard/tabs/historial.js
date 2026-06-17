import { t } from "/static/js/dashboard/i18n.js";
import {
  formatHistoryLog,
  getTaskLogKeys,
  isTaskCreatedLog,
  isTaskNoteLog,
} from "../history/historyEventFormatter.js";

const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isRestoreOperationLog = (log = {}) => {
  const title = normalizeText(log.title);
  return (
    log.source === RESTORE_OPERATION_TASK_SOURCE ||
    title.includes("operatividad") ||
    title.includes("operation")
  );
};

const isTaskChildLog = (log = {}) =>
  isTaskNoteLog(log) ||
  log.type === "task" ||
  log.type === "task_edited";

const addGroupedLog = (map, key, entry) => {
  if (!key) return;
  const logs = map.get(key) || [];
  if (!logs.some((item) => item.index === entry.index)) logs.push(entry);
  map.set(key, logs);
};

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const total = machine.logs ? machine.logs.length : 0;

  const locale = document.documentElement.lang === "en" ? "en-GB" : "es-ES";

  const form = document.createElement("div");
  form.className = "mc-log-form";

  const label = document.createElement("span");
  label.className = "mc-log-label";
  label.textContent = t("history.intervention", "Intervencion");

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 255;
  input.className = "mc-log-input";
  input.addEventListener("click", (event) => event.stopPropagation());

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mc-log-btn";
  btn.textContent = t("history.register", "Registrar");
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const value = input.value.trim();
    if (!value) return;
    if (hooks.onAddIntervention) hooks.onAddIntervention(machine, value);
    input.value = "";
  });

  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(btn);
  panel.appendChild(form);

  const sepTop = document.createElement("hr");
  sepTop.className = "mc-sep";
  panel.appendChild(sepTop);

  const list = document.createElement("div");
  list.className = "mc-log-list";
  if (!total) {
    const empty = document.createElement("div");
    empty.className = "mc-log-item";
    empty.textContent = t("history.empty", "Sin registros.");
    list.appendChild(empty);
  }

  const rawLogs = Array.isArray(machine.logs)
    ? machine.logs.map((log, index) => ({ log, index, time: toTime(log.ts) }))
    : [];
  const taskParentKeys = new Set();
  const restoreCycleTaskKeys = new Map();

  rawLogs.forEach((entry) => {
    const { log } = entry;
    if (!isTaskCreatedLog(log)) return;
    getTaskLogKeys(log).forEach((key) => taskParentKeys.add(key));

    const cycleId = String(log.statusCycleId || "").trim();
    if (cycleId && isRestoreOperationLog(log)) {
      const keys = restoreCycleTaskKeys.get(cycleId) || new Set();
      getTaskLogKeys(log).forEach((key) => keys.add(key));
      restoreCycleTaskKeys.set(cycleId, keys);
    }
  });

  const childrenByTaskKey = new Map();
  const childIndexes = new Set();
  rawLogs.forEach((entry) => {
    const { log } = entry;
    if (isTaskChildLog(log)) {
      const keys = getTaskLogKeys(log).filter((key) => taskParentKeys.has(key));
      keys.forEach((key) => addGroupedLog(childrenByTaskKey, key, entry));
      if (keys.length) childIndexes.add(entry.index);
      return;
    }

    const cycleId = String(log.statusCycleId || "").trim();
    const isCycleReturn =
      log.type === "status" &&
      log.value === "operativa" &&
      restoreCycleTaskKeys.has(cycleId);
    if (!isCycleReturn) return;

    restoreCycleTaskKeys.get(cycleId).forEach((key) => {
      addGroupedLog(childrenByTaskKey, key, entry);
    });
    childIndexes.add(entry.index);
  });

  const getTaskChildren = (log) => {
    const children = [];
    getTaskLogKeys(log).forEach((key) => {
      (childrenByTaskKey.get(key) || []).forEach((entry) => {
        if (!children.some((item) => item.index === entry.index)) children.push(entry);
      });
    });
    return children.sort((a, b) => (a.time - b.time) || (a.index - b.index));
  };

  const appendLog = (log, indent = false) => {
    const item = document.createElement("div");
    item.className = indent ? "mc-log-item mc-log-item-indent" : "mc-log-item";
    const time = new Date(log.ts).toLocaleString(locale);
    item.textContent = `${time} - ${formatHistoryLog(log, {
      omitTaskTitle: indent && log.type === "task_note_added",
    })}`;
    list.appendChild(item);
  };

  rawLogs
    .filter((entry) => !childIndexes.has(entry.index))
    .map((entry) => {
      const children = isTaskCreatedLog(entry.log) ? getTaskChildren(entry.log) : [];
      const childTime = children.reduce((max, child) => Math.max(max, child.time), 0);
      return {
        ...entry,
        children,
        displayTime: Math.max(entry.time, childTime),
      };
    })
    .sort((a, b) => (b.displayTime - a.displayTime) || (b.index - a.index))
    .slice(0, 16)
    .forEach((entry) => {
      appendLog(entry.log);
      entry.children.forEach((child) => appendLog(child.log, true));
    });
  panel.appendChild(list);

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  const footer = document.createElement("div");
  footer.className = "mc-log-footer";

  const counter = document.createElement("div");
  counter.className = "mc-log-header";
  const visibleCount = Math.min(16, total);
  counter.textContent = `${visibleCount}/${total}`;
  footer.appendChild(counter);

  if (options.canDownloadHistory !== false) {
    const download = document.createElement("a");
    download.className = "mc-log-download";
    download.setAttribute("aria-label", t("history.download", "Descargar registro completo"));
    download.setAttribute("data-tooltip", t("history.download", "Descargar registro completo"));
    download.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/></svg>';
    const clearTooltips = () => {
      document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
    };
    let tipEl = null;
    const showTip = (event) => {
      const labelText = download.getAttribute("data-tooltip");
      if (!labelText) return;
      clearTooltips();
      tipEl = document.createElement("div");
      tipEl.className = "mc-tooltip";
      tipEl.textContent = labelText;
      document.body.appendChild(tipEl);
      const x = (event && event.clientX) || 0;
      const y = (event && event.clientY) || 0;
      const left = x - tipEl.offsetWidth - 12;
      const top = y - tipEl.offsetHeight - 10;
      tipEl.style.top = `${Math.max(8, top)}px`;
      tipEl.style.left = `${Math.max(8, left)}px`;
    };
    const hideTip = () => {
      if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
      tipEl = null;
    };
    download.addEventListener("mouseenter", showTip);
    download.addEventListener("mouseleave", hideTip);
    download.addEventListener("blur", hideTip);
    download.href = "#";
    download.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onDownloadLogs) hooks.onDownloadLogs(machine);
    });
    footer.appendChild(download);
  }
  panel.appendChild(footer);
};
