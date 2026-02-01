export const render = (container, machine, hooks, options = {}) => {
  const canEditConfig = options.canEditConfig !== false;

  const sep = document.createElement("hr");
  sep.className = "mc-sep";

  const addRow = document.createElement("div");
  addRow.className = "mc-config-row";
  addRow.classList.add("mc-config-row-users");

  const addLabel = document.createElement("span");
  addLabel.className = "mc-config-label";
  addLabel.textContent = "Usuarios";

  const statusEl = document.createElement("div");
  statusEl.className = "mc-user-status";

  const knownUsers = Array.isArray(options.knownUsers) ? options.knownUsers : [];
  const currentUsers = new Set((machine.users || []).map((u) => (u.username || "").trim()));
  const availableUsers = knownUsers.filter((name) => name && !currentUsers.has(name));

  const userSelect = document.createElement("select");
  userSelect.className = "mc-user-username";
  userSelect.style.width = "100%";
  userSelect.addEventListener("click", (event) => event.stopPropagation());

  const addUserOption = (value, label) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
  };

  if (availableUsers.length) {
    userSelect.appendChild(addUserOption("", "Seleccionar"));
    availableUsers.forEach((name) => userSelect.appendChild(addUserOption(name, name)));
    userSelect.appendChild(addUserOption("__add__", "+ Añadir nuevo..."));
  }

  const addNewBtn = document.createElement("button");
  addNewBtn.type = "button";
  addNewBtn.className = "mc-user-add-new";
  addNewBtn.textContent = "+ Añadir nuevo...";
  addNewBtn.style.width = "100%";
  addNewBtn.style.maxWidth = "150px";
  addNewBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    showUserInput();
    addNewBtn.style.display = "none";
  });


  const userInput = document.createElement("input");
  userInput.className = "mc-user-username";
  userInput.type = "text";
  userInput.placeholder = "Nombre";
  userInput.maxLength = 16;
  userInput.style.display = "none";
  userInput.style.width = "100%";
  userInput.addEventListener("click", (event) => event.stopPropagation());
  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addBtn.click();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelBtn.click();
    }
  });

  const passInput = document.createElement("input");
  passInput.className = "mc-user-password";
  passInput.type = "password";
  passInput.placeholder = "PIN";
  passInput.autocomplete = "new-password";
  passInput.name = "new-password";
  passInput.setAttribute("data-lpignore", "true");
  passInput.setAttribute("data-1p-ignore", "true");
  passInput.maxLength = 8;
  passInput.style.display = "none";
  passInput.style.width = "150px";
  passInput.style.maxWidth = "150px";
  passInput.addEventListener("click", (event) => event.stopPropagation());
  passInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addBtn.click();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelBtn.click();
    }
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "mc-location-accept";
  addBtn.textContent = "Aceptar";
  addBtn.style.display = "none";
  addBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isNew = userSelect.style.display === "none";
    const pendingName = isNew ? (userInput.value || "").trim() : "";
    if (hooks.onAddUser) hooks.onAddUser(machine.id, userInput, passInput, addBtn, statusEl);
    if (pendingName) {
      const exists = Array.from(userSelect.options).some((opt) => opt.value === pendingName);
      if (!exists) {
        userSelect.insertBefore(addUserOption(pendingName, pendingName), userSelect.options[1] || null);
      }
      userSelect.value = "";
      hideUserInput();
    }
    if (!availableUsers.length) {
      addNewBtn.style.display = "";
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "mc-location-cancel";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.style.display = "none";
  cancelBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    userInput.value = "";
    passInput.value = "";
    userSelect.value = "";
    hideUserInput();
  });

  const showUserInput = () => {
    userSelect.style.display = "none";
      userInput.style.display = "";
    userInput.value = "";
    userInput.focus();
    passInput.style.display = "";
    addBtn.style.display = "";
    cancelBtn.style.display = "";
  };

  const hideUserInput = () => {
    if (availableUsers.length) {
      userSelect.style.display = "";
      addNewBtn.style.display = "none";
    } else {
      userSelect.style.display = "none";
      addNewBtn.style.display = "";
    }
    userInput.style.display = "none";
    passInput.style.display = "none";
    addBtn.style.display = "none";
    cancelBtn.style.display = "none";
  };

  hideUserInput();

  userSelect.addEventListener("change", () => {
    if (userSelect.value === "__add__") {
      showUserInput();
      passInput.disabled = false;
      passInput.value = "";
      return;
    }
    hideUserInput();
    userInput.value = userSelect.value || "";
    passInput.disabled = true;
    passInput.value = "";
    if (userSelect.value && hooks.onAddUser) {
      hooks.onAddUser(machine.id, userInput, passInput, addBtn, statusEl);
      userSelect.value = "";
      userInput.value = "";
    }
  });


  if (!canEditConfig || options.disableConfigActions) {
    userSelect.disabled = true;
    userInput.disabled = true;
    passInput.disabled = true;
    addBtn.disabled = true;
    cancelBtn.disabled = true;
  }

  const addControls = document.createElement("div");
  addControls.className = "mc-config-controls";
  const userLine = document.createElement("div");
  userLine.className = "mc-user-add-line";
  userLine.appendChild(userSelect);
  userLine.appendChild(addNewBtn);
  userLine.appendChild(userInput);
  userLine.appendChild(passInput);
  userLine.appendChild(addBtn);
  userLine.appendChild(cancelBtn);

  addControls.appendChild(userLine);

  addRow.appendChild(addLabel);
  addRow.appendChild(addControls);

  const list = document.createElement("div");
  list.className = "mc-user-list";

  const roles = options.userRoles || ["usuario", "tecnico", "externo"];
  const labels = { usuario: "Usuario", tecnico: "Técnico", externo: "Externo" };

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

    const pinWrap = document.createElement("div");
    pinWrap.className = "mc-user-pin-wrap";

    const pinToggle = document.createElement("button");
    pinToggle.type = "button";
    pinToggle.className = "mc-user-pin-toggle";
    pinToggle.setAttribute("aria-label", "Cambiar PIN");
    pinToggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 1 1 8 0v3"></path></svg>`;
    pinToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      pinToggle.style.display = "none";
      pinInput.style.display = "";
      pinInput.focus();
      list.querySelectorAll(".mc-user-pin-toggle").forEach((toggleEl) => {
        if (toggleEl !== pinToggle) toggleEl.disabled = true;
      });
    });

    const pinInput = document.createElement("input");
    pinInput.type = "password";
    pinInput.className = "mc-user-pin";
    pinInput.placeholder = "Cambiar PIN";
    pinInput.autocomplete = "new-password";
    pinInput.name = "new-password";
    pinInput.setAttribute("data-lpignore", "true");
    pinInput.setAttribute("data-1p-ignore", "true");
    pinInput.maxLength = 8;
    pinInput.addEventListener("click", (event) => event.stopPropagation());
    pinInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        pinOk.click();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        pinCancel.click();
      }
    });
    pinInput.addEventListener("focus", () => {
      pinInput.classList.add("is-active");
      pinToggle.style.display = "none";
      list.querySelectorAll(".mc-user-row").forEach((rowEl) => {
        if (rowEl !== row) {
          const inputEl = rowEl.querySelector(".mc-user-pin");
          if (inputEl) inputEl.disabled = true;
          const actionsEl = rowEl.querySelector(".mc-user-pin-actions");
          if (actionsEl) actionsEl.style.display = "none";
          const toggleEl = rowEl.querySelector(".mc-user-pin-toggle");
          if (toggleEl) {
            toggleEl.style.display = "";
            toggleEl.disabled = true;
          }
        }
      });
      pinActions.style.display = "inline-flex";
      if (hooks.onContentResize) hooks.onContentResize();
    });
    if (!canEditConfig || options.disableConfigActions) {
      pinInput.disabled = true;
    }

    const pinActions = document.createElement("div");
    pinActions.className = "mc-user-pin-actions";
    pinActions.style.display = "none";

    const pinOk = document.createElement("button");
    pinOk.type = "button";
    pinOk.className = "mc-location-accept";
    pinOk.textContent = "Aceptar";
    pinOk.addEventListener("click", (event) => {
      event.stopPropagation();
      const next = pinInput.value.trim();
      if (!next) return;
      if (hooks.onUpdateUserPassword) {
        hooks.onUpdateUserPassword(machine.id, user.id, next, pinInput);
      }
      pinInput.value = "";
      pinInput.placeholder = "Cambiar PIN";
      pinInput.classList.remove("is-active");
      pinActions.style.display = "none";
      pinInput.style.display = "none";
      pinToggle.style.display = "";
      pinToggle.disabled = false;
      list.querySelectorAll(".mc-user-pin-toggle").forEach((toggleEl) => {
        toggleEl.disabled = false;
      });
      list.querySelectorAll(".mc-user-pin").forEach((inputEl) => {
        inputEl.disabled = false;
      });
      if (hooks.onContentResize) hooks.onContentResize();
    });

    const pinCancel = document.createElement("button");
    pinCancel.type = "button";
    pinCancel.className = "mc-location-cancel";
    pinCancel.textContent = "Cancelar";
    pinCancel.addEventListener("click", (event) => {
      event.stopPropagation();
      pinInput.value = "";
      pinInput.placeholder = "Cambiar PIN";
      pinInput.classList.remove("is-active");
      pinActions.style.display = "none";
      pinInput.style.display = "none";
      pinToggle.style.display = "";
      pinToggle.disabled = false;
      list.querySelectorAll(".mc-user-pin-toggle").forEach((toggleEl) => {
        toggleEl.disabled = false;
      });
      list.querySelectorAll(".mc-user-pin").forEach((inputEl) => {
        inputEl.disabled = false;
      });
      if (hooks.onContentResize) hooks.onContentResize();
    });

    pinActions.appendChild(pinOk);
    pinActions.appendChild(pinCancel);
    pinInput.style.display = "none";
    pinWrap.appendChild(pinToggle);
    pinWrap.appendChild(pinInput);

    const remove = document.createElement("a");
    remove.className = "mc-user-remove";
    remove.textContent = "quitar";
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
    row.appendChild(pinWrap);
    row.appendChild(remove);
    row.appendChild(pinActions);
    list.appendChild(row);
  });

  container.appendChild(sep);
  container.appendChild(addRow);
  container.appendChild(statusEl);
  container.appendChild(list);
};
