import {
  formatHistoryLog,
  getPrimaryTaskLogKey,
  getTaskLogKeys,
  isTaskCreatedLog,
  isTaskNoteLog,
} from "../../history/historyEventFormatter.js";
import { normalizeForSearch } from "../../components/machineSearch/machineFilter.js";

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const normalizeText = (value) => normalizeForSearch(value || "");

const isRestoreOperationLog = (log = {}) => {
  const title = normalizeText(log.title || "");
  return (
    log.source === RESTORE_OPERATION_TASK_SOURCE ||
    title.includes("operatividad") ||
    title.includes("operation")
  );
};

const isStatusDownLog = (log = {}) =>
  log.type === "status" && log.value === "fuera_de_servicio";

const isStatusOperativeLog = (log = {}) =>
  log.type === "status" && log.value === "operativa";

const isStatusCycleLog = (log = {}) =>
  isStatusDownLog(log) || isStatusOperativeLog(log) || isRestoreOperationLog(log);

const isTaskChildLog = (log = {}) =>
  isTaskNoteLog(log) ||
  log.type === "task" ||
  log.type === "task_edited" ||
  log.type === "task_removed";

const addGroupedLog = (map, key, entry) => {
  if (!key) return;
  const logs = map.get(key) || [];
  if (!logs.some((item) => item.index === entry.index)) logs.push(entry);
  map.set(key, logs);
};

const entryId = (machine, log, index) =>
  `${machine.id || "machine"}-${log.ts || index}-${index}`;

const buildDateSearchText = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return [
    value,
    date.toLocaleDateString("es-ES"),
    date.toLocaleString("es-ES"),
    date.toLocaleDateString("en-GB"),
    date.toLocaleString("en-GB"),
  ].join(" ");
};

export const buildGlobalRegistryEntries = (machines = []) => {
  const entries = [];

  machines.forEach((machine) => {
    const rawLogs = Array.isArray(machine.logs)
      ? machine.logs.map((log, index) => ({ log, index, time: toTime(log.ts) }))
      : [];
    const orderedLogs = rawLogs
      .slice()
      .sort((a, b) => (a.time - b.time) || (a.index - b.index));
    const consumed = new Set();

    const pushCycleEntry = (cycleLogs, fallbackIndex = 0) => {
      const uniqueLogs = cycleLogs
        .filter(Boolean)
        .filter((item, index, list) => list.findIndex((entry) => entry.index === item.index) === index)
        .sort((a, b) => (a.time - b.time) || (a.index - b.index));
      if (!uniqueLogs.length) return;
      uniqueLogs.forEach((item) => consumed.add(item.index));
      const main = uniqueLogs.find((item) => isStatusDownLog(item.log)) || uniqueLogs[0];
      const relatedLogs = uniqueLogs
        .filter((item) => item.index !== main.index)
        .map((item) => item.log);
      entries.push({
        id: `cycle-${entryId(machine, main.log, fallbackIndex)}`,
        machine,
        log: main.log,
        time: uniqueLogs.reduce((max, item) => Math.max(max, item.time), main.time),
        notes: [],
        relatedLogs,
      });
    };

    const explicitCycles = new Map();
    orderedLogs.forEach((item) => {
      const cycleId = String(item.log.statusCycleId || "").trim();
      if (!cycleId) return;
      const items = explicitCycles.get(cycleId) || [];
      items.push(item);
      explicitCycles.set(cycleId, items);
    });
    explicitCycles.forEach((cycleLogs) => {
      const scopedCycleLogs = cycleLogs.filter((item) => isStatusCycleLog(item.log));
      if (scopedCycleLogs.some((item) => isStatusDownLog(item.log) || isRestoreOperationLog(item.log))) {
        pushCycleEntry(scopedCycleLogs, scopedCycleLogs[0]?.index || 0);
      }
    });

    orderedLogs.forEach((item, position) => {
      if (consumed.has(item.index) || !isStatusDownLog(item.log)) return;
      const cycleLogs = [item];
      const taskKeys = new Set();
      let foundRestoreTask = false;

      for (let cursor = position + 1; cursor < orderedLogs.length; cursor += 1) {
        const candidate = orderedLogs[cursor];
        if (consumed.has(candidate.index)) continue;
        const log = candidate.log;
        const restoreLog = isRestoreOperationLog(log);
        const taskKey = getPrimaryTaskLogKey(log);

        if (restoreLog) {
          foundRestoreTask = true;
          cycleLogs.push(candidate);
          getTaskLogKeys(log).forEach((key) => taskKeys.add(key));
          continue;
        }

        if (isTaskNoteLog(log)) {
          const belongsToRestoreTask = getTaskLogKeys(log).some((key) => taskKeys.has(key));
          if (belongsToRestoreTask) cycleLogs.push(candidate);
          continue;
        }

        if (isStatusOperativeLog(log)) {
          cycleLogs.push(candidate);
          break;
        }

        if (taskKey && taskKeys.has(taskKey)) {
          cycleLogs.push(candidate);
        }
      }

      if (foundRestoreTask || cycleLogs.some((entry) => isStatusOperativeLog(entry.log))) {
        pushCycleEntry(cycleLogs, item.index);
      }
    });

    const taskParentKeys = new Set();
    rawLogs.forEach(({ log, index }) => {
      if (consumed.has(index) || !isTaskCreatedLog(log)) return;
      getTaskLogKeys(log).forEach((key) => taskParentKeys.add(key));
    });

    const taskChildrenByTaskKey = new Map();
    const taskChildIndexes = new Set();
    rawLogs.forEach((entry) => {
      const { log, index } = entry;
      if (consumed.has(index) || isTaskCreatedLog(log) || !isTaskChildLog(log)) return;
      const keys = getTaskLogKeys(log).filter((key) => taskParentKeys.has(key));
      keys.forEach((key) => addGroupedLog(taskChildrenByTaskKey, key, entry));
      if (keys.length) taskChildIndexes.add(index);
    });

    const getTaskChildren = (log) => {
      const children = [];
      getTaskLogKeys(log).forEach((key) => {
        (taskChildrenByTaskKey.get(key) || []).forEach((entry) => {
          if (!children.some((item) => item.index === entry.index)) children.push(entry);
        });
      });
      return children.sort((a, b) => (a.time - b.time) || (a.index - b.index));
    };

    rawLogs
      .filter(({ index }) => !consumed.has(index) && !taskChildIndexes.has(index))
      .forEach(({ log, index }) => {
        const children = isTaskCreatedLog(log) ? getTaskChildren(log) : [];
        const childTime = children.reduce((max, child) => Math.max(max, child.time), 0);
        entries.push({
          id: entryId(machine, log, index),
          machine,
          log,
          time: Math.max(toTime(log.ts), childTime),
          notes: [],
          relatedLogs: children.map((child) => child.log),
        });
      });
  });

  return entries.sort((a, b) => b.time - a.time);
};

