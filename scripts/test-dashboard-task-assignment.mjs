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

const { task } = createTask({
  title: "Limpiar filtro",
  description: "Filtro principal",
  frequency: "semanal",
  createdBy: "Owner",
  assignedTo: assignee
});
task.createdAt = createdAt;
assert.deepEqual(task.assignedTo, assignee);

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
