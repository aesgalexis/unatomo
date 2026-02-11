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
      </header>
      <div class="mc-expand">
        <div class="mc-tabs" role="tablist">
          <button class="mc-tab" data-tab="quehaceres" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M9 11.4 7.6 10l-1.4 1.4L9 14.2l6.8-6.8-1.4-1.4zM4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2 0h12v14H6z"/>
            </svg></button>
          <button class="mc-tab" data-tab="general" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2z"/>
              <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16"/>
            </svg></button>
          <button class="mc-tab" data-tab="historial" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 6a1 1 0 0 1 1 1v4.59l2.3 2.3a1 1 0 0 1-1.4 1.42l-2.6-2.6A1 1 0 0 1 11 12V7a1 1 0 0 1 1-1z"/>
              <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16"/>
            </svg></button>
          <button class="mc-tab" data-tab="configuracion" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M4 6h10v2H4zm0 10h10v2H4zm14-8h2v2h-2zm0 10h2v2h-2zM10 10h10v2H10z"/>
            </svg></button>
        </div>
        <div class="mc-panel" data-panel="quehaceres"></div>
      </div>
    </article>
  `;
  return wrapper.firstElementChild;
};
