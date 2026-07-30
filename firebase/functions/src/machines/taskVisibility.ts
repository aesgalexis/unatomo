const normalizeTaskUsername = (value: unknown) =>
  (value || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const getTaskAssignee = (task: Record<string, unknown>) => {
  const raw = task.assignedTo;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const assignee = raw as Record<string, unknown>;
  const userId = (assignee.userId || assignee.id || "").toString().trim();
  const username = (assignee.username || "").toString().trim();
  if (!userId && !username) return null;
  return {userId, username};
};

export const canMachineUserSeeTask = (
  task: Record<string, unknown>,
  user?: Record<string, unknown> | null,
) => {
  const assignee = getTaskAssignee(task);
  if (!assignee) return true;
  if (!user) return false;
  const userId = (user.id || user.userId || "").toString().trim();
  if (assignee.userId && userId) return assignee.userId === userId;
  return (
    !!assignee.username &&
    normalizeTaskUsername(assignee.username) ===
      normalizeTaskUsername(user.username)
  );
};

const buildTaskAssignmentMap = (
  tasks: Array<Record<string, unknown>>,
  logs: Array<Record<string, unknown>>,
) => {
  const assignments = new Map<string, Record<string, unknown> | null>();
  logs.forEach((log) => {
    const taskId = (log.taskId || "").toString().trim();
    if (!taskId || !Object.prototype.hasOwnProperty.call(log, "assignedTo")) {
      return;
    }
    assignments.set(taskId, getTaskAssignee(log));
  });
  tasks.forEach((task) => {
    const taskId = (task.id || "").toString().trim();
    if (taskId) assignments.set(taskId, getTaskAssignee(task));
  });
  return assignments;
};

export const filterTaskDataForUser = (
  tasksValue: unknown,
  logsValue: unknown,
  user?: Record<string, unknown> | null,
) => {
  const tasks = Array.isArray(tasksValue) ?
    tasksValue as Array<Record<string, unknown>> :
    [];
  const logs = Array.isArray(logsValue) ?
    logsValue as Array<Record<string, unknown>> :
    [];
  const assignments = buildTaskAssignmentMap(tasks, logs);
  return {
    tasks: tasks.filter((task) => canMachineUserSeeTask(task, user)),
    logs: logs.filter((log) => {
      const taskId = (log.taskId || "").toString().trim();
      if (!taskId || !assignments.has(taskId)) return true;
      const assignedTo = assignments.get(taskId);
      return canMachineUserSeeTask({assignedTo}, user);
    }),
  };
};
