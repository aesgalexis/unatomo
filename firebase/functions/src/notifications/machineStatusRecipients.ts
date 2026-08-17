export type MachineEventPreference =
  "machineOutOfService" | "machineOperationalAgain";

export type MachineNotificationPreferences = {
  enabled: boolean;
  receiveOwnedMachines: boolean;
  notifyAdministrators: boolean;
  receiveAdministeredMachines: boolean;
  events: Record<MachineEventPreference, boolean>;
};

export const normalizeMachineNotificationPreferences = (
  value: unknown,
): MachineNotificationPreferences => {
  const email = (value as {email?: Record<string, unknown>} | null)?.email;
  const events = email?.events as Record<string, unknown> | undefined;
  return {
    enabled: email?.enabled === true,
    receiveOwnedMachines: email?.receiveOwnedMachines !== false,
    notifyAdministrators: email?.notifyAdministrators === true,
    receiveAdministeredMachines:
      email?.receiveAdministeredMachines === true,
    events: {
      machineOutOfService: events?.machineOutOfService !== false,
      machineOperationalAgain: events?.machineOperationalAgain !== false,
    },
  };
};

export const shouldNotifyOwner = (
  preferences: MachineNotificationPreferences,
  event: MachineEventPreference,
) => preferences.enabled &&
  preferences.receiveOwnedMachines &&
  preferences.events[event];

export const shouldNotifyAdministrator = (
  owner: MachineNotificationPreferences,
  administrator: MachineNotificationPreferences,
  event: MachineEventPreference,
) => owner.notifyAdministrators &&
  administrator.enabled &&
  administrator.receiveAdministeredMachines &&
  administrator.events[event];
