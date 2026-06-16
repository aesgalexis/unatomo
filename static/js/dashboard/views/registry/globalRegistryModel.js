import {
  getPrimaryTaskLogKey,
  getTaskLogKeys,
  isTaskCreatedLog,
  isTaskNoteLog,
} from "../../history/historyEventFormatter.js";

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export const buildGlobalRegistryEntries = (machines = []) => {
  const entries = [];

  machines.forEach((machine) => {
    const rawLogs = Array.isArray(machine.logs) ? machine.logs : [];
    const notesByTaskKey = new Map();

    rawLogs.forEach((log) => {
      if (!isTaskNoteLog(log)) return;
      getTaskLogKeys(log).forEach((key) => {
        const notes = notesByTaskKey.get(key) || [];
        if (!notes.includes(log)) notes.push(log);
        notesByTaskKey.set(key, notes);
      });
    });

    rawLogs
      .filter((log) => !isTaskNoteLog(log))
      .forEach((log, index) => {
        const key = isTaskCreatedLog(log) ? getPrimaryTaskLogKey(log) : "";
        entries.push({
          id: `${machine.id || "machine"}-${log.ts || index}-${index}`,
          machine,
          log,
          time: toTime(log.ts),
          notes: key ? notesByTaskKey.get(key) || [] : [],
        });
      });
  });

  return entries.sort((a, b) => b.time - a.time);
};
