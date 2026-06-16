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
    const matchingNotes = (entry.notes || []).filter((noteLog) =>
      buildRegistrySearchText(entry, noteLog).includes(needle)
    );

    if (entryMatches || matchingNotes.length) {
      matches.push({
        ...entry,
        notes: entryMatches ? entry.notes || [] : matchingNotes,
      });
    }

    return matches;
  }, []);
};
