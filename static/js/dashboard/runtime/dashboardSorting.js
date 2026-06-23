import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";

export const normalizeMachineStatus = (value) =>
  value === "desconectada" ? "fuera_de_servicio" : value || "operativa";

export const getMachinePendingTaskCount = (machine) =>
  (Array.isArray(machine?.tasks) ? machine.tasks : [])
    .filter((task) => getTaskTiming(task).pending)
    .length;

export const compareMachineTitle = (a, b) =>
  (a?.title || "").localeCompare(b?.title || "", "es", { sensitivity: "base" }) ||
  ((a?.order ?? 0) - (b?.order ?? 0));

export const sortFlatMachines = (machines = [], sortMode = "manual") => {
  const list = machines.slice();
  if (sortMode === "incidents") {
    return list.sort((a, b) => {
      const aOut = normalizeMachineStatus(a?.status) === "fuera_de_servicio" ? 0 : 1;
      const bOut = normalizeMachineStatus(b?.status) === "fuera_de_servicio" ? 0 : 1;
      if (aOut !== bOut) return aOut - bOut;
      const pendingDiff = getMachinePendingTaskCount(b) - getMachinePendingTaskCount(a);
      if (pendingDiff) return pendingDiff;
      return compareMachineTitle(a, b);
    });
  }
  if (sortMode === "name") return list.sort(compareMachineTitle);
  return list.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
};
