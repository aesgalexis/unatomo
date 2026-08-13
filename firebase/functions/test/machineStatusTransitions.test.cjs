const assert = require("node:assert/strict");
const {
  buildMachineStatusTransition,
} = require("../lib/machines/statusTransitions.js");

const base = {
  machineId: "machine-1",
  actor: "Alexis",
  occurredAt: "2026-08-13T12:00:00.000Z",
  language: "es",
};

const stopped = buildMachineStatusTransition({
  ...base,
  operationId: "operation-stop-1",
  machine: {status: "operativa", tasks: [], logs: []},
  targetStatus: "fuera_de_servicio",
  restoreTitle: "Restaurar máquina",
  restoreDescription: "No arranca",
  note: "Revisar alimentación",
});

assert.equal(stopped.changed, true);
assert.equal(stopped.eventType, "machine_out_of_service");
assert.equal(stopped.patch.status, "fuera_de_servicio");
assert.equal(stopped.patch.tasks.length, 1);
assert.equal(stopped.patch.tasks[0].source, "status-out-of-service");
assert.equal(stopped.patch.tasks[0].notes.length, 1);
assert.equal(stopped.patch.logs.some((log) => log.type === "task_created"), true);
assert.equal(stopped.patch.logs.some((log) => log.type === "status"), true);

const existingRestore = {
  id: "restore-existing",
  title: "Reparación anterior",
  description: "Conservar",
  frequency: "puntual",
  createdAt: "2026-08-12T12:00:00.000Z",
  lastCompletedAt: null,
  notes: [{id: "note-old", text: "Nota anterior"}],
  attachments: [{id: "image-old", url: "https://example.test/old.webp"}],
  source: "status-out-of-service",
  automated: true,
  statusTarget: "operativa",
  statusCycleId: "cycle-existing",
};
const reused = buildMachineStatusTransition({
  ...base,
  operationId: "operation-reuse-1",
  machine: {status: "operativa", tasks: [existingRestore], logs: []},
  targetStatus: "fuera_de_servicio",
  restoreTitle: "Reparación actualizada",
  note: "Nueva parada",
});
assert.equal(reused.restoreTaskId, existingRestore.id);
assert.equal(reused.statusCycleId, existingRestore.statusCycleId);
assert.equal(reused.patch.tasks.length, 1);
assert.equal(reused.patch.tasks[0].notes.length, 2);
assert.equal(reused.patch.tasks[0].attachments.length, 1);
assert.equal(reused.patch.logs.some((log) => log.type === "task_created"), false);

const restored = buildMachineStatusTransition({
  ...base,
  operationId: "operation-restore-1",
  occurredAt: "2026-08-13T13:00:00.000Z",
  machine: {...stopped.patch},
  targetStatus: "operativa",
  restoreTaskId: stopped.restoreTaskId,
  note: "Prueba correcta",
  attachments: [{
    id: "image-1",
    documentId: "image-1",
    name: "reparacion.webp",
    url: "https://example.test/reparacion.webp",
    uploadedAt: "2026-08-13T12:55:00.000Z",
  }],
});

assert.equal(stopped.patch.tasks[0].notes.length, 1);
assert.equal(stopped.patch.tasks[0].attachments.length, 0);
assert.equal(restored.eventType, "machine_operational_again");
assert.equal(restored.patch.status, "operativa");
assert.equal(restored.patch.activeStatusCycleId, "");
assert.equal(restored.patch.tasks.length, 0);
assert.equal(restored.patch.logs.some((log) => log.type === "task"), true);
assert.equal(
  restored.patch.logs.some((log) => log.type === "task_attachment_added"),
  true,
);

const disconnected = buildMachineStatusTransition({
  ...base,
  operationId: "operation-disconnect-1",
  machine: {status: "operativa", tasks: [], logs: []},
  targetStatus: "desconectada",
});
assert.equal(disconnected.eventType, null);
assert.equal(disconnected.patch.tasks.length, 0);

const noOp = buildMachineStatusTransition({
  ...base,
  operationId: "operation-noop-1",
  machine: {status: "operativa", tasks: [], logs: []},
  targetStatus: "operativa",
});
assert.equal(noOp.changed, false);
assert.deepEqual(noOp.patch, {});

console.log("OK: canonical machine status transitions preserve lifecycle behavior.");
