(() => {
  const mount = document.getElementById("ls-topbar-mount");
  if (!mount) return;

  mount.innerHTML = `
    <header class="ls-topbar">
      <div class="ls-topbar-inner">
        <div class="ls-topbar-brand">
          <img src="/static/img/logo-unatomo-v1.6.svg" alt="unatomo" class="ls-topbar-logo" loading="lazy" />
          <span class="ls-topbar-name">Laundry Services</span>
        </div>
        <div class="utility-controls" aria-label="Preferencias">
          <button id="theme-toggle" class="icon-button" type="button" aria-label="Cambiar a modo oscuro">
            <span class="icon" data-icon="sun" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <circle cx="12" cy="12" r="4.5" fill="currentColor"></circle>
                <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"></path>
              </svg>
            </span>
            <span class="icon" data-icon="moon" aria-hidden="true">\u263E</span>
          </button>
          <div class="lang-picker">
            <button id="lang-toggle" class="icon-button" type="button" aria-expanded="false" aria-controls="lang-menu">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 12 2.5zm7.5 9.5a7.45 7.45 0 0 1-1.2 4h-3.1a18.9 18.9 0 0 0 .6-4 18.9 18.9 0 0 0-.6-4h3.1a7.45 7.45 0 0 1 1.2 4zM12 4.6c.9 1.1 1.7 2.7 2.2 4.4H9.8c.5-1.7 1.3-3.3 2.2-4.4zM4.5 12a7.45 7.45 0 0 1 1.2-4h3.1a18.9 18.9 0 0 0-.6 4 18.9 18.9 0 0 0 .6 4H5.7a7.45 7.45 0 0 1-1.2-4zm5.3 0a16.6 16.6 0 0 1 .7-4h3a16.6 16.6 0 0 1 .7 4 16.6 16.6 0 0 1-.7 4h-3a16.6 16.6 0 0 1-.7-4zm2.2 7.4c-.9-1.1-1.7-2.7-2.2-4.4h4.4c-.5 1.7-1.3 3.3-2.2 4.4zM18.3 16h-3.1a18.9 18.9 0 0 0 .6-4 18.9 18.9 0 0 0-.6-4h3.1a7.45 7.45 0 0 1 0 8z" fill="currentColor"></path>
                </svg>
              </span>
              <span class="lang-label">ES</span>
            </button>
            <div id="lang-menu" class="lang-menu" role="menu" hidden>
              <button type="button" class="lang-option" data-lang="en" role="menuitem" data-i18n="lang_option_en">English</button>
              <button type="button" class="lang-option" data-lang="es" role="menuitem" data-i18n="lang_option_es">Espa\u00f1ol</button>
              <button type="button" class="lang-option" data-lang="el" role="menuitem" data-i18n="lang_option_el">\u03b5\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
})();
