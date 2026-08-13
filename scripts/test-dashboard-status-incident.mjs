import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const taskActions = read("../static/js/dashboard/tabs/tasks/taskActions.js");
const statusRepo = read("../static/js/dashboard/machineStatusRepo.js");
const cardHooks = read(
  "../static/js/dashboard/rendering/hooks/machineCardCoreHooks.js"
);
const taskHooks = read("../static/js/dashboard/cardHooks/taskHooks.js");
const machinePage = read("../static/js/machine/index.js");
const firestoreRules = read("../firebase/firestore.rules");

assert.equal(taskActions.includes("buildStatusToggleUpdate"), false);
assert.equal(statusRepo.includes('"transitionMachineStatus"'), true);
assert.equal(cardHooks.includes("await transitionMachineStatus("), true);
assert.equal(taskHooks.includes("await transitionMachineStatus("), true);
assert.equal(machinePage.includes("statusTransition:"), true);
assert.equal(machinePage.includes("buildStatusToggleUpdate"), false);
assert.equal(firestoreRules.includes("match /machine_domain_events/{eventId}"), true);
assert.equal(firestoreRules.includes("'lastStatusOperationId'"), true);

console.log(
  "OK: machine status changes use the canonical backend transition flow."
);
