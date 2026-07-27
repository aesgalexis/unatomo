import {
  collectAccessUsers,
  USERS_ALL_CONTEXT_ID
} from "./usersModel.js";

const el = (tag, className = "", text = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const createTreeRow = ({label, count = "", selected = false, onSelect}) => {
  const row = el("div", "dashboard-group-tree-row dashboard-users-tree-row");
  const spacer = el("span", "dashboard-group-tree-toggle-spacer");
  const button = el("button", "dashboard-group-tree-node");
  button.type = "button";
  button.setAttribute("aria-selected", selected ? "true" : "false");
  const text = el("span", "dashboard-users-tree-label", label);
  button.appendChild(text);
  if (count !== "") {
    button.appendChild(el("span", "dashboard-users-tree-count", count));
  }
  button.addEventListener("click", onSelect);
  row.append(spacer, button);
  return row;
};

export const renderUsersTree = (container, options = {}) => {
  const {
    contexts = [],
    selectedOwnerUid = "",
    policyOpen = false,
    isEn = false,
    onSelectContext,
    onSelectRoles
  } = options;
  const tx = (es, en) => isEn ? en : es;
  container.replaceChildren();
  container.className = "dashboard-group-tree dashboard-users-tree";
  container.setAttribute("aria-label", tx("Navegación de usuarios", "User navigation"));
  container.scrollTop = 0;

  const header = el("div", "dashboard-group-tree-header");
  header.appendChild(el("div", "dashboard-group-tree-title", tx("Usuarios", "Users")));
  container.appendChild(header);

  const list = el("div", "dashboard-group-tree-list");
  const allUserCount = contexts.reduce(
    (total, context) => total + collectAccessUsers(context.machines).length,
    0
  );
  list.appendChild(createTreeRow({
    label: tx("Todos los usuarios", "All users"),
    count: `${allUserCount}`,
    selected: !policyOpen && selectedOwnerUid === USERS_ALL_CONTEXT_ID,
    onSelect: () => onSelectContext?.(USERS_ALL_CONTEXT_ID)
  }));
  contexts.forEach((context) => {
    const label = context.isOwner
      ? tx("Mis máquinas", "My machines")
      : context.ownerEmail || tx("Máquinas administradas", "Managed machines");
    const userCount = collectAccessUsers(context.machines).length;
    list.appendChild(createTreeRow({
      label,
      count: `${userCount}`,
      selected: !policyOpen && context.ownerUid === selectedOwnerUid,
      onSelect: () => onSelectContext?.(context.ownerUid)
    }));
  });

  const divider = el("div", "dashboard-users-tree-divider");
  list.appendChild(divider);
  list.appendChild(createTreeRow({
    label: tx("Roles", "Roles"),
    selected: policyOpen,
    onSelect: () => onSelectRoles?.()
  }));
  container.appendChild(list);
};
