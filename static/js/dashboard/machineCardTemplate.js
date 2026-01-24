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
          <button class="mc-tab is-active" data-tab="general" type="button">General</button>
          <button class="mc-tab" data-tab="historial" type="button">Historial</button>
          <button class="mc-tab" data-tab="configuracion" type="button">Configuración</button>
        </div>
        <div class="mc-panel" data-panel="general"></div>
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

const renderGeneral = (panel, machine) => {
  panel.innerHTML = "";
  const rows = [
    ["Marca", machine.brand || "—"],
    ["Modelo", machine.model || "—"],
    ["Año", machine.year || "—"]
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "mc-row";
    const name = document.createElement("span");
    name.className = "mc-row-label";
    name.textContent = label;
    const val = document.createElement("span");
    val.className = "mc-row-value";
    val.textContent = value;
    row.appendChild(name);
    row.appendChild(val);
    panel.appendChild(row);
  });
};

const renderHistorial = (panel, machine, hooks) => {
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
};

  const TAB_RENDER = {
    general: renderGeneral,
    historial: renderHistorial,
    configuracion: (panel, machine, hooks) => {
    panel.innerHTML = "";

    const urlRow = document.createElement("div");
    urlRow.className = "mc-config-row";

    const urlLabel = document.createElement("span");
    urlLabel.className = "mc-config-label";
    urlLabel.textContent = "URL";

    const urlInput = document.createElement("input");
    urlInput.className = "mc-url-input";
    urlInput.type = "text";
    urlInput.readOnly = true;
    urlInput.value = machine.url || "";
    urlInput.addEventListener("click", (event) => event.stopPropagation());

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "mc-url-copy";
    copyBtn.setAttribute("title", "Copiar");
    copyBtn.textContent = "⧉";
    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onCopyUrl) hooks.onCopyUrl(machine.id, copyBtn, urlInput);
    });

    const genBtn = document.createElement("button");
    genBtn.type = "button";
    genBtn.className = "mc-url-generate";
    genBtn.textContent = "Generar URL";
    genBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onGenerateUrl) hooks.onGenerateUrl(machine.id);
    });

    const urlControls = document.createElement("div");
    urlControls.className = "mc-config-controls";
    urlControls.appendChild(urlInput);
    urlControls.appendChild(copyBtn);
    urlControls.appendChild(genBtn);

    urlRow.appendChild(urlLabel);
    urlRow.appendChild(urlControls);

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

    const addControls = document.createElement("div");
    addControls.className = "mc-config-controls";
    addControls.appendChild(userInput);
    addControls.appendChild(passInput);
    addControls.appendChild(addBtn);

    addRow.appendChild(addLabel);
    addRow.appendChild(addControls);

    const list = document.createElement("div");
    list.className = "mc-user-list";

    (machine.users || []).forEach((user) => {
      const row = document.createElement("div");
      row.className = "mc-user-row";

      const name = document.createElement("span");
      name.className = "mc-user-name";
      name.textContent = user.username;

      const role = document.createElement("select");
      role.className = "mc-user-role";
      ["administrador", "usuario", "externo"].forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
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

      const remove = document.createElement("a");
      remove.className = "mc-user-remove";
      remove.textContent = "Eliminar";
      remove.href = "#";
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (hooks.onRemoveUser) hooks.onRemoveUser(machine.id, user.id);
      });

      row.appendChild(name);
      row.appendChild(role);
      row.appendChild(remove);
      list.appendChild(row);
    });

    panel.appendChild(urlRow);
    panel.appendChild(sep);
    panel.appendChild(addRow);
    panel.appendChild(list);
  },
};

export const createMachineCard = (machine) => {
  const card = buildTemplate();
  card.dataset.machineId = machine.id;
  const title = card.querySelector(".mc-title");
  const statusBtn = card.querySelector(".mc-status");
  const header = card.querySelector(".mc-header");
  const tabs = card.querySelectorAll(".mc-tab");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.title;
  statusBtn.textContent = statusLabels[machine.status] || "Operativa";
  statusBtn.dataset.status = machine.status || "operativa";

  renderGeneral(panel, machine);

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null,
    onStatusToggle: null,
    onTitleUpdate: null,
    onGenerateUrl: null,
    onCopyUrl: null,
    onAddUser: null,
    onUpdateUserRole: null,
    onRemoveUser: null,
    onDownloadLogs: null,
    onRemoveMachine: null
  };

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

  statusBtn.addEventListener("click", (event) => {
    event.stopPropagation();
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

  title.addEventListener("click", (event) => {
    event.stopPropagation();
    startTitleEdit();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const key = tab.dataset.tab;
      const render = TAB_RENDER[key] || TAB_RENDER.general;
      render(panel, machine, hooks);
      panel.dataset.panel = key;
      if (hooks.onSelectTab) hooks.onSelectTab(card, key);
    });
  });

  const removeLink = document.createElement("a");
  removeLink.className = "mc-remove-machine";
  removeLink.href = "#";
  removeLink.textContent = "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hooks.onRemoveMachine) hooks.onRemoveMachine(machine);
  });

  const expand = card.querySelector(".mc-expand");
  expand.appendChild(removeLink);

  return { card, hooks };
};
