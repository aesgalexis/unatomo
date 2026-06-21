import { t } from "/static/js/dashboard/i18n.js";
import {
  formatHistoryLog,
  getTaskLogKeys,
  isTaskAttachmentLog,
  isTaskCreatedLog,
  isTaskNoteLog,
} from "../history/historyEventFormatter.js";

const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";
const HISTORY_VISIBLE_LIMIT = 16;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
  isTaskAttachmentLog(log) ||
  log.type === "task" ||
  log.type === "task_edited";

const isStatusDownLog = (log = {}) =>
  log.type === "status" && log.value === "fuera_de_servicio";

const isStatusOperativeLog = (log = {}) =>
  log.type === "status" && log.value === "operativa";

const isStatusCycleLog = (log = {}) =>
  isStatusDownLog(log) || isStatusOperativeLog(log) || isRestoreOperationLog(log);

const orderCycleChildren = (entries = []) => {
  const ordered = entries
    .slice()
    .sort((a, b) => (a.time - b.time) || (a.index - b.index));
  const attachments = ordered.filter((entry) => isTaskAttachmentLog(entry.log));
  if (!attachments.length) return ordered;
  const remaining = ordered.filter((entry) => !isTaskAttachmentLog(entry.log));
  const firstNoteIndex = remaining.findIndex((entry) => isTaskNoteLog(entry.log));
  if (firstNoteIndex < 0) return ordered;
  remaining.splice(firstNoteIndex, 0, ...attachments);
  return remaining;
};

const addGroupedLog = (map, key, entry) => {
  if (!key) return;
  const logs = map.get(key) || [];
  if (!logs.some((item) => item.index === entry.index)) logs.push(entry);
  map.set(key, logs);
};

const getScopedTaskLogKeys = (log = {}) => {
  const taskId = String(log.taskId || "").trim();
  const cycleId = String(log.statusCycleId || "").trim();
  const title = String(log.title || "").trim().toLowerCase();
  const restoreLog = isRestoreOperationLog(log);

  if (!restoreLog) return getTaskLogKeys(log);

  if (cycleId) {
    return [
      taskId ? `id:${taskId}` : "",
      `cycle:${cycleId}`,
      !taskId && title ? `cycle-title:${cycleId}:${title}` : "",
    ].filter(Boolean);
  }

  if (taskId) return [`id:${taskId}`];
  return getTaskLogKeys(log);
};

const unitLabel = (key, count) => t(`tasks.${count === 1 ? key : `${key}s`}`, key);

