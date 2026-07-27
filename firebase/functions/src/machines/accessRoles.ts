export const LOCAL_ACCESS_ROLES = ["operator", "technician"] as const;
export type LocalAccessRole = typeof LOCAL_ACCESS_ROLES[number];

export const ACCESS_CAPABILITIES = [
  "viewMachine",
  "viewPlate",
  "viewTasks",
  "viewHistory",
  "viewDocuments",
  "createTasks",
  "editTasks",
  "deleteTasks",
  "completeTasks",
  "addTaskNotes",
  "changeStatus",
  "uploadImages",
  "uploadDocuments",
  "deleteDocuments",
] as const;
export type AccessCapability = typeof ACCESS_CAPABILITIES[number];
export type AccessPermissions = Record<AccessCapability, boolean>;
type AccessPermissionRole = LocalAccessRole | "public";

export const DEFAULT_ACCESS_ROLE_PERMISSIONS: Record<
  AccessPermissionRole,
  AccessPermissions
> = {
  operator: {
    viewMachine: true,
    viewPlate: true,
    viewTasks: true,
    viewHistory: false,
    viewDocuments: false,
    createTasks: false,
    editTasks: false,
    deleteTasks: false,
    completeTasks: true,
    addTaskNotes: true,
    changeStatus: true,
    uploadImages: false,
    uploadDocuments: false,
    deleteDocuments: false,
  },
  technician: {
    viewMachine: true,
    viewPlate: true,
    viewTasks: true,
    viewHistory: true,
    viewDocuments: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,
    completeTasks: true,
    addTaskNotes: true,
    changeStatus: true,
    uploadImages: false,
    uploadDocuments: false,
    deleteDocuments: false,
  },
  public: {
    viewMachine: true,
    viewPlate: true,
    viewTasks: false,
    viewHistory: false,
    viewDocuments: false,
    createTasks: false,
    editTasks: false,
    deleteTasks: false,
    completeTasks: false,
    addTaskNotes: false,
    changeStatus: false,
    uploadImages: false,
    uploadDocuments: false,
    deleteDocuments: false,
  },
};

export const normalizeAccessRole = (value: unknown): LocalAccessRole => {
  const role = (value || "").toString().trim().toLowerCase();
  return role === "tecnico" || role === "technician" ?
    "technician" :
    "operator";
};

export const getAccessRolePermissions = (
  roleValue: unknown,
  configured: unknown,
): AccessPermissions => {
  const role: AccessPermissionRole =
    (roleValue || "").toString().trim().toLowerCase() === "public" ?
      "public" :
      normalizeAccessRole(roleValue);
  const defaults = DEFAULT_ACCESS_ROLE_PERMISSIONS[role];
  const allConfigured = configured && typeof configured === "object" ?
    configured as Record<string, unknown> :
    {};
  const roleConfigured =
    allConfigured[role] && typeof allConfigured[role] === "object" ?
      allConfigured[role] as Record<string, unknown> :
      {};
  return Object.fromEntries(
    ACCESS_CAPABILITIES.map((key) => [
      key,
      typeof roleConfigured[key] === "boolean" ?
        roleConfigured[key] :
        defaults[key],
    ]),
  ) as AccessPermissions;
};
