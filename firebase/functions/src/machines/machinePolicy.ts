export const MAX_OWNED_MACHINES = 64;

export const canCreateOwnedMachines = (
  currentOwnedCount: number,
  requestedCount: number,
  isSuperadmin: boolean,
) => isSuperadmin ||
  currentOwnedCount + requestedCount <= MAX_OWNED_MACHINES;