const formatDuration = (diffMs) => {
  const diff = Math.max(0, diffMs);
  if (diff < HOUR) {
    const minutes = Math.max(1, Math.ceil(diff / MINUTE));
    return `${minutes} ${unitLabel("minute", minutes)}`;
  }
  if (diff < DAY) {
    const hours = Math.max(1, Math.ceil(diff / HOUR));
    return `${hours} ${unitLabel("hour", hours)}`;
  }
  const days = Math.max(1, Math.ceil(diff / DAY));
  if (days >= 30) {
    const months = Math.ceil(days / 30);
    return `${months} ${unitLabel("month", months)}`;
  }
  if (days >= 7) {
    const weeks = Math.ceil(days / 7);
    return `${weeks} ${unitLabel("week", weeks)}`;
  }
  return `${days} ${unitLabel("day", days)}`;
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
  const statusCycleStartTimes = new Map();
  const taskParentKeys = new Set();
  const restoreCycleTaskKeys = new Map();
  const explicitCycles = new Map();

  rawLogs.forEach((entry) => {
    const { log } = entry;
    const cycleId = String(log.statusCycleId || "").trim();
    if (cycleId && isStatusCycleLog(log)) {
      const logs = explicitCycles.get(cycleId) || [];
      logs.push(entry);
      explicitCycles.set(cycleId, logs);
    }
    if (cycleId && isStatusDownLog(log)) {
      statusCycleStartTimes.set(cycleId, entry.time);
    }
    if (!isTaskCreatedLog(log)) return;
    getScopedTaskLogKeys(log).forEach((key) => taskParentKeys.add(key));

    if (cycleId && isRestoreOperationLog(log)) {
      const keys = restoreCycleTaskKeys.get(cycleId) || new Set();
      getScopedTaskLogKeys(log).forEach((key) => keys.add(key));
      restoreCycleTaskKeys.set(cycleId, keys);
    }
  });

  const cycleChildrenByParentIndex = new Map();
  const cycleChildIndexes = new Set();
  explicitCycles.forEach((entries) => {
    const parent = entries.find((entry) => isStatusDownLog(entry.log));
    if (!parent) return;
    const children = orderCycleChildren(
      entries.filter((entry) => entry.index !== parent.index)
    );
    if (!children.length) return;
    cycleChildrenByParentIndex.set(parent.index, children);
    children.forEach((entry) => cycleChildIndexes.add(entry.index));
  });

  const childrenByTaskKey = new Map();
  const childIndexes = new Set(cycleChildIndexes);
  rawLogs.forEach((entry) => {
    if (cycleChildIndexes.has(entry.index)) return;
    const { log } = entry;
    if (isTaskChildLog(log)) {
      const keys = getScopedTaskLogKeys(log).filter((key) => taskParentKeys.has(key));
      keys.forEach((key) => addGroupedLog(childrenByTaskKey, key, entry));
      if (keys.length) childIndexes.add(entry.index);
      return;
    }

    const cycleId = String(log.statusCycleId || "").trim();
    const isCycleReturn =
      isStatusOperativeLog(log) && restoreCycleTaskKeys.has(cycleId);
    if (!isCycleReturn) return;

    restoreCycleTaskKeys.get(cycleId).forEach((key) => {
      addGroupedLog(childrenByTaskKey, key, entry);
    });
    childIndexes.add(entry.index);
  });

  const getTaskChildren = (log) => {
    const children = [];
    getScopedTaskLogKeys(log).forEach((key) => {
      (childrenByTaskKey.get(key) || []).forEach((entry) => {
        if (!children.some((item) => item.index === entry.index)) children.push(entry);
      });
    });
    return children.sort((a, b) => (a.time - b.time) || (a.index - b.index));
  };

  const getDisplayLog = (log, parentLog = null) => {
    if (log.type !== "task" || !log.punctual) return log;
    const cycleId = String(log.statusCycleId || "").trim();
    const completedTime = toTime(log.ts);
    const cycleStartTime = cycleId ? statusCycleStartTimes.get(cycleId) : 0;
    const parentTime = parentLog ? toTime(parentLog.ts) : 0;
    const baseTime = cycleStartTime || parentTime;
    if (!baseTime || !completedTime || completedTime < baseTime) return log;
    return {
      ...log,
      completionDuration: formatDuration(completedTime - baseTime),
    };
  };

  const appendLog = (log, indent = false, parentLog = null) => {
    const item = document.createElement("div");
    item.className = indent ? "mc-log-item mc-log-item-indent" : "mc-log-item";
    const displayLog = getDisplayLog(log, parentLog);
    const time = new Date(displayLog.ts).toLocaleString(locale);
    if (isTaskAttachmentLog(displayLog) && displayLog.attachmentUrl) {
      const image = String(displayLog.contentType || "").startsWith("image/");
      const labelText = t(
        image ? "history.imageAdded" : "history.fileAdded",
        image ? "Imagen añadida" : "Archivo añadido"
      );
      item.append(`${time} - ${labelText}: `);
      const link = document.createElement("a");
      link.className = "mc-log-attachment-link";
      link.href = displayLog.attachmentUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = displayLog.attachmentName || t("tasks.image", "Imagen");
      link.addEventListener("click", (event) => event.stopPropagation());
      item.appendChild(link);
      if (displayLog.user) {
        item.append(t("history.completedBy", (value) => ` - por ${value}`)(displayLog.user));
      }
      list.appendChild(item);
      return;
    }
    item.textContent = `${time} - ${formatHistoryLog(displayLog, {
      omitTaskTitle: indent && log.type === "task_note_added",
    })}`;
    list.appendChild(item);
  };

  const visibleEntries = rawLogs
    .filter((entry) => !childIndexes.has(entry.index))
    .map((entry) => {
      const children =
        cycleChildrenByParentIndex.get(entry.index) ||
        (isTaskCreatedLog(entry.log) ? getTaskChildren(entry.log) : []);
      const childTime = children.reduce((max, child) => Math.max(max, child.time), 0);
      return {
        ...entry,
        children,
        displayTime: Math.max(entry.time, childTime),
      };
    })
    .sort((a, b) => (b.displayTime - a.displayTime) || (b.index - a.index));

  let visibleCount = 0;
  for (const entry of visibleEntries) {
    if (visibleCount >= HISTORY_VISIBLE_LIMIT) break;
    appendLog(entry.log);
    visibleCount += 1;
    for (const child of entry.children) {
      if (visibleCount >= HISTORY_VISIBLE_LIMIT) break;
      appendLog(child.log, true, entry.log);
      visibleCount += 1;
    }
  }
  panel.appendChild(list);

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  const footer = document.createElement("div");
  footer.className = "mc-log-footer";

  const counter = document.createElement("div");
  counter.className = "mc-log-header";
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
