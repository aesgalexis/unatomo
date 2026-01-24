const buildTemplate = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <article class="machine-card" data-expanded="false">
      <header class="mc-header" role="button" tabindex="0">
        <div class="mc-title"></div>
        <span class="mc-badge"></span>
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

const TAB_CONTENT = {
  general: "Información general de la máquina.",
  historial: "Historial pendiente de integración.",
  configuracion: "Configuración pendiente de integración.",
  respaldo: "Respaldo pendiente de integración."
};

export const createMachineCard = (machine) => {
  const card = buildTemplate();
  const title = card.querySelector(".mc-title");
  const badge = card.querySelector(".mc-badge");
  const header = card.querySelector(".mc-header");
  const tabs = card.querySelectorAll(".mc-tab");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.nombre;
  badge.textContent = machine.estado || "OK";

  panel.textContent = TAB_CONTENT.general;

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null
  };

  header.addEventListener("click", () => {
    if (hooks.onToggleExpand) hooks.onToggleExpand(card);
  });

  header.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    }
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const key = tab.dataset.tab;
      panel.textContent = TAB_CONTENT[key] || "";
      panel.dataset.panel = key;
      if (hooks.onSelectTab) hooks.onSelectTab(card, key);
    });
  });

  return { card, hooks };
};
