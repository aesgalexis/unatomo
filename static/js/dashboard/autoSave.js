import { t } from "./i18n.js";

export const initAutoSave = ({
  saveFn,
  notify,
  debounceMs = 750,
  onSaveStart,
  onSaveIdle
}) => {
  const timers = new Map();
  const activeMachines = new Set();
  const queuedSaves = new Map();

  const runSave = async (machineId, reason, customFn) => {
    if (!machineId) return;
    if (onSaveStart) onSaveStart(machineId, reason);
    if (notify) notify(t("dashboard.saving", "Guardando..."));
    try {
      if (customFn) {
        await customFn();
      } else if (saveFn) {
        await saveFn(machineId, reason);
      }
      if (notify) notify(t("dashboard.saved", "Guardado"));
    } catch {
      if (notify) notify(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const drainSaves = async (machineId, initialSave) => {
    activeMachines.add(machineId);
    let nextSave = initialSave;
    try {
      while (nextSave) {
        queuedSaves.delete(machineId);
        await runSave(machineId, nextSave.reason, nextSave.customFn);
        nextSave = queuedSaves.get(machineId) || null;
      }
    } finally {
      activeMachines.delete(machineId);
      if (queuedSaves.has(machineId)) {
        const queued = queuedSaves.get(machineId);
        queuedSaves.delete(machineId);
        void drainSaves(machineId, queued);
      } else if (onSaveIdle) {
        onSaveIdle(machineId);
      }
    }
  };

  const enqueueSave = (machineId, reason, customFn) => {
    const request = { reason, customFn };
    if (activeMachines.has(machineId)) {
      queuedSaves.set(machineId, request);
      return;
    }
    void drainSaves(machineId, request);
  };

  const scheduleSave = (machineId, reason) => {
    if (!machineId) return;
    if (timers.has(machineId)) clearTimeout(timers.get(machineId));
    const timer = setTimeout(() => {
      timers.delete(machineId);
      enqueueSave(machineId, reason);
    }, debounceMs);
    timers.set(machineId, timer);
  };

  const saveNow = (machineId, reason, customFn) => {
    if (timers.has(machineId)) {
      clearTimeout(timers.get(machineId));
      timers.delete(machineId);
    }
    enqueueSave(machineId, reason, customFn);
  };

  return { scheduleSave, saveNow };
};
