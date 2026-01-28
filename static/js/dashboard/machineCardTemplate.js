import { renderTasksPanel } from "/static/js/tasks/tasksUI.js";

const buildTemplate = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <article class="machine-card" data-expanded="false" draggable="true">
      <header class="mc-header">
        <div class="mc-title"></div>
        <button class="mc-status" type="button"></button>
        <button class="mc-header-toggle" type="button" aria-label="Expandir">
          <span class="mc-chevron" aria-hidden="true">▾</span>
        </button>
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
  operativa: "Operativo",
  fuera_de_servicio: "Fuera de servicio",
  desconectada: "Desconectada"
};

const renderTareas = (panel, machine, hooks, options = {}) => {
  renderTasksPanel(panel, machine, hooks, options, {
    createdBy: options.createdBy || null
  });
};

const renderGeneral = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;

  const row = document.createElement("div");
  row.className = "mc-row mc-row-input mc-row-stack";

  const fields = [
    { key: "brand", label: "Marca", value: machine.brand || "", type: "text" },
    { key: "model", label: "Modelo", value: machine.model || "", type: "text" },
    { key: "year", label: "Año", value: machine.year ?? "", type: "number" }
  ];

  fields.forEach(({ key, label, value, type }) => {
    const wrap = document.createElement("div");
    wrap.className = "mc-field";

    const name = document.createElement("span");
    name.className = "mc-row-label";
    name.textContent = label;

    const input = document.createElement("input");
    input.className = "mc-row-input-field";
    input.type = type;
    if (key === "year") {
      input.inputMode = "numeric";
      input.placeholder = "YYYY";
    }
    input.value = value;
    if (!canEditGeneral) {
      input.readOnly = true;
      input.setAttribute("aria-readonly", "true");
    }
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("blur", () => {
      if (hooks.onUpdateGeneral) {
        hooks.onUpdateGeneral(machine.id, key, input.value, input, error);
      }
    });

    wrap.appendChild(name);
    wrap.appendChild(input);
    row.appendChild(wrap);
  });

  const error = document.createElement("div");
  error.className = "mc-field-error";

  panel.appendChild(row);
  panel.appendChild(error);
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
      const item = document.createElement("div");
      item.className = "mc-log-item";
      const time = new Date(log.ts).toLocaleString("es-ES");
      if (log.type === "task") {
        const title = log.title || "Tarea";
        const user = log.user ? ` - por ${log.user}` : "";
        const prefix = log.overdue ? "Tarea completada fuera de plazo: " : "Tarea completada: ";
        item.textContent = `${time} - ${prefix}${title}${user}`;
      } else if (log.type === "status") {
        const label = statusLabels[log.value] || log.value;
        item.textContent = `${time} - Estado -> ${label}`;
      } else {
        item.textContent = `${time} - ${log.type || "Evento"}`;
      }
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
  tagBtn.textContent = machine.tagId ? "Desconectar" : "Conectar";
  tagBtn.disabled = !tagInput.value.trim() && !machine.tagId;
  tagBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (machine.tagId) {
      if (hooks.onDisconnectTag) hooks.onDisconnectTag(machine.id, tagInput, tagStatus);
      return;
    }
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
  } else if (machine.tagId) {
    tagStatus.textContent = "Tag enlazado";
    tagStatus.dataset.state = "ok";
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

  // No mostramos el administrador actual en el listado.

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
  const headerToggle = card.querySelector(".mc-header-toggle");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.title;
  statusBtn.textContent = statusLabels[machine.status] || "Operativo";
  statusBtn.dataset.status = machine.status || "operativa";
  if (options.canEditStatus === false) {
    statusBtn.disabled = true;
  }

  if (options.mode === "single") {
    const chevron = card.querySelector(".mc-chevron");
    if (chevron) chevron.style.display = "none";
    if (headerToggle) headerToggle.style.display = "none";
  }

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null,
    onStatusToggle: null,
    onTitleUpdate: null,
    onUpdateGeneral: null,
    onConnectTag: null,
    onDisconnectTag: null,
    onCopyTagUrl: null,
    onAddUser: null,
    onUpdateUserRole: null,
    onRemoveUser: null,
    onDownloadLogs: null,
    onRemoveMachine: null,
    onAddTask: null,
    onRemoveTask: null,
    onCompleteTask: null
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

  const renderTab = (key) => {
    const render = TAB_RENDER[key] || TAB_RENDER.general;
    render(panel, machine, hooks, options);
    panel.dataset.panel = key;
  };

  hooks.renderTab = renderTab;

  const firstTab = card.querySelector(".mc-tab");
  if (firstTab) {
    card.querySelectorAll(".mc-tab").forEach((tab) => tab.classList.remove("is-active"));
    firstTab.classList.add("is-active");
    renderTab(firstTab.dataset.tab);
  }

  if (options.mode !== "single" && headerToggle) {
    headerToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    });
  }

  if (options.mode !== "single" && header) {
    header.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea, label")) return;
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
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
      let nextTitle = next || current;
      if (hooks.onTitleUpdate) {
        const ok = hooks.onTitleUpdate(card, nextTitle);
        if (ok === false) {
          nextTitle = current;
        }
      }
      title.textContent = nextTitle;
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

  hooks.setActiveTab = (tabId, { notify = true } = {}) => {
    const tab = card.querySelector(`.mc-tab[data-tab="${tabId}"]`);
    if (!tab) return;
    card.querySelectorAll(".mc-tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderTab(tabId);
    if (notify && hooks.onSelectTab) hooks.onSelectTab(card, tabId);
  };

  card.querySelectorAll(".mc-tab").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = tab.dataset.tab;
      if (card.dataset.expanded !== "true" && hooks.onToggleExpand) {
        hooks.onToggleExpand(card);
      }
      hooks.setActiveTab(key, { notify: true });
    });
  });

  return { card, hooks };
};
