import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";
import { fetchMachine, fetchMachines } from "/static/js/dashboard/firestoreRepo.js";
import {
  getAppBasePrefix,
  getCurrentLang,
  localizeEsPath
} from "/static/js/site/locale.js";

const currentLang = getCurrentLang();
const isEn = currentLang === "en";
const appBasePrefix = getAppBasePrefix();

const textMap = {
  access: isEn ? "Access" : "Accesos",
  accessIntro: isEn
    ? "Prototype for global access and role permissions. Changes are visual for now."
    : "Prototipo de accesos globales y permisos por rol. Los cambios son solo visuales por ahora.",
  accessLoading: isEn ? "Loading access..." : "Cargando accesos...",
  accessEmpty: isEn
    ? "No local users assigned to your machines yet."
    : "Todav\u00eda no hay usuarios locales asignados a tus m\u00e1quinas.",
  accessPrototypeSaved: isEn ? "Prototype updated" : "Prototipo actualizado",
  accessUsersTab: isEn ? "Users" : "Usuarios",
  accessRolePermissionsTab: isEn ? "Role permissions" : "Permisos por rol",
  accessRolePermissionsIntro: isEn
    ? "Choose what each role can see and do after opening a machine from QR or NFC."
    : "Define qu\u00e9 puede ver y hacer cada rol al abrir una m\u00e1quina desde QR o NFC.",
  accessProtectedRole: isEn ? "Protected read-only profile" : "Perfil de solo lectura protegido",
  accessPermissionsVisual: isEn
    ? "Visual prototype. These permissions are not persisted yet."
    : "Prototipo visual. Estos permisos todav\u00eda no se guardan.",
  accessPermissionRead: isEn ? "Read" : "Lectura",
  accessPermissionOperate: isEn ? "Create and update" : "Crear y actualizar",
  accessPermissionAdmin: isEn ? "Administration" : "Administraci\u00f3n",
  accessAddUser: isEn ? "Create local user" : "Crear usuario local",
  accessNewUserPlaceholder: isEn ? "Name" : "Nombre",
  accessNewPinPlaceholder: isEn ? "PIN" : "PIN",
  accessCreate: isEn ? "Create" : "Crear",
  accessPin: isEn ? "PIN" : "PIN",
  accessSavePin: isEn ? "Save PIN" : "Guardar PIN",
  accessAllMachines: isEn ? "All" : "Todas",
  accessOwnerMachine: isEn ? "Owned" : "Propia",
  accessAdminMachine: isEn ? "Admin" : "Administrada",
  accessSelectedUser: isEn ? "Selected user" : "Usuario seleccionado",
  accessAssignments: isEn ? "Machine access" : "Acceso a m\u00e1quinas",
  accessUser: isEn ? "User" : "Usuario",
  accessLocalType: isEn ? "Local PIN" : "PIN local",
  accessPrototypeType: isEn ? "Prototype" : "Prototipo",
  accessRole: isEn ? "Role" : "Rol",
  accessRoleMixed: isEn ? "Mixed" : "Mixto",
  accessUpdated: isEn ? "Access preview updated" : "Vista de accesos actualizada",
  accessError: isEn ? "Could not update access" : "No se pudieron actualizar los accesos",
  roleManager: isEn ? "Manager" : "Gestor",
  roleUsuario: isEn ? "Operator" : "Operario",
  roleTecnico: isEn ? "Technician" : "T\u00e9cnico",
  roleViewer: isEn ? "Viewer" : "Solo lectura",
  roleExterno: isEn ? "External" : "Externo",
  permissionViewMachine: isEn ? "View machine overview" : "Ver informaci\u00f3n de la m\u00e1quina",
  permissionViewTasks: isEn ? "View tasks" : "Ver tareas",
  permissionViewHistory: isEn ? "View history log" : "Leer el registro hist\u00f3rico",
  permissionViewDocuments: isEn ? "View and download documents" : "Ver y descargar documentos",
  permissionCreateTasks: isEn ? "Create tasks" : "Crear tareas",
  permissionEditTasks: isEn ? "Edit tasks" : "Editar tareas",
  permissionCompleteTasks: isEn ? "Complete tasks" : "Dar tareas por completadas",
  permissionAddTaskNotes: isEn ? "Add task notes" : "A\u00f1adir notas a tareas",
  permissionChangeStatus: isEn ? "Change machine status" : "Cambiar el estado de la m\u00e1quina",
  permissionUploadImages: isEn ? "Upload images" : "Cargar im\u00e1genes",
  permissionUploadDocuments: isEn ? "Upload documents and manuals" : "Cargar documentos y manuales",
  permissionDeleteDocuments: isEn ? "Delete documents" : "Eliminar documentos",
  permissionManageAccess: isEn ? "Manage users and access" : "Gestionar usuarios y accesos",
  permissionManageTags: isEn ? "Manage QR and NFC tags" : "Gestionar QR y etiquetas NFC",
};

