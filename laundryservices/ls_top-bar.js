(() => {
  const mount = document.getElementById("ls-topbar-mount");
  if (!mount) return;

  const normalizedPath = window.location.pathname.replace(/\/+$/, "");
  const isLaundryHome =
    normalizedPath === "/laundryservices" ||
    normalizedPath === "/laundryservices/index.html";
  const brandHref = isLaundryHome ? "https://unatomo.com/" : "/laundryservices/";

  mount.innerHTML = `
    <header class="ls-topbar">
      <div class="ls-topbar-inner">
        <a class="ls-topbar-brand" href="${brandHref}">
          <img src="/static/img/logo-unatomo-round-v1.0.svg" alt="unatomo" class="ls-topbar-logo" loading="lazy" />
          <span class="ls-topbar-name">
            <span class="ls-topbar-parent-name">unatomo</span><span class="ls-topbar-divider" aria-hidden="true">/</span><span>Laundry Services</span>
          </span>
        </a>
        <div class="utility-controls" aria-label="Preferencias">
          <div class="lang-picker">
            <button id="lang-toggle" class="icon-button" type="button" aria-expanded="false" aria-controls="lang-menu">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path></svg>
              </span>
              <span class="lang-label">ES</span>
            </button>
            <div id="lang-menu" class="lang-menu" role="menu" hidden>
              <button type="button" class="lang-option" data-lang="en" role="menuitemradio"><span data-i18n="lang_option_en">English</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
              <button type="button" class="lang-option" data-lang="it" role="menuitemradio"><span data-i18n="lang_option_it">Italiano</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
              <button type="button" class="lang-option" data-lang="es" role="menuitemradio"><span data-i18n="lang_option_es">Espa\u00f1ol</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
              <button type="button" class="lang-option" data-lang="el" role="menuitemradio"><span data-i18n="lang_option_el">\u03b5\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  const topbar = mount.querySelector(".ls-topbar");
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

    if (diff > 0) {
      topbar.classList.add("is-hidden");
    } else {
      topbar.classList.remove("is-hidden");
    }

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
