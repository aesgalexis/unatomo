const buildTemplate = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <article class="machine-card" data-expanded="false" draggable="true">
      <header class="mc-header" role="button" tabindex="0">
        <div class="mc-title"></div>
        <button class="mc-status" type="button"></button>
        <span class="mc-chevron" aria-hidden="true">▾</span>
      </header>
      <div class="mc-expand">
        <div class="mc-tabs" role="tablist">
          <button class="mc-tab is-active" data-tab="quehaceres" type="button">Tareas</button>
          <button class="mc-tab" data-tab="general" type="button">General</button>
          <button class="mc-tab" data-tab="historial" type="button">Historial</button>
          <button class="mc-tab" data-tab="configuracion" type="button">Configuración</button>
        </div>
        <div class="mc-panel" data-panel="quehaceres"></div>
      </div>
    </article>
  `;
  return wrapper.firstElementChild;
};

const statusLabels = {
  operativa: "Operativa",
  fuera_de_servicio: "Fuera de servicio",
  desconectada: "Desconectada"
};

const frequencyLabels = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual"
};

const renderTareas = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditTasks = options.canEditTasks !== false;

  const list = document.createElement("div");
  list.className = "task-list";

  const tasks = machine.tasks || [];
  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "task-empty";
    empty.textContent = "Sin tareas.";
    list.appendChild(empty);
  } else {
    tasks.forEach((task) => {
      const item = document.createElement("div");
      item.className = "task-item";

      const text = document.createElement("span");
      text.className = "task-text";
      const freq = frequencyLabels[task.frequency] || task.frequency;
      text.textContent = `${task.title} (${freq})`;
      item.appendChild(text);

      if (canEditTasks) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "task-remove";
        remove.setAttribute("aria-label", "Eliminar tarea");
        remove.textContent = "×";
        remove.addEventListener("click", (event) => {
          event.stopPropagation();
          if (hooks.onRemoveTask) hooks.onRemoveTask(machine.id, task.id);
        });
        item.appendChild(remove);
      }

      list.appendChild(item);
    });
  }

  panel.appendChild(list);

  if (canEditTasks) {
    const sep = document.createElement("hr");
    sep.className = "mc-sep";

    const formRow = document.createElement("div");
    formRow.className = "task-form";

    const titleInput = document.createElement("input");
    titleInput.className = "task-title-input";
    titleInput.type = "text";
    titleInput.placeholder = "Descripción de la tarea";
    titleInput.maxLength = 255;
    titleInput.addEventListener("click", (event) => event.stopPropagation());

    const freqSelect = document.createElement("select");
    freqSelect.className = "task-frequency-select";
    ["diaria", "semanal", "mensual", "trimestral", "semestral", "anual"].forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = frequencyLabels[key];
      freqSelect.appendChild(option);
    });
    freqSelect.addEventListener("click", (event) => event.stopPropagation());

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "task-create-btn";
    createBtn.textContent = "Crear";
    createBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onAddTask) hooks.onAddTask(machine.id, titleInput, freqSelect, createBtn);
    });

    formRow.appendChild(titleInput);
    formRow.appendChild(freqSelect);
    formRow.appendChild(createBtn);

    panel.appendChild(sep);
    panel.appendChild(formRow);
  }
};

const renderGeneral = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;

  const rows = [
    { key: "brand", label: "Marca", value: machine.brand || "" },
    { key: "model", label: "Modelo", value: machine.model || "" },
    { key: "year", label: "Año", value: machine.year ?? "" }
  ];

  rows.forEach(({ key, label, value }) => {
    const row = document.createElement("div");
    row.className = "mc-row mc-row-input";

    const name = document.createElement("span");
    name.className = "mc-row-label";
    name.textContent = label;

    const input = document.createElement("input");
    input.className = "mc-row-input-field";
    input.type = key === "year" ? "number" : "text";
    if (key === "year") {
      input.inputMode = "numeric";
      input.placeholder = "YYYY";
    }
    input.value = value;
    if (!canEditGeneral) input.disabled = true;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("blur", () => {
      if (hooks.onUpdateGeneral) {
        hooks.onUpdateGeneral(machine.id, key, input.value, input, error);
      }
    });

    const error = document.createElement("div");
    error.className = "mc-field-error";

    row.appendChild(name);
    row.appendChild(input);
    row.appendChild(error);
    panel.appendChild(row);
  });
};

const renderHistorial = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const total = machine.logs ? machine.logs.length : 0;
  if (!total) {
    panel.textContent = "Sin registros.";
    return;
  }
  const header = document.createElement("div");
  header.className = "mc-log-header";
  const visibleCount = Math.min(16, total);
  header.textContent = `${visibleCount}/${total}`;
  panel.appendChild(header);

  const sepTop = document.createElement("hr");
  sepTop.className = "mc-sep";
  panel.appendChild(sepTop);

  const list = document.createElement("div");
  list.className = "mc-log-list";
  [...machine.logs]
    .slice()
    .reverse()
    .slice(0, 16)
    .forEach((log) => {
      if (log.type !== "status") return;
      const item = document.createElement("div");
      item.className = "mc-log-item";
      const time = new Date(log.ts).toLocaleString("es-ES");
      const label = statusLabels[log.value] || log.value;
      item.textContent = `${time} · Estado → ${label}`;
      list.appendChild(item);
    });
  panel.appendChild(list);

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  if (options.canDownloadHistory !== false) {
    const download = document.createElement("a");
    download.className = "mc-log-download";
    download.textContent = "Descargar registro completo";
    download.href = "#";
    download.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onDownloadLogs) hooks.onDownloadLogs(machine);
    });
    panel.appendChild(download);
  }
};

const renderConfiguracion = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditConfig = options.canEditConfig !== false;

  const tagRow = document.createElement("div");
  tagRow.className = "mc-config-row";

  const tagLabel = document.createElement("span");
  tagLabel.className = "mc-config-label";
  tagLabel.textContent = "Tag ID";

  const tagInput = document.createElement("input");
  tagInput.className = "mc-tag-input";
  tagInput.type = "text";
  tagInput.placeholder = "Ej: TAG_TEST_001";
  tagInput.value = machine.tagId || "";
  tagInput.addEventListener("click", (event) => event.stopPropagation());

  const tagBtn = document.createElement("button");
  tagBtn.type = "button";
  tagBtn.className = "mc-tag-connect";
  tagBtn.textContent = "Conectar";
  tagBtn.disabled = !tagInput.value.trim();
  tagBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onConnectTag) hooks.onConnectTag(machine.id, tagInput, tagStatus);
  });

  tagInput.addEventListener("input", (event) => {
    event.stopPropagation();
    const hasValue = !!tagInput.value.trim();
    tagBtn.disabled = !hasValue;
    if (!hasValue) {
      tagStatus.textContent = "";
      tagStatus.dataset.state = "";
      accessRow.style.display = "none";
    }
  });

  const tagControls = document.createElement("div");
  tagControls.className = "mc-config-controls";
  tagControls.appendChild(tagInput);
  tagControls.appendChild(tagBtn);

  tagRow.appendChild(tagLabel);
  tagRow.appendChild(tagControls);

  const tagStatus = document.createElement("div");
  tagStatus.className = "mc-tag-status";
  if (options.tagStatus?.text) {
    tagStatus.textContent = options.tagStatus.text;
    tagStatus.dataset.state = options.tagStatus.state || "";
  }

  const accessRow = document.createElement("div");
  accessRow.className = "mc-config-row";
  accessRow.style.display = machine.tagId ? "" : "none";

  const accessLabel = document.createElement("span");
  accessLabel.className = "mc-config-label";
  accessLabel.textContent = "URL de acceso";

  const accessInput = document.createElement("input");
  accessInput.className = "mc-url-input";
  accessInput.type = "text";
  accessInput.readOnly = true;
  accessInput.value = machine.tagId
    ? `${window.location.origin}/es/m.html?tag=${encodeURIComponent(machine.tagId)}`
    : "";
  accessInput.addEventListener("click", (event) => event.stopPropagation());

  const accessCopy = document.createElement("button");
  accessCopy.type = "button";
  accessCopy.className = "mc-url-copy";
  accessCopy.setAttribute("title", "Copiar");
  accessCopy.textContent = "Copiar";
  accessCopy.addEventListener("click", (event) => {
    event.stopPropagation();
    if (hooks.onCopyTagUrl) hooks.onCopyTagUrl(machine.id, accessCopy, accessInput);
  });

  const accessControls = document.createElement("div");
  accessControls.className = "mc-config-controls";
  accessControls.appendChild(accessInput);
  accessControls.appendChild(accessCopy);

  accessRow.appendChild(accessLabel);
  accessRow.appendChild(accessControls);

  if (!canEditConfig || options.disableConfigActions) {
    tagInput.readOnly = true;
    tagBtn.disabled = true;
    accessCopy.disabled = true;
  }

  const sep = document.createElement("hr");
  sep.className = "mc-sep";

  const addRow = document.createElement("div");
  addRow.className = "mc-config-row";

  const addLabel = document.createElement("span");
  addLabel.className = "mc-config-label";
  addLabel.textContent = "Añadir usuario";

  const userInput = document.createElement("input");
  userInput.className = "mc-user-username";
  userInput.type = "text";
  userInput.placeholder = "Usuario";
  userInput.addEventListener("click", (event) => event.stopPropagation());

  const passInput = document.createElement("input");
  passInput.className = "mc-user-password";
  passInput.type = "password";
  passInput.placeholder = "Contraseña";
  passInput.addEventListener("click", (event) => event.stopPropagation());

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "mc-user-add";
  addBtn.textContent = "Añadir usuario";
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

  if (options.adminLabel) {
    const adminRow = document.createElement("div");
    adminRow.className = "mc-user-row mc-user-admin";
    const adminName = document.createElement("span");
    adminName.className = "mc-user-name";
    adminName.textContent = options.adminLabel;
    const adminRole = document.createElement("span");
    adminRole.className = "mc-user-role-label";
    adminRole.textContent = "Administrador";
    adminRow.appendChild(adminName);
    adminRow.appendChild(adminRole);
    list.appendChild(adminRow);
  }

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

  panel.appendChild(tagRow);
  panel.appendChild(tagStatus);
  panel.appendChild(accessRow);
  panel.appendChild(sep);
  panel.appendChild(addRow);
  panel.appendChild(list);

  const sep2 = document.createElement("hr");
  sep2.className = "mc-sep";
  panel.appendChild(sep2);

  const removeLink = document.createElement("a");
  removeLink.className = "mc-remove-machine";
  removeLink.href = "#";
  removeLink.textContent = "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hooks.onRemoveMachine) hooks.onRemoveMachine(machine);
  });
  panel.appendChild(removeLink);
  if (!canEditConfig || options.disableConfigActions) {
    removeLink.style.display = "none";
  }
};

const TAB_RENDER = {
  quehaceres: renderTareas,
  general: renderGeneral,
  historial: renderHistorial,
  configuracion: renderConfiguracion
};

export const createMachineCard = (machine, options = {}) => {
  const card = buildTemplate();
  card.dataset.machineId = machine.id;
  if (options.disableDrag) card.draggable = false;
  if (options.mode === "single") card.dataset.expanded = "true";

  const title = card.querySelector(".mc-title");
  const statusBtn = card.querySelector(".mc-status");
  const header = card.querySelector(".mc-header");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.title;
  statusBtn.textContent = statusLabels[machine.status] || "Operativa";
  statusBtn.dataset.status = machine.status || "operativa";
  if (options.canEditStatus === false) {
    statusBtn.disabled = true;
  }

  if (options.mode === "single") {
    const chevron = card.querySelector(".mc-chevron");
    if (chevron) chevron.style.display = "none";
  }

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null,
    onStatusToggle: null,
    onTitleUpdate: null,
    onUpdateGeneral: null,
    onConnectTag: null,
    onCopyTagUrl: null,
    onAddUser: null,
    onUpdateUserRole: null,
    onRemoveUser: null,
    onDownloadLogs: null,
    onRemoveMachine: null,
    onAddTask: null,
    onRemoveTask: null
  };

  const visibleTabs = Array.isArray(options.visibleTabs) ? options.visibleTabs : null;
  if (visibleTabs) {
    card.querySelectorAll(".mc-tab").forEach((tab) => {
      if (!visibleTabs.includes(tab.dataset.tab)) tab.remove();
    });
  }
  if (options.hideConfig) {
    const configTab = card.querySelector('.mc-tab[data-tab="configuracion"]');
    if (configTab) configTab.remove();
  }

  const firstTab = card.querySelector(".mc-tab");
  if (firstTab) {
    card.querySelectorAll(".mc-tab").forEach((tab) => tab.classList.remove("is-active"));
    firstTab.classList.add("is-active");
    const render = TAB_RENDER[firstTab.dataset.tab] || TAB_RENDER.general;
    render(panel, machine, hooks, options);
    panel.dataset.panel = firstTab.dataset.tab;
  }

  if (options.mode !== "single") {
    header.addEventListener("click", (event) => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    });

    header.addEventListener("keydown", (event) => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (hooks.onToggleExpand) hooks.onToggleExpand(card);
      }
    });
  }

  statusBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (options.canEditStatus === false) return;
    if (hooks.onStatusToggle) hooks.onStatusToggle(card);
  });

  const startTitleEdit = () => {
    const current = title.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.className = "mc-title-input";
    input.value = current;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        input.value = current;
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      const next = input.value.trim();
      title.textContent = next || current;
      if (hooks.onTitleUpdate) {
        hooks.onTitleUpdate(card, next || current);
      }
      title.style.display = "";
      input.remove();
    });
    title.style.display = "none";
    title.parentNode.insertBefore(input, title);
    input.focus();
    input.select();
  };

  if (!options.disableTitleEdit) {
    title.addEventListener("click", (event) => {
      event.stopPropagation();
      startTitleEdit();
    });
  }

  card.querySelectorAll(".mc-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (card.dataset.expanded !== "true" && hooks.onToggleExpand) {
        hooks.onToggleExpand(card);
      }
      card.querySelectorAll(".mc-tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const key = tab.dataset.tab;
      const render = TAB_RENDER[key] || TAB_RENDER.general;
      render(panel, machine, hooks, options);
      panel.dataset.panel = key;
      if (hooks.onSelectTab) hooks.onSelectTab(card, key);
    });
  });

  return { card, hooks };
};
