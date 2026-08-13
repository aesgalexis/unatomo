import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

const transitionMachineStatusCallable = httpsCallable(
  functions,
  "transitionMachineStatus"
);

const createOperationId = () =>
  (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
  `status_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const transitionMachineStatus = async (
  machineId,
  targetStatus,
  actor,
  options = {}
) => {
  const response = await transitionMachineStatusCallable({
    machineId,
    targetStatus,
    actor,
    operationId: options.operationId || createOperationId(),
    language: document.documentElement.lang === "en" ? "en" : "es",
    restoreTaskId: options.restoreTaskId || "",
    restoreTitle: options.restoreTitle || "",
    restoreDescription: options.restoreDescription || "",
    note: options.note || "",
    attachments: Array.isArray(options.attachments) ? options.attachments : []
  });
  return response?.data || { ok: false };
};

export const machineStatusResultPatch = (result = {}) => ({
  status: result.status,
  tasks: Array.isArray(result.tasks) ? result.tasks : [],
  logs: Array.isArray(result.logs) ? result.logs : [],
  activeStatusCycleId: result.activeStatusCycleId || ""
});
