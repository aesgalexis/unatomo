const assert = require("node:assert/strict");
const {
  MAX_OWNED_MACHINES,
  canCreateOwnedMachines,
} = require("../lib/machines/machinePolicy.js");

assert.equal(MAX_OWNED_MACHINES, 64);
assert.equal(canCreateOwnedMachines(63, 1, false), true);
assert.equal(canCreateOwnedMachines(64, 1, false), false);
assert.equal(canCreateOwnedMachines(60, 5, false), false);
assert.equal(canCreateOwnedMachines(64, 1, true), true);
assert.equal(canCreateOwnedMachines(200, 50, true), true);

console.log("machinePolicy tests passed");