const LOCAL_ROLE_OPTIONS = [
  { value: "manager", label: textMap.roleManager },
  { value: "usuario", label: textMap.roleUsuario },
  { value: "tecnico", label: textMap.roleTecnico },
  { value: "viewer", label: textMap.roleViewer },
  { value: "externo", label: textMap.roleExterno }
];

const CAPABILITY_DEFINITIONS = [
  { key: "viewMachine", group: "read", label: textMap.permissionViewMachine },
  { key: "viewTasks", group: "read", label: textMap.permissionViewTasks },
  { key: "viewHistory", group: "read", label: textMap.permissionViewHistory },
  { key: "viewDocuments", group: "read", label: textMap.permissionViewDocuments },
  { key: "createTasks", group: "operate", label: textMap.permissionCreateTasks },
  { key: "editTasks", group: "operate", label: textMap.permissionEditTasks },
  { key: "completeTasks", group: "operate", label: textMap.permissionCompleteTasks },
  { key: "addTaskNotes", group: "operate", label: textMap.permissionAddTaskNotes },
  { key: "changeStatus", group: "operate", label: textMap.permissionChangeStatus },
  { key: "uploadImages", group: "operate", label: textMap.permissionUploadImages },
  { key: "uploadDocuments", group: "operate", label: textMap.permissionUploadDocuments },
  { key: "deleteDocuments", group: "admin", label: textMap.permissionDeleteDocuments },
  { key: "manageAccess", group: "admin", label: textMap.permissionManageAccess },
  { key: "manageTags", group: "admin", label: textMap.permissionManageTags }
];

const DEFAULT_ROLE_PERMISSIONS = {
  manager: Object.fromEntries(CAPABILITY_DEFINITIONS.map(({ key }) => [key, true])),
  usuario: {
    viewMachine: true, viewTasks: true, viewHistory: true, viewDocuments: true,
    createTasks: true, editTasks: true, completeTasks: true, addTaskNotes: true,
    changeStatus: true, uploadImages: true, uploadDocuments: false,
    deleteDocuments: false, manageAccess: false, manageTags: false
  },
  tecnico: {
    viewMachine: true, viewTasks: true, viewHistory: true, viewDocuments: true,
    createTasks: true, editTasks: true, completeTasks: true, addTaskNotes: true,
    changeStatus: true, uploadImages: true, uploadDocuments: true,
    deleteDocuments: false, manageAccess: false, manageTags: false
  },
  viewer: Object.fromEntries(
    CAPABILITY_DEFINITIONS.map(({ key, group }) => [key, group === "read"])
  ),
  externo: {
    viewMachine: true, viewTasks: true, viewHistory: false, viewDocuments: true,
    createTasks: false, editTasks: false, completeTasks: false, addTaskNotes: true,
    changeStatus: false, uploadImages: true, uploadDocuments: false,
    deleteDocuments: false, manageAccess: false, manageTags: false
  }
};

const createDefaultRolePermissions = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => [role, { ...permissions }])
  );

const mount = document.getElementById("access-mount");
const statusEl = document.getElementById("access-status");
const tableWrap = document.getElementById("access-table-wrap");

