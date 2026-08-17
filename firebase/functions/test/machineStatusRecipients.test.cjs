const assert = require("node:assert/strict");
const {
  normalizeMachineNotificationPreferences,
  shouldNotifyAdministrator,
  shouldNotifyOwner,
} = require("../lib/notifications/machineStatusRecipients.js");

const legacyOwner = normalizeMachineNotificationPreferences({
  email: {
    enabled: true,
    events: {
      machineOutOfService: true,
      machineOperationalAgain: true,
    },
  },
});
assert.equal(
  shouldNotifyOwner(legacyOwner, "machineOutOfService"),
  true,
  "legacy owners keep receiving their own enabled events",
);

const ownerRoutingOnly = normalizeMachineNotificationPreferences({
  email: {
    enabled: false,
    receiveOwnedMachines: false,
    notifyAdministrators: true,
  },
});
const optedInAdministrator = normalizeMachineNotificationPreferences({
  email: {
    enabled: true,
    receiveAdministeredMachines: true,
    events: {machineOutOfService: true},
  },
});
assert.equal(
  shouldNotifyAdministrator(
    ownerRoutingOnly,
    optedInAdministrator,
    "machineOutOfService",
  ),
  true,
  "owner personal delivery does not gate administrator delivery",
);
assert.equal(
  shouldNotifyAdministrator(
    normalizeMachineNotificationPreferences({email: {notifyAdministrators: false}}),
    optedInAdministrator,
    "machineOutOfService",
  ),
  false,
  "owner must authorize administrator alerts",
);
assert.equal(
  shouldNotifyAdministrator(
    ownerRoutingOnly,
    normalizeMachineNotificationPreferences({email: {enabled: true}}),
    "machineOutOfService",
  ),
  false,
  "administrator must opt into administered equipment alerts",
);
assert.equal(
  shouldNotifyAdministrator(
    ownerRoutingOnly,
    normalizeMachineNotificationPreferences({
      email: {
        enabled: true,
        receiveAdministeredMachines: true,
        events: {machineOutOfService: false},
      },
    }),
    "machineOutOfService",
  ),
  false,
  "administrator event selection is respected",
);

console.log("machine status recipient checks passed");
