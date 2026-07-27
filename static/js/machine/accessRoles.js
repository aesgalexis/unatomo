export const ACCESS_ROLES = Object.freeze({
  OPERATOR: "operator",
  TECHNICIAN: "technician"
});

export const ACCESS_CAPABILITY_KEYS = Object.freeze([
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
  "deleteDocuments"
]);

export const DEFAULT_ACCESS_ROLE_PERMISSIONS = Object.freeze({
  operator: Object.freeze({
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
    deleteDocuments: false
  }),
  technician: Object.freeze({
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
    deleteDocuments: false
  }),
  public: Object.freeze({
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
    deleteDocuments: false
  })
});

export const normalizeAccessRole = (value) => {
  const role = (value || "").toString().trim().toLowerCase();
  if (role === "tecnico" || role === ACCESS_ROLES.TECHNICIAN) {
    return ACCESS_ROLES.TECHNICIAN;
  }
  return ACCESS_ROLES.OPERATOR;
};

export const getAccessRolePermissions = (role, configured = {}) => {
  const normalizedRole = role === "public" ? "public" : normalizeAccessRole(role);
  const defaults = DEFAULT_ACCESS_ROLE_PERMISSIONS[normalizedRole];
  const roleConfig = configured?.[normalizedRole] || {};
  return Object.fromEntries(
    ACCESS_CAPABILITY_KEYS.map((key) => [
      key,
      typeof roleConfig[key] === "boolean" ? roleConfig[key] : defaults[key]
    ])
  );
};

export const normalizeAccessRolePermissions = (configured = {}) =>
  Object.fromEntries(
    [...Object.values(ACCESS_ROLES), "public"].map((role) => [
      role,
      getAccessRolePermissions(role, configured)
    ])
  );
