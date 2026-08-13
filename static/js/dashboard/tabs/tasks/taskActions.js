import { normalizeTaskAssignee, normalizeTasks } from "./tasksModel.js";
import {
  getCompletionDuration,
  getOverdueDuration,
  getTaskTiming
} from "./tasksTime.js";

export const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const createId = (prefix) =>
  (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
  `${prefix}_${Date.now().toString(36)}`;

const sameAssignment = (left, right) =>
  JSON.stringify(left || null) === JSON.stringify(right || null);

export const createStatusCycleId = (machineId) =>
  `status_${machineId || "machine"}_${Date.now().toString(36)}`;

export const getRestoreTaskCycleId = (task, machineData = {}) => {
  if (!task) return "";
  if (task.statusCycleId) return task.statusCycleId;
  return task.source === RESTORE_OPERATION_TASK_SOURCE
    ? machineData.activeStatusCycleId || ""
    : "";
};

export const hasPendingRestoreOperationTask = (tasks = []) =>
  normalizeTasks(tasks).some(
    (task) =>
      task.source === RESTORE_OPERATION_TASK_SOURCE &&
      task.frequency === "puntual" &&
      getTaskTiming(task).pending
  );

export const buildAddTaskUpdate = (machine, task, user, now = new Date().toISOString()) => {
  const tasks = Array.isArray(machine.tasks) ? [...machine.tasks] : [];
  tasks.unshift(task);
  return {
    tasks,
    logs: [
      ...(machine.logs || []),
      {
        ts: now,
        type: "task_created",
        taskId: task.id,
        title: task.title || "Tarea",
        description: task.description || "",
        user,
        assignedTo: task.assignedTo || null
      }
    ]
  };
};

export const buildRemoveTaskUpdate = (machine, taskId, user, now = new Date().toISOString()) => {
  const removed = (machine.tasks || []).find((task) => task.id === taskId);
  return {
    tasks: (machine.tasks || []).filter((task) => task.id !== taskId),
    logs: [
      ...(machine.logs || []),
      {
        ts: now,
        type: "task_removed",
        taskId,
        title: removed?.title || "Tarea",
        description: removed?.description || "",
        user,
        assignedTo: removed?.assignedTo || null,
        source: removed?.source || "",
        statusCycleId: getRestoreTaskCycleId(removed, machine)
      }
    ]
  };
};

export const buildAddTaskNoteUpdate = (
  machine,
  taskId,
  text,
  user,
  now = new Date().toISOString()
) => {
  const note = {
    id: createId("n"),
    text: (text || "").toString().trim().slice(0, 512),
    createdAt: now,
    createdBy: user
  };
  if (!note.text) return null;
  const tasks = normalizeTasks(machine.tasks || []).map((task) =>
    task.id === taskId
      ? { ...task, notes: [...(task.notes || []), note] }
      : task
  );
  const task = tasks.find((item) => item.id === taskId);
  return {
    tasks,
    logs: [
      ...(machine.logs || []),
      {
        ts: note.createdAt,
        type: "task_note_added",
        taskId,
        title: task?.title || "Tarea",
        note: note.text,
        user,
        assignedTo: task?.assignedTo || null,
        source: task?.source || "",
        statusCycleId: getRestoreTaskCycleId(task, machine)
      }
    ]
  };
};

export const buildAddTaskAttachmentsUpdate = (
  machine,
  taskId,
  attachments,
  user,
  now = new Date().toISOString()
) => {
  const added = (Array.isArray(attachments) ? attachments : [])
    .filter((attachment) => attachment?.url)
    .map((attachment) => ({
      ...attachment,
      documentId: attachment.documentId || attachment.id || "",
      // The upload result contains the Firebase UID. Task history already
      // receives the readable actor, so keep that same value on the task.
      uploadedBy: user || null
    }));
  if (!added.length) return null;

  const tasks = normalizeTasks(machine.tasks || []).map((task) =>
    task.id === taskId
      ? { ...task, attachments: [...(task.attachments || []), ...added] }
      : task
  );
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return null;

  const logs = [
    ...(machine.logs || []),
    ...added.map((attachment) => ({
      ts: attachment.uploadedAt || now,
      type: "task_attachment_added",
      taskId,
      title: task.title || "Tarea",
      attachmentId: attachment.id || attachment.documentId || "",
      documentId: attachment.documentId || attachment.id || "",
      attachmentName: attachment.name || "Imagen",
      attachmentUrl: attachment.url,
      contentType: attachment.contentType || "",
      storagePath: attachment.storagePath || "",
      user,
      assignedTo: task.assignedTo || null,
      source: task.source || "",
      statusCycleId: getRestoreTaskCycleId(task, machine)
    }))
  ];
  return { tasks, logs };
};

export const buildEditTaskUpdate = (
  machine,
  taskId,
  patch = {},
  user,
  now = new Date().toISOString()
) => {
  const baseTasks = normalizeTasks(machine.tasks || []);
  const before = baseTasks.find((task) => task.id === taskId);
  if (!before) return null;
  const hasAssignmentPatch = Object.prototype.hasOwnProperty.call(patch, "assignedTo");
  const tasks = baseTasks.map((task) => {
    if (task.id !== taskId) return task;
    const frequency = patch.frequency || task.frequency || "puntual";
    const assignedTo = hasAssignmentPatch
      ? normalizeTaskAssignee(patch.assignedTo)
      : task.assignedTo || null;
    return {
      ...task,
      title: (patch.title || task.title || "Tarea").toString().trim().slice(0, 64),
      description: (patch.description || "").toString().trim().slice(0, 1024),
      frequency,
      customDueAmount:
        frequency === "custom"
          ? Math.max(1, Math.min(999, Number(patch.customDueAmount || 1) || 1))
          : null,
      customDueUnit: frequency === "custom" ? patch.customDueUnit || "days" : null,
      assignedTo,
      createdAt: now,
      lastCompletedAt: null
    };
  });
  const task = tasks.find((item) => item.id === taskId);
  const assignmentChanged = !sameAssignment(before.assignedTo, task?.assignedTo);
  const definitionChanged = [
    "title",
    "description",
    "frequency",
    "customDueAmount",
    "customDueUnit"
  ].some((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(task?.[key] ?? null));
  if (!definitionChanged) {
    task.createdAt = before.createdAt;
    task.lastCompletedAt = before.lastCompletedAt;
  }
  const appendedLogs = [];
  if (definitionChanged) {
    appendedLogs.push({
      ts: now,
      type: "task_edited",
      taskId,
      title: task?.title || "Tarea",
      description: task?.description || "",
      user,
      assignedTo: task?.assignedTo || null,
      source: task?.source || "",
      statusCycleId: getRestoreTaskCycleId(task, machine)
    });
  }
  if (assignmentChanged) {
    appendedLogs.push({
      ts: now,
      type: "task_assignment_changed",
      taskId,
      title: task?.title || "Tarea",
      user,
      previousAssignedTo: before.assignedTo || null,
      assignedTo: task?.assignedTo || null,
      source: task?.source || "",
      statusCycleId: getRestoreTaskCycleId(task, machine)
    });
  }
  return {
    tasks,
    logs: [...(machine.logs || []), ...appendedLogs]
  };
};

export const buildCompleteTaskUpdate = (
  machineId,
  machine,
  taskId,
  user,
  options = {}
) => {
  const baseTasks = normalizeTasks(machine.tasks || []);
  const before = baseTasks.find((task) => task.id === taskId);
  if (!before) return null;
  const now = options.now || new Date().toISOString();
  const normalizeStatus = options.normalizeStatus || ((value) => value || "operativa");
  const shouldRestoreOperation =
    before?.source === RESTORE_OPERATION_TASK_SOURCE &&
    before?.statusTarget === "operativa";
  const tasks = baseTasks
    .map((task) =>
      task.id === taskId ? { ...task, lastCompletedAt: now } : task
    )
    .filter((task) => !(task.id === taskId && task.frequency === "puntual"));
  const statusCycleId =
    before?.statusCycleId ||
    (shouldRestoreOperation
      ? machine.activeStatusCycleId || createStatusCycleId(machineId)
      : "");
  const logs = [
    ...(machine.logs || []),
    {
      ts: now,
      type: "task",
      taskId,
      title: before.title || "Tarea",
      user,
      assignedTo: before.assignedTo || null,
      overdue: !!getTaskTiming(before).pending,
      overdueDuration: getOverdueDuration(before),
      punctual: before.frequency === "puntual",
      completionDuration: getCompletionDuration(before),
      source: shouldRestoreOperation ? RESTORE_OPERATION_TASK_SOURCE : before.source || "",
      statusCycleId
    }
  ];
  const updates = { tasks, logs };
  if (shouldRestoreOperation) updates.activeStatusCycleId = "";
  if (shouldRestoreOperation && normalizeStatus(machine.status) !== "operativa") {
    updates.status = "operativa";
    logs.push({
      ts: now,
      type: "status",
      value: "operativa",
      user,
      source: RESTORE_OPERATION_TASK_SOURCE,
      statusCycleId
    });
  }
  return updates;
};