const normalizeLocalUsername = (value) =>
  (value || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const setStatus = (message = "", state = "") => {
  if (!statusEl) return;
  statusEl.textContent = message;
  if (state) statusEl.dataset.state = state;
  else statusEl.removeAttribute("data-state");
};

const getMachineTitle = (machine) =>
  (machine?.title || machine?.name || machine?.model || machine?.id || "")
    .toString()
    .trim();

const escapeAccessHtml = (value) =>
  (value || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getRoleLabel = (role) =>
  LOCAL_ROLE_OPTIONS.find((item) => item.value === role)?.label || role || textMap.accessRoleMixed;

const collectLocalAccessRows = (machines = []) => {
  const byUser = new Map();
  machines.forEach((machine) => {
    const users = Array.isArray(machine.users) ? machine.users : [];
    users.forEach((localUser) => {
      const normalized = normalizeLocalUsername(localUser?.username);
      if (!normalized) return;
      const current = byUser.get(normalized) || {
        normalized,
        username: (localUser.username || normalized).toString(),
        assignments: [],
        role: (localUser.role || "usuario").toString(),
        prototypeOnly: false
      };
      const role = (localUser.role || "usuario").toString();
      current.assignments.push({
        machineId: machine.id,
        machineTitle: getMachineTitle(machine),
        role,
        userId: localUser.id || "",
        prototypeOnly: false
      });
      if (!current.role || current.role === "usuario") current.role = role;
      byUser.set(normalized, current);
    });
  });

  const prototypeMachineNames = new Set(["test machine", "test machine 2"]);
  const prototypeMachines = machines.filter((machine) =>
    prototypeMachineNames.has(normalizeLocalUsername(getMachineTitle(machine)))
  );
  if (prototypeMachines.length) {
    [
      { username: "Lucia", role: "manager" },
      { username: "Paco", role: "usuario" },
      { username: "Luis", role: "tecnico" },
      { username: "Ana", role: "viewer" },
      { username: "Marta", role: "externo" }
    ].forEach((demoUser) => {
      const normalized = normalizeLocalUsername(demoUser.username);
      if (byUser.has(normalized)) return;
      byUser.set(normalized, {
        normalized,
        username: demoUser.username,
        role: demoUser.role,
        prototypeOnly: true,
        assignments: prototypeMachines.map((machine) => ({
          machineId: machine.id,
          machineTitle: getMachineTitle(machine),
          role: demoUser.role,
          userId: `prototype_${normalized}_${machine.id}`,
          prototypeOnly: true
        }))
      });
    });
  }

  return Array.from(byUser.values()).sort((a, b) =>
    a.username.localeCompare(b.username, currentLang)
  );
};

const fetchVisibleAccessMachines = async (uid) => {
  const ownerMachines = await fetchMachines(uid);
  const ownerList = ownerMachines.map((machine) => ({
    ...machine,
    accessScope: "owner",
    accessScopeLabel: textMap.accessOwnerMachine
  }));
  let adminList = [];
  try {
    const links = await fetchLinksForAdmin(uid);
    const activeLinks = links.filter((link) =>
      link && link.status !== "left" && link.status !== "rejected"
    );
    const adminMachines = await Promise.all(
      activeLinks.map(async (link) => {
        try {
          if (!link?.machineId) return null;
          const machine = await fetchMachine(null, link.machineId);
          if (!machine) return null;
          return {
            ...machine,
            accessScope: "admin",
            accessScopeLabel: textMap.accessAdminMachine,
            ownerUid: link.ownerUid || machine.ownerUid || "",
            ownerEmail: link.ownerEmail || machine.ownerEmail || ""
          };
        } catch {
          return null;
        }
      })
    );
    adminList = adminMachines.filter(Boolean);
  } catch {
    adminList = [];
  }
  const seen = new Set();
  return [...ownerList, ...adminList].filter((machine) => {
    if (!machine?.id || seen.has(machine.id)) return false;
    seen.add(machine.id);
    return true;
  });
};

const renderRolePermissionsPrototype = ({ rolePermissionsRef, selectedRoleRef, rerender }) => {
  const rolePermissions = rolePermissionsRef.rolePermissions;
  if (!LOCAL_ROLE_OPTIONS.some((role) => role.value === selectedRoleRef.selectedRole)) {
    selectedRoleRef.selectedRole = LOCAL_ROLE_OPTIONS[0].value;
  }
  const selectedRole = selectedRoleRef.selectedRole;
  if (selectedRole === "viewer") {
    rolePermissions.viewer = { ...DEFAULT_ROLE_PERMISSIONS.viewer };
  }

  const intro = document.createElement("div");
  intro.className = "access-permissions-intro";
  intro.innerHTML = `
    <strong>${escapeAccessHtml(textMap.accessRolePermissionsIntro)}</strong>
    <span>${escapeAccessHtml(textMap.accessPermissionsVisual)}</span>
  `;
  tableWrap.appendChild(intro);

  const shell = document.createElement("div");
  shell.className = "access-permissions-shell";

  const roleList = document.createElement("div");
  roleList.className = "access-role-list";
  roleList.setAttribute("aria-label", textMap.accessRole);
  LOCAL_ROLE_OPTIONS.forEach((role) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "access-role-item";
    if (role.value === selectedRole) button.dataset.active = "true";
    const enabledCount = CAPABILITY_DEFINITIONS.filter(
      ({ key }) => rolePermissions[role.value]?.[key]
    ).length;
    button.innerHTML = `
      <span>${escapeAccessHtml(role.label)}</span>
      <small>${enabledCount}/${CAPABILITY_DEFINITIONS.length}</small>
    `;
    button.addEventListener("click", () => {
      selectedRoleRef.selectedRole = role.value;
      rerender();
    });
    roleList.appendChild(button);
  });

  const editor = document.createElement("div");
  editor.className = "access-permissions-editor";
  const editorTitle = document.createElement("div");
  editorTitle.className = "access-editor-title";
  editorTitle.innerHTML = `
    <span>${escapeAccessHtml(textMap.accessRole)}</span>
    <strong>${escapeAccessHtml(getRoleLabel(selectedRole))}</strong>
  `;
  editor.appendChild(editorTitle);

  if (selectedRole === "viewer") {
    const protectedNote = document.createElement("div");
    protectedNote.className = "access-protected-note";
    protectedNote.textContent = textMap.accessProtectedRole;
    editor.appendChild(protectedNote);
  }

  ["read", "operate", "admin"].forEach((group) => {
    const groupTitle = document.createElement("div");
    groupTitle.className = "access-section-title access-permission-group-title";
    groupTitle.textContent = group === "read"
      ? textMap.accessPermissionRead
      : group === "operate"
        ? textMap.accessPermissionOperate
        : textMap.accessPermissionAdmin;
    editor.appendChild(groupTitle);

    const groupList = document.createElement("div");
    groupList.className = "access-permission-list";
    CAPABILITY_DEFINITIONS.filter((capability) => capability.group === group).forEach((capability) => {
      const row = document.createElement("label");
      row.className = "access-permission-row";
      const copy = document.createElement("span");
      copy.textContent = capability.label;
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = !!rolePermissions[selectedRole]?.[capability.key];
      check.disabled = selectedRole === "viewer";
      check.addEventListener("change", () => {
        rolePermissions[selectedRole][capability.key] = check.checked;
        setStatus(
          `${textMap.accessUpdated}: ${getRoleLabel(selectedRole)} · ${capability.label}`,
          "ok"
        );
        rerender();
      });
      row.appendChild(copy);
      row.appendChild(check);
      groupList.appendChild(row);
    });
    editor.appendChild(groupList);
  });

  shell.appendChild(roleList);
  shell.appendChild(editor);
  tableWrap.appendChild(shell);
};

const renderAccessPrototype = ({
  machineRows,
  rolePermissionsRef,
  selectedRoleRef,
  selectedUserKeyRef,
  uiStateRef,
  userColumnsRef
}) => {
  let { userColumns } = userColumnsRef;
  let { selectedUserKey } = selectedUserKeyRef;
  tableWrap.innerHTML = "";
  if (!userColumns.some((user) => user.normalized === selectedUserKey)) {
    selectedUserKey = userColumns[0]?.normalized || "";
  }

  const rerender = () => {
    userColumnsRef.userColumns = userColumns;
    selectedUserKeyRef.selectedUserKey = selectedUserKey;
    renderAccessPrototype({
      machineRows,
      rolePermissionsRef,
      selectedRoleRef,
      selectedUserKeyRef,
      uiStateRef,
      userColumnsRef
    });
  };

  const tabs = document.createElement("div");
  tabs.className = "access-tabs";
  tabs.setAttribute("role", "tablist");
  [
    { value: "users", label: textMap.accessUsersTab },
    { value: "permissions", label: textMap.accessRolePermissionsTab }
  ].forEach((tabData) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "access-tab";
    button.setAttribute("role", "tab");
    const isActive = (uiStateRef.activeView || "users") === tabData.value;
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.textContent = tabData.label;
    button.addEventListener("click", () => {
      uiStateRef.activeView = tabData.value;
      rerender();
    });
    tabs.appendChild(button);
  });
  tableWrap.appendChild(tabs);

  if ((uiStateRef.activeView || "users") === "permissions") {
    renderRolePermissionsPrototype({ rolePermissionsRef, selectedRoleRef, rerender });
    return;
  }

  const createForm = document.createElement("div");
  createForm.className = "access-create";

  const nameInput = document.createElement("input");
  nameInput.className = "access-input";
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.placeholder = textMap.accessNewUserPlaceholder;

  const pinInput = document.createElement("input");
  pinInput.className = "access-input access-pin-input";
  pinInput.type = "password";
  pinInput.maxLength = 8;
  pinInput.placeholder = textMap.accessNewPinPlaceholder;
  pinInput.autocomplete = "new-password";

  const roleSelect = document.createElement("select");
  roleSelect.className = "access-role";
  LOCAL_ROLE_OPTIONS.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    roleSelect.appendChild(option);
  });

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "access-mini-btn";
  createButton.textContent = textMap.accessCreate;
  createButton.addEventListener("click", () => {
    const username = nameInput.value.trim().replace(/\s+/g, " ");
    const normalized = normalizeLocalUsername(username);
    if (!normalized || userColumns.some((row) => row.normalized === normalized)) {
      nameInput.setAttribute("aria-invalid", "true");
      return;
    }
    userColumns = [
      ...userColumns,
      {
        normalized,
        username,
        role: roleSelect.value || "usuario",
        prototypeOnly: true,
        assignments: []
      }
    ].sort((a, b) => a.username.localeCompare(b.username, currentLang));
    selectedUserKey = normalized;
    setStatus(textMap.accessPrototypeSaved, "ok");
    rerender();
  });

  createForm.appendChild(document.createTextNode(textMap.accessAddUser));
  createForm.appendChild(nameInput);
  createForm.appendChild(pinInput);
  createForm.appendChild(roleSelect);
  createForm.appendChild(createButton);
  tableWrap.appendChild(createForm);

  if (!userColumns.length) {
    const empty = document.createElement("div");
    empty.className = "access-status";
    empty.textContent = textMap.accessAddUser;
    tableWrap.appendChild(empty);
    return;
  }

  const selectedUser = userColumns.find((user) => user.normalized === selectedUserKey) || userColumns[0];
  selectedUserKey = selectedUser.normalized;
  const shell = document.createElement("div");
  shell.className = "access-focus";

  const userList = document.createElement("div");
  userList.className = "access-user-list";
  userList.setAttribute("aria-label", textMap.accessUser);
  userColumns.forEach((user) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "access-user-item";
    if (user.normalized === selectedUserKey) button.dataset.active = "true";
    const type = user.prototypeOnly ? textMap.accessPrototypeType : textMap.accessLocalType;
    button.innerHTML = `
      <span>${escapeAccessHtml(user.username)}</span>
      <small>${escapeAccessHtml(type)}</small>
    `;
    button.addEventListener("click", () => {
      selectedUserKey = user.normalized;
      rerender();
    });
    userList.appendChild(button);
  });

  const editor = document.createElement("div");
  editor.className = "access-editor";

  const title = document.createElement("div");
  title.className = "access-editor-title";
  title.innerHTML = `
    <span>${escapeAccessHtml(textMap.accessSelectedUser)}</span>
    <strong>${escapeAccessHtml(selectedUser.username)}</strong>
  `;
  editor.appendChild(title);

  const controls = document.createElement("div");
  controls.className = "access-editor-controls";

  const roleLabel = document.createElement("label");
  roleLabel.textContent = textMap.accessRole;
  const select = document.createElement("select");
  select.className = "access-role";
  LOCAL_ROLE_OPTIONS.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    if ((selectedUser.role || "usuario") === optionData.value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    selectedUser.role = select.value;
    setStatus(`${textMap.accessUpdated}: ${selectedUser.username} -> ${getRoleLabel(selectedUser.role)}`, "ok");
  });
  roleLabel.appendChild(select);

  const pinWrap = document.createElement("label");
  pinWrap.textContent = textMap.accessPin;
  const pinActions = document.createElement("span");
  pinActions.className = "access-pin-actions";
  const pinInputEdit = document.createElement("input");
  pinInputEdit.className = "access-input access-pin-input";
  pinInputEdit.type = "password";
  pinInputEdit.maxLength = 8;
  pinInputEdit.placeholder = textMap.accessNewPinPlaceholder;
  const savePin = document.createElement("button");
  savePin.type = "button";
  savePin.className = "access-mini-btn";
  savePin.textContent = textMap.accessSavePin;
  savePin.addEventListener("click", () => {
    setStatus(`${textMap.accessPrototypeSaved}: ${selectedUser.username}`, "ok");
    pinInputEdit.value = "";
  });
  pinActions.appendChild(pinInputEdit);
  pinActions.appendChild(savePin);
  pinWrap.appendChild(pinActions);

  const allWrap = document.createElement("label");
  allWrap.className = "access-all-toggle";
  const allCheck = document.createElement("input");
  allCheck.type = "checkbox";
  const assignedIds = new Set(selectedUser.assignments.map((item) => item.machineId));
  allCheck.checked = machineRows.length > 0 && machineRows.every((machine) => assignedIds.has(machine.id));
  allCheck.addEventListener("change", () => {
    selectedUser.assignments = allCheck.checked
      ? machineRows.map((machine) => ({
          machineId: machine.id,
          machineTitle: machine.title,
          role: selectedUser.role,
          prototypeOnly: true
        }))
      : [];
    setStatus(textMap.accessPrototypeSaved, "ok");
    rerender();
  });
  allWrap.appendChild(allCheck);
  allWrap.appendChild(document.createTextNode(textMap.accessAllMachines));

  controls.appendChild(roleLabel);
  controls.appendChild(pinWrap);
  controls.appendChild(allWrap);
  editor.appendChild(controls);

  const assignmentsTitle = document.createElement("div");
  assignmentsTitle.className = "access-section-title";
  assignmentsTitle.textContent = textMap.accessAssignments;
  editor.appendChild(assignmentsTitle);

  const machineList = document.createElement("div");
  machineList.className = "access-machine-list";
  if (!machineRows.length) {
    const emptyMachines = document.createElement("div");
    emptyMachines.className = "access-status";
    emptyMachines.textContent = textMap.accessEmpty;
    machineList.appendChild(emptyMachines);
  }
  machineRows.forEach((machine) => {
    const row = document.createElement("label");
    row.className = "access-machine-row";
    const check = document.createElement("input");
    check.type = "checkbox";
    const current = new Set(selectedUser.assignments.map((item) => item.machineId));
    check.checked = current.has(machine.id);
    check.addEventListener("change", () => {
      const next = new Set(selectedUser.assignments.map((item) => item.machineId));
      if (check.checked) next.add(machine.id);
      else next.delete(machine.id);
      selectedUser.assignments = machineRows
        .filter((item) => next.has(item.id))
        .map((item) => ({
          machineId: item.id,
          machineTitle: item.title,
          role: selectedUser.role,
          prototypeOnly: true
        }));
      setStatus(textMap.accessPrototypeSaved, "ok");
      rerender();
    });
    const copy = document.createElement("span");
    copy.innerHTML = `
      <strong>${escapeAccessHtml(machine.title)}</strong>
      <small data-scope="${escapeAccessHtml(machine.scope)}">${escapeAccessHtml(machine.scopeLabel)}</small>
    `;
    row.appendChild(check);
    row.appendChild(copy);
    machineList.appendChild(row);
  });
  editor.appendChild(machineList);

  shell.appendChild(userList);
  shell.appendChild(editor);
  tableWrap.appendChild(shell);
};

