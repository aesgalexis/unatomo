(() => {
  const mount = document.getElementById("landing-topbar-mount");
  if (!mount) return;

  const pathname = window.location.pathname.replace(/\/+$/, "");
  const section = pathname.includes("/landing/contacto")
    ? {
        label: "UNATOMO/Contacto",
        i18n: "topbar_contact",
        mobileLabel: "/Contacto",
        mobileI18n: "topbar_contact_mobile"
      }
    : pathname.includes("/landing/nosotros")
      ? {
          label: "UNATOMO/Nosotros",
          i18n: "topbar_about",
          mobileLabel: "/Nosotros",
          mobileI18n: "topbar_about_mobile"
        }
      : { label: "UNATOMO", i18n: "", mobileLabel: "", mobileI18n: "" };
  const sectionI18n = section.i18n ? ` data-i18n="${section.i18n}"` : "";
  const mobileSectionI18n = section.mobileI18n
    ? ` data-i18n="${section.mobileI18n}"`
    : "";
  const mobileSectionName = section.mobileLabel
    ? `<span class="landing-topbar-mobile-name"${mobileSectionI18n}>${section.mobileLabel}</span>`
    : "";

  mount.innerHTML = `
    <header class="landing-topbar">
      <div class="landing-topbar-inner">
        <a class="landing-topbar-brand" href="/" aria-label="unatomo">
          <img src="/static/img/logo-unatomo-v1.6.svg" alt="unatomo" class="landing-topbar-logo" loading="lazy" />
          <span class="landing-topbar-name"${sectionI18n}>${section.label}</span>
          ${mobileSectionName}
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
              <button type="button" class="lang-option" data-lang="es" role="menuitemradio"><span data-i18n="lang_option_es">Espa&ntilde;ol</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
              <button type="button" class="lang-option" data-lang="el" role="menuitemradio"><span data-i18n="lang_option_el">ellinika</span><span class="lang-option-check" aria-hidden="true">&#10003;</span></button>
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
