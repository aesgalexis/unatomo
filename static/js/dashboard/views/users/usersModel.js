import { normalizeAccessRole } from "/static/js/machine/accessRoles.js";

export const USERS_ALL_CONTEXT_ID = "__all__";

export const normalizeLocalUsername = (value) =>
  (value || "").toString().trim().replace(/\s+/g, " ").toLowerCase();

export const getAccessOwnerUid = (machine, fallbackUid = "") =>
  (machine?.ownerUid || machine?.tenantId || fallbackUid || "").toString();

export const getMachineTitle = (machine) =>
  (machine?.title || machine?.name || machine?.model || machine?.id || "")
    .toString()
    .trim();

export const buildUserAccessContexts = (machines = [], currentUid = "") => {
  const contexts = new Map();
  (machines || []).forEach((machine) => {
    const ownerUid = getAccessOwnerUid(machine, currentUid);
    if (!ownerUid || !machine?.id) return;
    const context = contexts.get(ownerUid) || {
      ownerUid,
      ownerEmail: (machine.ownerEmail || "").toString(),
      machines: [],
      isOwner: ownerUid === currentUid
    };
    if (!context.ownerEmail && machine.ownerEmail) context.ownerEmail = machine.ownerEmail;
    context.machines.push(machine);
    contexts.set(ownerUid, context);
  });
  return Array.from(contexts.values()).sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return (a.ownerEmail || a.ownerUid).localeCompare(b.ownerEmail || b.ownerUid);
  });
};

export const collectAccessUsers = (machines = []) => {
  const byUser = new Map();
  (machines || []).forEach((machine) => {
    (Array.isArray(machine?.users) ? machine.users : []).forEach((localUser) => {
      const normalized = normalizeLocalUsername(localUser?.username);
      if (!normalized) return;
      const current = byUser.get(normalized) || {
        normalized,
        id: (localUser.id || "").toString(),
        username: (localUser.username || normalized).toString(),
        role: normalizeAccessRole(localUser.role),
        saltBase64: (localUser.saltBase64 || "").toString(),
        passwordHashBase64: (localUser.passwordHashBase64 || "").toString(),
        createdAt: (localUser.createdAt || "").toString(),
        assignedMachineIds: []
      };
      if (!current.id && localUser.id) current.id = localUser.id;
      if (!current.saltBase64 && localUser.saltBase64) current.saltBase64 = localUser.saltBase64;
      if (!current.passwordHashBase64 && localUser.passwordHashBase64) {
        current.passwordHashBase64 = localUser.passwordHashBase64;
      }
      current.role = normalizeAccessRole(localUser.role || current.role);
      current.assignedMachineIds.push(machine.id);
      byUser.set(normalized, current);
    });
  });
  return Array.from(byUser.values()).sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
  );
};

export const updateUsersInMachines = (machines, context, user, assignedMachineIds) => {
  const assigned = new Set(assignedMachineIds || []);
  const normalized = normalizeLocalUsername(user?.username);
  const total = context?.machines?.length || 0;
  return (machines || []).map((machine) => {
    if (getAccessOwnerUid(machine) !== context?.ownerUid) return machine;
    const withoutUser = (Array.isArray(machine.users) ? machine.users : []).filter(
      (item) => normalizeLocalUsername(item?.username) !== normalized
    );
    return {
      ...machine,
      users: assigned.has(machine.id)
        ? [...withoutUser, {
            ...user,
            accessScope: assigned.size === total ? "all" : "selected"
          }]
        : withoutUser
    };
  });
};

export const removeUserFromMachines = (machines, ownerUid, username) => {
  const normalized = normalizeLocalUsername(username);
  return (machines || []).map((machine) => {
    if (getAccessOwnerUid(machine) !== ownerUid) return machine;
    return {
      ...machine,
      users: (Array.isArray(machine.users) ? machine.users : []).filter(
        (item) => normalizeLocalUsername(item?.username) !== normalized
      )
    };
  });
};
