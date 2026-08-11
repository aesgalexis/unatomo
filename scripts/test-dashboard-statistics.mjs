import assert from "node:assert/strict";
import { buildMachineStatistics } from "../static/js/dashboard/tabs/statisticsModel.mjs";

const HOUR = 60 * 60 * 1000;
const now = Date.parse("2026-08-11T12:00:00.000Z");
const iso = (hoursBefore) => new Date(now - hoursBefore * HOUR).toISOString();

const stats = buildMachineStatistics({
  logs: [
    { type: "status", value: "operativa", ts: iso(20) },
    { type: "status", value: "fuera_de_servicio", ts: iso(10) },
    { type: "status", value: "operativa", ts: iso(6) },
    { type: "status", value: "fuera_de_servicio", ts: iso(2) },
    { type: "task", overdue: false, ts: iso(5) },
    { type: "task", overdue: true, ts: iso(3) }
  ],
  tasks: [{ id: "a" }, { id: "b" }]
}, now, { isOverdue: (task) => task.id === "b" });

assert.equal(stats.status.durations.operativa, 14 * HOUR);
assert.equal(stats.status.durations.fuera_de_servicio, 6 * HOUR);
assert.equal(stats.status.availability, 70);
assert.equal(stats.incidents.total, 2);
assert.equal(stats.incidents.closed, 1);
assert.equal(stats.incidents.medianRecovery, 4 * HOUR);
assert.equal(stats.incidents.activeDuration, 2 * HOUR);
assert.equal(stats.tasks.completed, 2);
assert.equal(stats.tasks.onTimeRate, 50);
assert.equal(stats.tasks.pending, 2);
assert.equal(stats.tasks.overdue, 1);

const empty = buildMachineStatistics({}, now);
assert.equal(empty.status.hasData, false);
assert.equal(empty.status.availability, null);
assert.equal(empty.incidents.total, 0);

const sinceCreation = buildMachineStatistics({
  createdAt: iso(24),
  status: "operativa",
  logs: []
}, now);
assert.equal(sinceCreation.status.hasData, true);
assert.equal(sinceCreation.status.durations.operativa, 24 * HOUR);
assert.equal(sinceCreation.status.availability, 100);
assert.equal(sinceCreation.status.currentSince, now - 24 * HOUR);

const creationWithIncident = buildMachineStatistics({
  createdAt: { seconds: (now - 24 * HOUR) / 1000 },
  status: "operativa",
  logs: [
    { type: "status", value: "fuera_de_servicio", ts: iso(20) },
    { type: "status", value: "operativa", ts: iso(16) }
  ]
}, now);
assert.equal(creationWithIncident.status.durations.operativa, 20 * HOUR);
assert.equal(creationWithIncident.status.durations.fuera_de_servicio, 4 * HOUR);
assert.equal(Math.round(creationWithIncident.status.availability), 83);
assert.equal(creationWithIncident.incidents.total, 1);

const lastEightHours = buildMachineStatistics({
  createdAt: iso(24),
  status: "operativa",
  logs: [
    { type: "status", value: "fuera_de_servicio", ts: iso(10) },
    { type: "status", value: "operativa", ts: iso(6) },
    { type: "task", overdue: false, ts: iso(9) },
    { type: "task", overdue: false, ts: iso(5) }
  ]
}, now, { periodStart: now - 8 * HOUR });
assert.equal(lastEightHours.status.durations.fuera_de_servicio, 2 * HOUR);
assert.equal(lastEightHours.status.durations.operativa, 6 * HOUR);
assert.equal(lastEightHours.incidents.total, 1);
assert.equal(lastEightHours.incidents.medianRecovery, 2 * HOUR);
assert.equal(lastEightHours.tasks.completed, 1);

console.log("Dashboard statistics checks passed.");
