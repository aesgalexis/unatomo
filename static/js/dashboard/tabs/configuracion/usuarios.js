export const render = (container, machine, hooks, options = {}) => {
  const canEditConfig = options.canEditConfig !== false;

  const sep = document.createElement("hr");
  sep.className = "mc-sep";

  const addRow = document.createElement("div");
  addRow.className = "mc-config-row";

  const addLabel = document.createElement("span");
  addLabel.className = "mc-config-label";
  addLabel.textContent = "A?adir usuario";

  const userInput = document.createElement("input");
  userInput.className = "mc-user-username";
  userInput.type = "text";
  userInput.placeholder = "Usuario";
  userInput.addEventListener("click", (event) => event.stopPropagation());

  const passInput = document.createElement("input");
  passInput.className = "mc-user-password";
  passInput.type = "password";
  passInput.placeholder = "Contrase?a";
  passInput.addEventListener("click", (event) => event.stopPropagation());

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "mc-user-add";
  addBtn.textContent = "A?adir usuario";
  addBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onAddUser) hooks.onAddUser(machine.id, userInput, passInput, addBtn);
  });

  if (!canEditConfig || options.disableConfigActions) {
    userInput.disabled = true;
    passInput.disabled = true;
    addBtn.disabled = true;
  }

  const addControls = document.createElement("div");
  addControls.className = "mc-config-controls";
  addControls.appendChild(userInput);
  addControls.appendChild(passInput);
  addControls.appendChild(addBtn);

  addRow.appendChild(addLabel);
  addRow.appendChild(addControls);

  const list = document.createElement("div");
  list.className = "mc-user-list";

  const roles = options.userRoles || ["usuario", "tecnico", "externo"];
  const labels = { usuario: "Usuario", tecnico: "T?cnico", externo: "Externo" };

  (machine.users || []).forEach((user) => {
    const row = document.createElement("div");
    row.className = "mc-user-row";

    const name = document.createElement("span");
    name.className = "mc-user-name";
    name.textContent = user.username;

    const role = document.createElement("select");
    role.className = "mc-user-role";
    roles.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = labels[opt] || opt;
      if (user.role === opt) option.selected = true;
      role.appendChild(option);
    });
    role.addEventListener("click", (event) => event.stopPropagation());
    role.addEventListener("change", (event) => {
      event.stopPropagation();
      if (hooks.onUpdateUserRole) {
        hooks.onUpdateUserRole(machine.id, user.id, role.value);
      }
    });
    if (!canEditConfig || options.disableConfigActions) {
      role.disabled = true;
    }

    const remove = document.createElement("a");
    remove.className = "mc-user-remove";
    remove.textContent = "Eliminar";
    remove.href = "#";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onRemoveUser) hooks.onRemoveUser(machine.id, user.id);
    });
    if (!canEditConfig || options.disableConfigActions) {
      remove.setAttribute("aria-disabled", "true");
      remove.style.pointerEvents = "none";
      remove.style.opacity = "0.6";
    }

    row.appendChild(name);
    row.appendChild(role);
    row.appendChild(remove);
    list.appendChild(row);
  });

  const sep2 = document.createElement("hr");
  sep2.className = "mc-sep";

  const removeLink = document.createElement("a");
  removeLink.className = "mc-remove-machine";
  removeLink.href = "#";
  removeLink.textContent = "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hooks.onRemoveMachine) hooks.onRemoveMachine(machine);
  });
  if (!canEditConfig || options.disableConfigActions) {
    removeLink.style.display = "none";
  }

  container.appendChild(sep);
  container.appendChild(addRow);
  container.appendChild(list);
  container.appendChild(sep2);
  container.appendChild(removeLink);
};
