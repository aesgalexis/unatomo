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
    ? "Prototype for global local-user access. Checkbox and PIN changes are visual for now."
    : "Prototipo de accesos globales para usuarios locales. Los cambios de checkbox y PIN son visuales por ahora.",
  accessLoading: isEn ? "Loading access..." : "Cargando accesos...",
  accessEmpty: isEn
    ? "No local users assigned to your machines yet."
    : "Todav\u00eda no hay usuarios locales asignados a tus m\u00e1quinas.",
  accessPrototypeSaved: isEn ? "Prototype updated" : "Prototipo actualizado",
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
};

const LOCAL_ROLE_OPTIONS = [
  { value: "manager", label: textMap.roleManager },
  { value: "usuario", label: textMap.roleUsuario },
  { value: "tecnico", label: textMap.roleTecnico },
  { value: "viewer", label: textMap.roleViewer },
  { value: "externo", label: textMap.roleExterno }
];

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

const renderAccessPrototype = ({ machineRows, userColumnsRef, selectedUserKeyRef }) => {
  let { userColumns } = userColumnsRef;
  let { selectedUserKey } = selectedUserKeyRef;
  tableWrap.innerHTML = "";
  if (!userColumns.some((user) => user.normalized === selectedUserKey)) {
    selectedUserKey = userColumns[0]?.normalized || "";
  }

  const rerender = () => {
    userColumnsRef.userColumns = userColumns;
    selectedUserKeyRef.selectedUserKey = selectedUserKey;
    renderAccessPrototype({ machineRows, userColumnsRef, selectedUserKeyRef });
  };

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
  if (!userColumnsRef.userColumns.length && !machineRows.length) {
    setStatus(textMap.accessEmpty);
    return;
  }
  setStatus("");
  renderAccessPrototype({ machineRows, userColumnsRef, selectedUserKeyRef });
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