const loadGlobalAccess = async (uid) => {
  if (!mount || !statusEl || !tableWrap) return;
  setStatus(textMap.accessLoading);
  tableWrap.innerHTML = "";
  let machines = [];
  try {
    machines = await fetchVisibleAccessMachines(uid);
  } catch {
    setStatus(textMap.accessError, "error");
    return;
  }

  const machineRows = machines.map((machine) => ({
    id: machine.id,
    title: getMachineTitle(machine) || machine.id,
    scope: machine.accessScope || "owner",
    scopeLabel: machine.accessScopeLabel || textMap.accessOwnerMachine
  }));
  const userColumnsRef = { userColumns: collectLocalAccessRows(machines) };
  const selectedUserKeyRef = { selectedUserKey: userColumnsRef.userColumns[0]?.normalized || "" };
  const rolePermissionsRef = { rolePermissions: createDefaultRolePermissions() };
  const selectedRoleRef = { selectedRole: "manager" };
  const uiStateRef = { activeView: "users" };
  setStatus("");
  renderAccessPrototype({
    machineRows,
    rolePermissionsRef,
    selectedRoleRef,
    selectedUserKeyRef,
    uiStateRef,
    userColumnsRef
  });
};

if (mount) {
  const topbarTitle = document.getElementById("topbar-title");
  if (topbarTitle) topbarTitle.textContent = textMap.access;
  document.title = `${textMap.access} | unatomo`;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = localizeEsPath("/es/auth/login.html");
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = `${appBasePrefix || ""}/?setup=1`;
        return;
      }
    } catch {
      window.location.href = `${appBasePrefix || ""}/?setup=1`;
      return;
    }
    loadGlobalAccess(user.uid);
  });
}
