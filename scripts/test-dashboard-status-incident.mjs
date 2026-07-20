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
const {
  RESTORE_OPERATION_TASK_SOURCE,
  buildCompleteTaskUpdate,
  buildStatusToggleUpdate
} = await import(asDataUrl(taskActionsSource));

const existingTask = {
  id: "restore-existing",
  title: "Reparar máquina",
  description: "Avería anterior",
  frequency: "puntual",
  createdAt: "2026-07-18T10:00:00.000Z",
  lastCompletedAt: null,
  createdBy: "Alexis",
  notes: [{
    id: "note-existing",
    text: "Conservar esta nota",
    createdAt: "2026-07-18T10:05:00.000Z",
    createdBy: "Alexis"
  }],
  attachments: [{
    id: "image-existing",
    url: "https://example.test/image.webp",
    name: "averia.webp"
  }],
  source: RESTORE_OPERATION_TASK_SOURCE,
  automated: true,
  statusTarget: "operativa",
  statusCycleId: "status-existing-cycle"
};

const reused = buildStatusToggleUpdate(
  "machine-1",
  { status: "operativa", tasks: [existingTask], logs: [] },
  "fuera_de_servicio",
  "Alexis",
  {
    now: "2026-07-20T09:00:00.000Z",
    restoreTitle: "Reactivar máquina",
    restoreDescription: "La avería continúa",
    restoreNote: "Se vuelve a detener"
  }
);

assert.equal(reused.tasks.length, 1);
assert.equal(reused.tasks[0].id, existingTask.id);
assert.equal(reused.tasks[0].title, "Reactivar máquina");
assert.equal(reused.tasks[0].description, "La avería continúa");
assert.equal(reused.tasks[0].notes.length, 2);
assert.equal(reused.tasks[0].attachments.length, 1);
assert.equal(reused.activeStatusCycleId, existingTask.statusCycleId);
assert.equal(reused.logs.some((log) => log.type === "task_created"), false);
assert.equal(reused.logs.some((log) => log.type === "task_edited"), true);
assert.equal(reused.logs.some((log) => log.type === "task_note_added"), true);

const completed = buildCompleteTaskUpdate(
  "machine-1",
  { ...reused, status: "fuera_de_servicio" },
  existingTask.id,
  "Alexis",
  {
    now: "2026-07-20T10:00:00.000Z",
    normalizeStatus: (value) => value || "operativa"
  }
);

assert.equal(completed.status, "operativa");
assert.equal(completed.activeStatusCycleId, "");
assert.equal(completed.tasks.length, 0);
assert.equal(completed.logs.some((log) => log.type === "task"), true);
assert.equal(
  completed.logs.some((log) => log.type === "status" && log.value === "operativa"),
  true
);

const created = buildStatusToggleUpdate(
  "machine-2",
  { status: "operativa", tasks: [], logs: [] },
  "fuera_de_servicio",
  "Alexis",
  {
    now: "2026-07-20T09:00:00.000Z",
    restoreTitle: "Volver a poner la máquina en operatividad",
    restoreDescription: "No arranca"
  }
);

assert.equal(created.tasks.length, 1);
assert.equal(created.tasks[0].source, RESTORE_OPERATION_TASK_SOURCE);
assert.equal(created.logs.some((log) => log.type === "task_created"), true);

const disconnected = buildStatusToggleUpdate(
  "machine-3",
  { status: "operativa", tasks: [], logs: [] },
  "desconectada",
  "Alexis",
  { now: "2026-07-20T11:00:00.000Z" }
);

assert.equal(disconnected.status, "desconectada");
assert.equal(disconnected.tasks.length, 0);
assert.equal(disconnected.activeStatusCycleId, "");
assert.equal(disconnected.logs.some((log) => log.type === "task_created"), false);

console.log("OK: out-of-service status reuses pending reactivation tasks safely.");
