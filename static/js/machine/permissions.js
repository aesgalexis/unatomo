import { getAccessRolePermissions } from "./accessRoles.js";

const getPermissions = (role, configured) => {
  if (role === "admin") return null;
  return getAccessRolePermissions(role, configured);
};

export const canSeeTab = (role, tab, configured) => {
  if (role === "admin") {
    return ["quehaceres", "general", "historial", "configuracion"].includes(tab);
  }
  const permissions = getPermissions(role, configured);
  if (tab === "quehaceres") return permissions.viewTasks;
  if (tab === "general") return permissions.viewMachine ||
    permissions.viewPlate ||
    permissions.viewDocuments;
  if (tab === "historial") return permissions.viewHistory;
  return false;
};

export const canUseCapability = (role, capability, configured) =>
  role === "admin" || !!getPermissions(role, configured)?.[capability];

export const canEditStatus = (role, configured) =>
  canUseCapability(role, "changeStatus", configured);

export const canEditTasks = (role, configured) =>
  canUseCapability(role, "createTasks", configured) ||
  canUseCapability(role, "editTasks", configured) ||
  canUseCapability(role, "deleteTasks", configured);

export const canDownloadHistory = (role, configured) =>
  canUseCapability(role, "viewHistory", configured);

export const canSeeConfig = (role) => role === "admin";
