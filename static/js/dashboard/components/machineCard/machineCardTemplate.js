export const buildMachineCardTemplate = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <article class="machine-card" data-expanded="false">
      <header class="mc-header">
        <div class="mc-title"></div>
        <span class="mc-hover-plus" aria-hidden="true">+</span>
        <div class="mc-right">
          <button class="mc-pending" type="button" aria-label="Tareas pendientes"></button>
          <button class="mc-status" type="button"></button>
        </div>
      </header>
      <div class="mc-expand">
        <div class="mc-tabs" role="tablist">
          <button class="mc-tab" data-tab="quehaceres" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="m7.8 6.6-1-1-1.3 1.3 2.3 2.3 3.8-3.8-1.3-1.3zM13 6h6v2h-6zm-5.2 6.1-1-1-1.3 1.3 2.3 2.3 3.8-3.8-1.3-1.3zM13 11.5h6v2h-6zm-5.2 6.1-1-1-1.3 1.3 2.3 2.3 3.8-3.8-1.3-1.3zM13 17h6v2h-6z"/>
            </svg></button>
          <button class="mc-tab" data-tab="historial" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 6a1 1 0 0 1 1 1v4.59l2.3 2.3a1 1 0 0 1-1.4 1.42l-2.6-2.6A1 1 0 0 1 11 12V7a1 1 0 0 1 1-1z"/>
              <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16"/>
            </svg></button>
          <button class="mc-tab" data-tab="general" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2z"/>
              <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16"/>
            </svg></button>
          <button class="mc-tab" data-tab="configuracion" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M13.4 2.5h-2.8l-.5 2.4a7.3 7.3 0 0 0-1.8.7L6.2 4.3 4.3 6.2l1.3 2.1c-.3.6-.6 1.2-.7 1.8l-2.4.5v2.8l2.4.5c.2.6.4 1.2.7 1.8l-1.3 2.1 1.9 1.9 2.1-1.3c.6.3 1.2.6 1.8.7l.5 2.4h2.8l.5-2.4c.6-.2 1.2-.4 1.8-.7l2.1 1.3 1.9-1.9-1.3-2.1c.3-.6.6-1.2.7-1.8l2.4-.5v-2.8l-2.4-.5a7.3 7.3 0 0 0-.7-1.8l1.3-2.1-1.9-1.9-2.1 1.3a7.3 7.3 0 0 0-1.8-.7zM12 15.8a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6z"/>
            </svg></button>
        </div>
        <div class="mc-panel" data-panel="quehaceres"></div>
      </div>
    </article>
  `;
  return wrapper.firstElementChild;
};
