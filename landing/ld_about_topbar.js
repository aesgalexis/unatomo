(() => {
  const mount = document.getElementById("landing-topbar-mount");
  if (!mount) return;

  const pathname = window.location.pathname.replace(/\/+$/, "");
  const section = pathname.includes("/landing/contacto")
    ? { label: "UNATOMO/Contacto", i18n: "topbar_contact" }
    : pathname.includes("/landing/nosotros")
      ? { label: "UNATOMO/Nosotros", i18n: "topbar_about" }
      : { label: "UNATOMO", i18n: "" };
  const sectionI18n = section.i18n ? ` data-i18n="${section.i18n}"` : "";

  mount.innerHTML = `
    <header class="landing-topbar">
      <div class="landing-topbar-inner">
        <a class="landing-topbar-brand" href="/" aria-label="unatomo">
          <img src="/static/img/logo-unatomo-v1.6.svg" alt="unatomo" class="landing-topbar-logo" loading="lazy" />
          <span class="landing-topbar-name"${sectionI18n}>${section.label}</span>
        </a>
        <div class="utility-controls" aria-label="Preferencias">
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
              <button type="button" class="lang-option" data-lang="it" role="menuitem" data-i18n="lang_option_it">Italiano</button>
              <button type="button" class="lang-option" data-lang="es" role="menuitem" data-i18n="lang_option_es">Espa&ntilde;ol</button>
              <button type="button" class="lang-option" data-lang="el" role="menuitem" data-i18n="lang_option_el">ellinika</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  const topbar = mount.querySelector(".landing-topbar");
  if (!topbar) return;

  let lastY = Math.max(window.scrollY || 0, 0);
  let ticking = false;
  const delta = 6;

  const syncVisibility = () => {
    ticking = false;
    const currentY = Math.max(window.scrollY || 0, 0);

    if (currentY <= 4) {
      topbar.classList.remove("is-hidden");
      lastY = currentY;
      return;
    }

    const diff = currentY - lastY;
    if (Math.abs(diff) < delta) return;

    if (diff > 0) topbar.classList.add("is-hidden");
    else topbar.classList.remove("is-hidden");

    lastY = currentY;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncVisibility);
    },
    { passive: true }
  );
})();
