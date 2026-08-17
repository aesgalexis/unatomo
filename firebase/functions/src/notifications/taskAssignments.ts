import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {writeUserNotification} from "./userNotifications";

type Task = {
  id?: unknown;
  title?: unknown;
  assignedTo?: {accountUid?: unknown} | null;
};

type Machine = {
  title?: unknown;
  tasks?: unknown;
};

const clean = (value: unknown, max = 180) =>
  (value || "").toString().trim().slice(0, max);

const tasksById = (value: unknown) => {
  const map = new Map<string, Task>();
  if (!Array.isArray(value)) return map;
  value.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const task = raw as Task;
    const id = clean(task.id);
    if (id) map.set(id, task);
  });
  return map;
};

// Only explicit Firebase account assignments create inbox notifications.
// Machine-local userId/username assignments intentionally remain local.
export const notifyAccountTaskAssignment = onDocumentUpdated(
  "machines/{machineId}",
  async (event) => {
    const before = event.data?.before.data() as Machine | undefined;
    const after = event.data?.after.data() as Machine | undefined;
    const previous = tasksById(before?.tasks);
    const current = tasksById(after?.tasks);
    const writes: Array<Promise<void>> = [];
    current.forEach((task, taskId) => {
      const accountUid = clean(task.assignedTo?.accountUid, 128);
      if (!accountUid) return;
      const previousUid = clean(
        previous.get(taskId)?.assignedTo?.accountUid,
        128,
      );
      if (previousUid === accountUid) return;
      writes.push(writeUserNotification({
        recipientUid: accountUid,
        type: "task_assigned",
        machineId: clean(event.params.machineId),
        machineTitle: clean(after?.title),
        taskId,
        taskTitle: clean(task.title),
        actionUrl: "/nfc/es/index.html#/tareas",
        dedupeKey: `task-assigned_${event.id}_${taskId}_${accountUid}`,
      }));
    });
    await Promise.all(writes);
  },
);