const buildRegistrySearchText = (entry, log = entry.log) => {
  const machine = entry.machine || {};
  return normalizeForSearch([
    machine.title,
    machine.location,
    log.type,
    log.title,
    log.description,
    log.note,
    log.message,
    log.summary,
    log.user,
    log.admin,
    log.value,
    buildDateSearchText(log.ts),
    formatHistoryLog(log),
  ].filter(Boolean).join(" "));
};

export const filterGlobalRegistryEntries = (entries = [], query = "") => {
  const needle = normalizeForSearch(query || "");
  if (!needle) return entries;

  return entries.reduce((matches, entry) => {
    const entryMatches = buildRegistrySearchText(entry).includes(needle);
    const matchingRelatedLogs = (entry.relatedLogs || []).filter((relatedLog) =>
      buildRegistrySearchText(entry, relatedLog).includes(needle)
    );
    const matchingNotes = (entry.notes || []).filter((noteLog) =>
      buildRegistrySearchText(entry, noteLog).includes(needle)
    );

    if (entryMatches || matchingRelatedLogs.length || matchingNotes.length) {
      matches.push({
        ...entry,
        relatedLogs: entryMatches ? entry.relatedLogs || [] : matchingRelatedLogs,
        notes: entryMatches ? entry.notes || [] : matchingNotes,
      });
    }

    return matches;
  }, []);
};

export const countUnseenGlobalRegistryEntries = (machines = [], seenAt = "") => {
  const seenTime = toTime(seenAt);
  return buildGlobalRegistryEntries(machines).reduce((total, entry) => {
    if (entry.time <= seenTime) return total;
    const logs = [
      entry.log,
      ...(entry.relatedLogs || []),
      ...(entry.notes || []),
    ];
    return total + logs.length;
  }, 0);
};
