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
          <button class="mc-tab" data-tab="respaldo" type="button">Respaldo</button>
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

const renderHistorial = (panel, machine) => {
  panel.innerHTML = "";
  if (!machine.logs || !machine.logs.length) {
    panel.textContent = "Sin registros.";
    return;
  }
  const list = document.createElement("div");
  list.className = "mc-log-list";
  [...machine.logs]
    .slice()
    .reverse()
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
};

const TAB_RENDER = {
  general: renderGeneral,
  historial: renderHistorial,
  configuracion: (panel) => {
    panel.textContent = "Configuración pendiente de integración.";
  },
  respaldo: (panel) => {
    panel.textContent = "Respaldo pendiente de integración.";
  }
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
    onTitleUpdate: null
  };

  card.addEventListener("click", () => {
    if (hooks.onToggleExpand) hooks.onToggleExpand(card);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    }
  });

  statusBtn.addEventListener("click", () => {
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
      render(panel, machine);
      panel.dataset.panel = key;
      if (hooks.onSelectTab) hooks.onSelectTab(card, key);
    });
  });

  return { card, hooks };
};
