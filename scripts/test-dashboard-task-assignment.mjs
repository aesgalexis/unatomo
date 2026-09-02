import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";

const asDataUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

const tasksModelSource = readFileSync(
  new URL("../static/js/dashboard/tabs/tasks/tasksModel.js", import.meta.url),
  "utf8"
);
const tasksTimeSource = readFileSync(
  new URL("../static/js/dashboard/tabs/tasks/tasksTime.js", import.meta.url),
  "utf8"
).replace(
  'import { t } from "/static/js/dashboard/i18n.js";',
  "const t = (_key, fallback) => fallback;"
);
const taskActionsSource = readFileSync(
  new URL("../static/js/dashboard/tabs/tasks/taskActions.js", import.meta.url),
  "utf8"
)
  .replace('"./tasksModel.js"', JSON.stringify(asDataUrl(tasksModelSource)))
  .replace('"./tasksTime.js"', JSON.stringify(asDataUrl(tasksTimeSource)));

globalThis.window = { crypto: webcrypto };
const { createTask, normalizeTask } = await import(asDataUrl(tasksModelSource));
const { getOverdueDuration, getTaskTiming } = await import(asDataUrl(tasksTimeSource));
const {
  buildAddTaskNoteUpdate,
  buildCompleteTaskUpdate,
  buildEditTaskUpdate
} = await import(asDataUrl(taskActionsSource));

const assignee = {
  userId: "u_maria",
  username: "María",
  role: "operator"
};
const createdAt = "2026-07-30T08:00:00.000Z";

assert.equal(normalizeTask({
  id: "legacy",
  title: "Tarea antigua",
  frequency: "puntual",
  createdAt
}).assignedTo, null);
assert.equal(normalizeTask({
  id: "legacy-recurring",
  title: "Tarea periódica antigua",
  frequency: "semanal",
  createdAt
}).initialCycleProgress, 0);

const { task } = createTask({
  title: "Limpiar filtro",
  description: "Filtro principal",
  frequency: "semanal",
  createdBy: "Owner",
  assignedTo: assignee
});
task.createdAt = createdAt;
assert.deepEqual(task.assignedTo, assignee);
assert.equal(task.initialCycleProgress, 0);
assert.equal(
  getTaskTiming(task, new Date("2026-07-30T09:00:00.000Z").getTime()).pending,
  false
);

const { task: overdueTask } = createTask({
  title: "Revisión vencida",
  frequency: "semanal",
  initialCycleProgress: 1,
  createdBy: "Owner"
});
overdueTask.createdAt = createdAt;
const overdueAt = new Date("2026-07-30T08:05:00.000Z").getTime();
assert.equal(overdueTask.lastCompletedAt, null);
assert.equal(getTaskTiming(overdueTask, overdueAt).pending, true);
assert.equal(getTaskTiming(overdueTask, overdueAt).label, "Vencida ahora");
assert.equal(getOverdueDuration(overdueTask, overdueAt), "5 minute");
assert.equal(
  getOverdueDuration(overdueTask, new Date("2026-08-01T08:00:00.000Z").getTime()),
  "2 day"
);

const { task: halfAnnualTask } = createTask({
  title: "Revisión anual avanzada",
  frequency: "anual",
  initialCycleProgress: 0.5,
  createdBy: "Owner"
});
halfAnnualTask.createdAt = createdAt;
assert.equal(
  getTaskTiming(halfAnnualTask, new Date("2027-01-28T08:00:00.000Z").getTime()).pending,
  false
);
assert.equal(
  getTaskTiming(halfAnnualTask, new Date("2027-01-30T08:00:00.000Z").getTime()).pending,
  true
);

const { task: customYearsTask } = createTask({
  title: "Revisión cada dos años",
  frequency: "custom",
  customDueAmount: 2,
  customDueUnit: "years",
  initialCycleProgress: 0.5,
  createdBy: "Owner"
});
customYearsTask.createdAt = createdAt;
assert.equal(customYearsTask.customDueUnit, "years");
assert.equal(
  getTaskTiming(customYearsTask, new Date("2027-07-29T08:00:00.000Z").getTime()).pending,
  false
);
assert.equal(
  getTaskTiming(customYearsTask, new Date("2027-07-31T08:00:00.000Z").getTime()).pending,
  true
);

const reassignedAt = "2026-07-30T09:00:00.000Z";
const assignmentUpdate = buildEditTaskUpdate(
  { tasks: [task], logs: [] },
  task.id,
  {
    title: task.title,
    description: task.description,
    frequency: task.frequency,
    assignedTo: null
  },
  "Owner",
  reassignedAt
);

assert.equal(assignmentUpdate.tasks[0].assignedTo, null);
assert.equal(assignmentUpdate.tasks[0].createdAt, createdAt);
assert.equal(assignmentUpdate.logs.length, 1);
assert.equal(assignmentUpdate.logs[0].type, "task_assignment_changed");
assert.deepEqual(assignmentUpdate.logs[0].previousAssignedTo, assignee);

const assignedMachine = { tasks: [task], logs: [] };
const noteUpdate = buildAddTaskNoteUpdate(
  assignedMachine,
  task.id,
  "Trabajo iniciado",
  "María",
  "2026-07-30T10:00:00.000Z"
);
assert.deepEqual(noteUpdate.logs.at(-1).assignedTo, assignee);

const completion = buildCompleteTaskUpdate(
  "machine-1",
  assignedMachine,
  task.id,
  "María",
  { now: "2026-07-30T11:00:00.000Z" }
);
assert.deepEqual(completion.logs.at(-1).assignedTo, assignee);

console.log("OK: task assignments remain compatible, auditable, and schedule-safe.");
