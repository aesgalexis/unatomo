/* eslint-disable max-len */
import {randomUUID} from "node:crypto";

export const OPERATIONAL_STATUS = "operativa";
export const OUT_OF_SERVICE_STATUS = "fuera_de_servicio";
export const DISCONNECTED_STATUS = "desconectada";
export const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

export type MachineStatus =
  | typeof OPERATIONAL_STATUS
  | typeof OUT_OF_SERVICE_STATUS
  | typeof DISCONNECTED_STATUS;

export type MachineStatusEventType =
  | "machine_out_of_service"
  | "machine_operational_again";

type RecordValue = Record<string, unknown>;

export type StatusTransitionInput = {
  machineId: string;
  machine: RecordValue;
  targetStatus: MachineStatus;
  actor: string;
  operationId: string;
  occurredAt: string;
  language?: "es" | "en";
  restoreTaskId?: string;
  restoreTitle?: string;
  restoreDescription?: string;
  note?: string;
  attachments?: RecordValue[];
};

export type StatusTransitionResult = {
  changed: boolean;
  eventType: MachineStatusEventType | null;
  previousStatus: MachineStatus;
  currentStatus: MachineStatus;
  statusCycleId: string;
  restoreTaskId: string;
  patch: RecordValue;
};

const clean = (value: unknown, max: number) =>
  (value || "").toString().trim().slice(0, max);

export const normalizeMachineStatus = (value: unknown): MachineStatus =>
  [OPERATIONAL_STATUS, OUT_OF_SERVICE_STATUS, DISCONNECTED_STATUS]
    .includes(value as MachineStatus) ?
    value as MachineStatus :
    OPERATIONAL_STATUS;

export const eventForMachineStatusTransition = (
  before: MachineStatus,
  after: MachineStatus,
): MachineStatusEventType | null => {
  if (before === OPERATIONAL_STATUS && after === OUT_OF_SERVICE_STATUS) {
    return "machine_out_of_service";
  }
  if (before === OUT_OF_SERVICE_STATUS && after === OPERATIONAL_STATUS) {
    return "machine_operational_again";
  }
  return null;
};

const asRecords = (value: unknown) =>
  Array.isArray(value) ? value as RecordValue[] : [];

const findRestoreTask = (tasks: RecordValue[], taskId = "") =>
  tasks.find((task) => taskId && clean(task.id, 160) === taskId) ||
  tasks.find((task) =>
    task.source === RESTORE_OPERATION_TASK_SOURCE &&
    task.frequency === "puntual",
  );

const durationLabel = (from: unknown, to: string, language: "es" | "en") => {
  const start = new Date((from || "").toString()).getTime();
  const end = new Date(to).getTime();
  const elapsed = Math.max(0, end - (Number.isFinite(start) ? start : end));
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const format = (count: number, es: string, en: string) =>
    `${count} ${language === "en" ? en : es}`;
  if (elapsed < hour) {
    const count = Math.max(1, Math.ceil(elapsed / minute));
    return format(count, count === 1 ? "minuto" : "minutos", count === 1 ? "minute" : "minutes");
  }
  if (elapsed < day) {
    const count = Math.max(1, Math.ceil(elapsed / hour));
    return format(count, count === 1 ? "hora" : "horas", count === 1 ? "hour" : "hours");
  }
  const days = Math.max(1, Math.ceil(elapsed / day));
  if (days >= 30) {
    const count = Math.ceil(days / 30);
    return format(count, count === 1 ? "mes" : "meses", count === 1 ? "month" : "months");
  }
  if (days >= 7) {
    const count = Math.ceil(days / 7);
    return format(count, count === 1 ? "semana" : "semanas", count === 1 ? "week" : "weeks");
  }
  return format(days, days === 1 ? "día" : "días", days === 1 ? "day" : "days");
};

