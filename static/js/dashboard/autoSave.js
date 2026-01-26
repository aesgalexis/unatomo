export const initAutoSave = ({ saveFn, notify, debounceMs = 750 }) => {
  const timers = new Map();

  const runSave = async (machineId, reason, customFn) => {
    if (!machineId) return;
    if (notify) notify("Guardando...");
    try {
      if (customFn) {
        await customFn();
      } else if (saveFn) {
        await saveFn(machineId, reason);
      }
      if (notify) notify("Guardado");
    } catch {
      if (notify) notify("Error al guardar");
    }
  };

  const scheduleSave = (machineId, reason) => {
    if (!machineId) return;
    if (timers.has(machineId)) clearTimeout(timers.get(machineId));
    const timer = setTimeout(() => {
      timers.delete(machineId);
      runSave(machineId, reason);
    }, debounceMs);
    timers.set(machineId, timer);
  };

  const saveNow = (machineId, reason, customFn) => {
    if (timers.has(machineId)) {
      clearTimeout(timers.get(machineId));
      timers.delete(machineId);
    }
    runSave(machineId, reason, customFn);
  };

  return { scheduleSave, saveNow };
};
