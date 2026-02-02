export const buildMachineCardTemplate = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <article class="machine-card" data-expanded="false">
      <header class="mc-header">
        <div class="mc-title"></div>
        <div class="mc-right">
          <button class="mc-pending" type="button" aria-label="Tareas pendientes"></button>
          <button class="mc-status" type="button"></button>
        </div>
        <button class="mc-header-toggle" type="button" aria-label="Expandir">
          <span class="mc-chevron" aria-hidden="true"></span>
        </button>
      </header>
      <div class="mc-expand">
        <div class="mc-tabs" role="tablist">
          <button class="mc-tab" data-tab="quehaceres" type="button">Tareas</button>
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