export const buildMachineStatusTransition = (
  input: StatusTransitionInput,
): StatusTransitionResult => {
  const previousStatus = normalizeMachineStatus(input.machine.status);
  const currentStatus = normalizeMachineStatus(input.targetStatus);
  const existingTasks = asRecords(input.machine.tasks);
  const existingLogs = asRecords(input.machine.logs);
  if (previousStatus === currentStatus) {
    return {
      changed: false,
      eventType: null,
      previousStatus,
      currentStatus,
      statusCycleId: clean(input.machine.activeStatusCycleId, 200),
      restoreTaskId: "",
      patch: {},
    };
  }

  const actor = clean(input.actor, 160) || "machine";
  const language = input.language === "en" ? "en" : "es";
  const operationId = clean(input.operationId, 120) || randomUUID();
  let tasks = [...existingTasks];
  const logs = [...existingLogs];
  let statusCycleId = clean(input.machine.activeStatusCycleId, 200);
  let restoreTaskId = "";

  if (currentStatus === OUT_OF_SERVICE_STATUS) {
    const existing = findRestoreTask(tasks, clean(input.restoreTaskId, 160));
    statusCycleId = clean(existing?.statusCycleId, 200) ||
      statusCycleId || `status_${clean(input.machineId, 100)}_${operationId}`;
    const title = clean(
      input.restoreTitle || existing?.title ||
        (language === "en" ? "Return equipment to operation" : "Volver a poner la máquina en operatividad"),
      64,
    );
    const description = clean(
      input.restoreDescription ?? existing?.description,
      1024,
    );
    const note = clean(input.note, 512);
    if (existing) {
      restoreTaskId = clean(existing.id, 160);
      const nextTask = {
        ...existing,
        title,
        description,
        source: RESTORE_OPERATION_TASK_SOURCE,
        automated: true,
        statusTarget: OPERATIONAL_STATUS,
        statusCycleId,
        notes: note ? [
          ...asRecords(existing.notes),
          {id: `n_${operationId}`, text: note, createdAt: input.occurredAt, createdBy: actor},
        ] : asRecords(existing.notes),
      };
      tasks = tasks.map((task) => task === existing ? nextTask : task);
      if (title !== existing.title || description !== (existing.description || "")) {
        logs.push({
          ts: input.occurredAt, type: "task_edited", taskId: restoreTaskId,
          title, description, user: actor, assignedTo: existing.assignedTo || null,
          source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
        });
      }
      if (note) {
        logs.push({
          ts: input.occurredAt, type: "task_note_added", taskId: restoreTaskId,
          title, note, user: actor, assignedTo: existing.assignedTo || null,
          source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
        });
      }
    } else {
      restoreTaskId = clean(input.restoreTaskId, 160) || `restore_${operationId}`;
      const restoreTask = {
        id: restoreTaskId,
        title,
        description,
        frequency: "puntual",
        customDueAmount: null,
        customDueUnit: null,
        createdAt: input.occurredAt,
        lastCompletedAt: null,
        createdBy: actor,
        assignedTo: null,
        notes: note ? [{
          id: `n_${operationId}`,
          text: note,
          createdAt: input.occurredAt,
          createdBy: actor,
        }] : [],
        attachments: [],
        source: RESTORE_OPERATION_TASK_SOURCE,
        automated: true,
        statusTarget: OPERATIONAL_STATUS,
        statusCycleId,
      };
      tasks = [restoreTask, ...tasks];
      logs.push({
        ts: input.occurredAt, type: "task_created", taskId: restoreTaskId,
        title, description, user: actor, assignedTo: null,
        source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
      });
      if (note) {
        logs.push({
          ts: input.occurredAt, type: "task_note_added", taskId: restoreTaskId,
          title, note, user: actor, assignedTo: null,
          source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
        });
      }
    }
  }

  if (previousStatus === OUT_OF_SERVICE_STATUS && currentStatus === OPERATIONAL_STATUS) {
    const restoreTask = findRestoreTask(tasks, clean(input.restoreTaskId, 160));
    statusCycleId = clean(restoreTask?.statusCycleId, 200) ||
      statusCycleId || `status_${clean(input.machineId, 100)}_${operationId}`;
    if (restoreTask) {
      restoreTaskId = clean(restoreTask.id, 160);
      const note = clean(input.note, 512);
      const attachments = asRecords(input.attachments).slice(0, 10);
      const completedTask = {
        ...restoreTask,
        attachments: [
          ...asRecords(restoreTask.attachments),
          ...attachments,
        ],
        notes: note ? [
          ...asRecords(restoreTask.notes),
          {
            id: `n_${operationId}`,
            text: note,
            createdAt: input.occurredAt,
            createdBy: actor,
          },
        ] : asRecords(restoreTask.notes),
      };
      if (attachments.length) {
        attachments.forEach((attachment) => logs.push({
          ts: clean(attachment.uploadedAt, 40) || input.occurredAt,
          type: "task_attachment_added",
          taskId: restoreTaskId,
          title: restoreTask.title || "Tarea",
          attachmentId: clean(attachment.id || attachment.documentId, 200),
          documentId: clean(attachment.documentId || attachment.id, 200),
          attachmentName: clean(attachment.name, 120) || "Imagen",
          attachmentUrl: clean(attachment.url, 2000),
          contentType: clean(attachment.contentType, 160),
          storagePath: clean(attachment.storagePath, 1000),
          user: actor,
          assignedTo: restoreTask.assignedTo || null,
          source: RESTORE_OPERATION_TASK_SOURCE,
          statusCycleId,
        }));
      }
      if (note) {
        logs.push({
          ts: input.occurredAt, type: "task_note_added", taskId: restoreTaskId,
          title: restoreTask.title || "Tarea", note, user: actor,
          assignedTo: restoreTask.assignedTo || null,
          source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
        });
      }
      tasks = tasks
        .map((task) => task === restoreTask ? {
          ...completedTask,
          lastCompletedAt: input.occurredAt,
        } : task)
        .filter((task) => !(
          clean(task.id, 160) === restoreTaskId &&
          task.frequency === "puntual"
        ));
      logs.push({
        ts: input.occurredAt, type: "task", taskId: restoreTaskId,
        title: restoreTask.title || "Tarea", user: actor,
        assignedTo: restoreTask.assignedTo || null, overdue: false,
        overdueDuration: "", punctual: restoreTask.frequency === "puntual",
        completionDuration: durationLabel(restoreTask.createdAt, input.occurredAt, language),
        source: RESTORE_OPERATION_TASK_SOURCE, statusCycleId,
      });
    }
  }

  logs.push({
    ts: input.occurredAt,
    type: "status",
    value: currentStatus,
    user: actor,
    statusCycleId:
      currentStatus === OUT_OF_SERVICE_STATUS || previousStatus === OUT_OF_SERVICE_STATUS ?
        statusCycleId : "",
    source:
      currentStatus === OUT_OF_SERVICE_STATUS || previousStatus === OUT_OF_SERVICE_STATUS ?
        RESTORE_OPERATION_TASK_SOURCE : "",
  });

  return {
    changed: true,
    eventType: eventForMachineStatusTransition(previousStatus, currentStatus),
    previousStatus,
    currentStatus,
    statusCycleId,
    restoreTaskId,
    patch: {
      status: currentStatus,
      tasks,
      logs,
      activeStatusCycleId: currentStatus === OUT_OF_SERVICE_STATUS ? statusCycleId : "",
    },
  };
};
