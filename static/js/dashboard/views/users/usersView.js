import {
  ACCESS_CAPABILITY_KEYS,
  normalizeAccessRole,
  normalizeAccessRolePermissions
} from "/static/js/machine/accessRoles.js";
import {
  buildUserAccessContexts,
  collectAccessUsers,
  getMachineTitle,
  USERS_ALL_CONTEXT_ID
} from "./usersModel.js";

const el = (tag, className = "", text = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const initials = (name) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();

const CAPABILITY_LABELS = {
  viewMachine: ["Ver información básica", "View basic information"],
  viewPlate: ["Ver placa", "View plate"],
  viewTasks: ["Ver tareas", "View tasks"],
  viewHistory: ["Ver historial", "View history"],
  viewDocuments: ["Ver documentos", "View documents"],
  createTasks: ["Crear tareas", "Create tasks"],
  editTasks: ["Editar tareas", "Edit tasks"],
  deleteTasks: ["Eliminar tareas", "Delete tasks"],
  completeTasks: ["Completar tareas", "Complete tasks"],
  addTaskNotes: ["Añadir notas", "Add notes"],
  changeStatus: ["Cambiar estado", "Change status"],
  uploadImages: ["Subir imágenes", "Upload images"],
  uploadDocuments: ["Subir documentos", "Upload documents"],
  deleteDocuments: ["Eliminar documentos", "Delete documents"]
};

export const renderUsersView = (container, machines = [], options = {}) => {
  container.className = "dashboard-users-host";
  const {
    currentUid = "",
    query = "",
    contextOwnerUid = "",
    expandedUsers = [],
    createOpen = false,
    policyOpen = false,
    showInlineNavigation = true,
    isEn = false,
    onContextChange,
    onToggleUser,
    onCloseCreate,
    onCreate,
    onSaveUser,
    onDeleteUser,
    onTogglePolicy,
    onSavePolicy
  } = options;
  const tx = (es, en) => isEn ? en : es;
  const contexts = buildUserAccessContexts(machines, currentUid);
  const showAllContexts = contextOwnerUid === USERS_ALL_CONTEXT_ID;
  const context = contexts.find((item) => item.ownerUid === contextOwnerUid) || contexts[0];
  const contextLabel = context?.isOwner
    ? tx("Mis máquinas", "My machines")
    : context?.ownerEmail || tx("Máquinas administradas", "Managed machines");
  const allUsers = (showAllContexts ? contexts : context ? [context] : [])
    .flatMap((item) => collectAccessUsers(item.machines).map((user) => ({
      ...user,
      contextOwnerUid: item.ownerUid,
      contextLabel: item.isOwner
        ? tx("Mis máquinas", "My machines")
        : item.ownerEmail || tx("Máquinas administradas", "Managed machines"),
      cardKey: `${item.ownerUid}:${user.normalized}`
    })));
  const visibleMachineCount = showAllContexts
    ? contexts.reduce((total, item) => total + item.machines.length, 0)
    : context?.machines?.length || 0;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const users = allUsers.filter((user) => !normalizedQuery ||
    user.username.toLocaleLowerCase().includes(normalizedQuery) ||
    (user.role === "technician" ? tx("técnico", "technician") : tx("operario", "operator"))
      .toLocaleLowerCase().includes(normalizedQuery)
  );

  const view = el("section", "dashboard-users-view");
  const head = el("header", "global-registry-header dashboard-users-head");
  head.appendChild(el("h3", "", tx("Usuarios", "Users")));
  head.appendChild(el("span", "global-registry-count dashboard-users-count", tx(
    `${users.length} usuario${users.length === 1 ? "" : "s"} / ${visibleMachineCount} máquina${visibleMachineCount === 1 ? "" : "s"}`,
    `${users.length} user${users.length === 1 ? "" : "s"} / ${visibleMachineCount} machine${visibleMachineCount === 1 ? "" : "s"}`
  )));
  view.appendChild(head);

  const actions = el("div", "dashboard-users-head-actions");
  if (showInlineNavigation && contexts.length > 1) {
    const select = el("select", "dashboard-users-context dashboard-users-select");
    select.setAttribute("aria-label", tx("Espacio de acceso", "Access space"));
    const allOption = document.createElement("option");
    allOption.value = USERS_ALL_CONTEXT_ID;
    allOption.textContent = tx("Todos los usuarios", "All users");
    allOption.selected = showAllContexts;
    select.appendChild(allOption);
    contexts.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.ownerUid;
      option.textContent = item.isOwner
        ? tx("Mis máquinas", "My machines")
        : item.ownerEmail || tx("Máquinas administradas", "Managed machines");
      option.selected = !showAllContexts && item.ownerUid === context?.ownerUid;
      select.appendChild(option);
    });
    select.addEventListener("change", () => onContextChange?.(select.value));
    actions.appendChild(select);
  }
  if (showInlineNavigation) {
    const policyLink = el("a", "dashboard-users-policy-link", tx("Roles", "Roles"));
    policyLink.href = isEn ? "#/users" : "#/usuarios";
    policyLink.setAttribute("aria-expanded", policyOpen ? "true" : "false");
    policyLink.addEventListener("click", (event) => {
      event.preventDefault();
      onTogglePolicy?.();
    });
    actions.appendChild(policyLink);
    view.appendChild(actions);
  }

  if (!context) {
    view.appendChild(el("div", "dashboard-users-empty", tx(
      "Añade una máquina para empezar a gestionar usuarios.",
      "Add a machine to start managing users."
    )));
    container.appendChild(view);
    return;
  }

  if (policyOpen) {
    const policy = el("section", "dashboard-users-policy");
    const policyHead = el("div", "dashboard-users-policy-head");
    policyHead.append(el("h3", "", tx("Permisos por rol", "Role permissions")));
    policy.appendChild(policyHead);
    const permissions = normalizeAccessRolePermissions(
      context.machines.find((machine) => machine.accessRolePermissions)?.accessRolePermissions
    );
    const grid = el("div", "dashboard-users-policy-grid");
    ["operator", "technician", "public"].forEach((role) => {
      const column = el("fieldset", "dashboard-users-policy-role");
      const legend = el("legend", "", role === "public"
        ? tx("Público", "Public")
        : role === "technician"
          ? tx("Técnico", "Technician")
          : tx("Operario", "Operator"));
      column.appendChild(legend);
      ACCESS_CAPABILITY_KEYS.forEach((key) => {
        const label = el("label", "dashboard-users-permission");
        const input = document.createElement("input");
        input.type = "checkbox";
        const publicReadPermission = role !== "public" || key.startsWith("view");
        if (!publicReadPermission) permissions.public[key] = false;
        input.checked = !!permissions[role][key];
        input.disabled = !publicReadPermission;
        input.addEventListener("change", () => {
          permissions[role][key] = input.checked;
        });
        label.append(input, document.createTextNode(CAPABILITY_LABELS[key]?.[isEn ? 1 : 0] || key));
        column.appendChild(label);
      });
      grid.appendChild(column);
    });
    policy.appendChild(grid);
    const savePolicy = el("button", "dashboard-users-primary", tx("Guardar permisos", "Save permissions"));
    savePolicy.type = "button";
    savePolicy.addEventListener("click", () => onSavePolicy?.(permissions, savePolicy));
    policy.appendChild(savePolicy);
    view.appendChild(policy);
    if (!showInlineNavigation) {
      container.appendChild(view);
      return;
    }
  }

  if (createOpen) {
    const form = el("form", "dashboard-users-create");
    const title = el("strong", "", tx("Nuevo usuario local", "New local user"));
    const scope = el("span", "dashboard-users-create-scope", tx(
      `Se añadirá a las ${context.machines.length} máquinas de ${contextLabel}.`,
      `It will be added to all ${context.machines.length} machines in ${contextLabel}.`
    ));
    const name = document.createElement("input");
    name.required = true;
    name.maxLength = 60;
    name.placeholder = tx("Nombre", "Name");
    const pin = document.createElement("input");
    pin.required = true;
    pin.type = "password";
    pin.inputMode = "numeric";
    pin.autocomplete = "new-password";
    pin.placeholder = "PIN";
    const role = document.createElement("select");
    role.className = "dashboard-users-select";
    [["operator", tx("Operario", "Operator")], ["technician", tx("Técnico", "Technician")]]
      .forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        role.appendChild(option);
      });
    const formActions = el("div", "dashboard-users-create-actions");
    const cancel = el("button", "dashboard-users-secondary", tx("Cancelar", "Cancel"));
    cancel.type = "button";
    cancel.addEventListener("click", () => onCloseCreate?.());
    const submit = el("button", "dashboard-users-primary", tx("Crear", "Create"));
    submit.type = "submit";
    formActions.append(cancel, submit);
    form.append(title, scope, name, pin, role, formActions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      onCreate?.({ username: name.value, pin: pin.value, role: role.value }, submit);
    });
    view.appendChild(form);
  }

  if (!users.length) {
    const empty = el("div", "dashboard-users-empty", normalizedQuery
      ? tx("No hay usuarios para esta búsqueda.", "No users match this search.")
      : tx("Todavía no hay usuarios locales. Pulsa + para crear el primero.", "No local users yet. Press + to create the first one."));
    view.appendChild(empty);
    container.appendChild(view);
    return;
  }

  const cards = el("div", "dashboard-users-grid");
  users.forEach((user) => {
    const userContext = contexts.find(
      (item) => item.ownerUid === user.contextOwnerUid
    ) || context;
    const expanded = expandedUsers.includes(user.cardKey);
    const card = el("article", `dashboard-user-card${expanded ? " is-expanded" : ""}`);
    card.dataset.user = user.cardKey;
    const cardHead = el("button", "dashboard-user-card-head");
    cardHead.type = "button";
    cardHead.setAttribute("aria-expanded", expanded ? "true" : "false");
    const avatar = el("span", "dashboard-user-avatar", initials(user.username));
    const identity = el("span", "dashboard-user-identity");
    identity.append(el("strong", "", user.username));
    identity.append(el("span", "", user.role === "technician" ? tx("Técnico", "Technician") : tx("Operario", "Operator")));
    if (showAllContexts) {
      identity.append(el("span", "dashboard-user-context-label", user.contextLabel));
    }
    const metrics = el("span", "dashboard-user-metrics");
    metrics.append(el("strong", "", `${user.assignedMachineIds.length}/${userContext.machines.length}`));
    metrics.append(el("span", "", tx("máquinas", "machines")));
    cardHead.append(avatar, identity, metrics);
    cardHead.addEventListener("click", () => onToggleUser?.(user.cardKey));
    card.appendChild(cardHead);

    if (expanded) {
      const body = el("div", "dashboard-user-card-body");
      const credentials = el("div", "dashboard-user-credentials");
      const roleField = el("label", "dashboard-user-field");
      roleField.append(el("span", "", tx("Rol", "Role")));
      const roleSelect = document.createElement("select");
      roleSelect.className = "dashboard-users-select";
      [["operator", tx("Operario", "Operator")], ["technician", tx("Técnico", "Technician")]]
        .forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          option.selected = value === normalizeAccessRole(user.role);
          roleSelect.appendChild(option);
        });
      roleField.appendChild(roleSelect);
      credentials.appendChild(roleField);

      const pinField = el("label", "dashboard-user-field");
      pinField.append(el("span", "", tx("Nuevo PIN", "New PIN")));
      const pinInput = document.createElement("input");
      pinInput.type = "password";
      pinInput.inputMode = "numeric";
      pinInput.placeholder = "••••";
      pinField.appendChild(pinInput);
      if (userContext.isOwner) credentials.appendChild(pinField);
      body.appendChild(credentials);

      const assignments = el("fieldset", "dashboard-user-assignments");
      assignments.append(el("legend", "", tx("Acceso a máquinas", "Machine access")));
      const checks = new Map();
      userContext.machines.forEach((machine) => {
        const label = el("label", "dashboard-user-machine");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = user.assignedMachineIds.includes(machine.id);
        checks.set(machine.id, input);
        label.append(input, document.createTextNode(getMachineTitle(machine)));
        assignments.appendChild(label);
      });
      body.appendChild(assignments);
      const bodyActions = el("div", "dashboard-user-actions");
      const save = el("button", "dashboard-users-primary", tx("Guardar", "Save"));
      save.type = "button";
      save.addEventListener("click", () => onSaveUser?.({
        ...user,
        role: roleSelect.value,
        pin: pinInput.value,
        assignedMachineIds: Array.from(checks.entries())
          .filter(([, input]) => input.checked)
          .map(([id]) => id)
      }, save));
      bodyActions.appendChild(save);
      const remove = el("button", "dashboard-users-danger", tx("Eliminar usuario", "Delete user"));
      remove.type = "button";
      remove.addEventListener("click", () => onDeleteUser?.(user, remove));
      bodyActions.appendChild(remove);
      body.appendChild(bodyActions);
      card.appendChild(body);
    }
    cards.appendChild(card);
  });
  view.appendChild(cards);
  container.appendChild(view);
};
