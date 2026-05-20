(() => {
  const mount = document.getElementById("landing-lang-toggle-mount");
  const i18n = window.unatomoI18n;
  if (!mount || !i18n) return;

  mount.innerHTML = `
    <div class="landing-lang-picker">
      <button id="landing-lang-toggle" class="landing-lang-button" type="button" aria-expanded="false" aria-controls="landing-lang-menu">
        <span class="landing-lang-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 12 2.5zm7.5 9.5a7.45 7.45 0 0 1-1.2 4h-3.1a18.9 18.9 0 0 0 .6-4 18.9 18.9 0 0 0-.6-4h3.1a7.45 7.45 0 0 1 1.2 4zM12 4.6c.9 1.1 1.7 2.7 2.2 4.4H9.8c.5-1.7 1.3-3.3 2.2-4.4zM4.5 12a7.45 7.45 0 0 1 1.2-4h3.1a18.9 18.9 0 0 0-.6 4 18.9 18.9 0 0 0 .6 4H5.7a7.45 7.45 0 0 1-1.2-4zm5.3 0a16.6 16.6 0 0 1 .7-4h3a16.6 16.6 0 0 1 .7 4 16.6 16.6 0 0 1-.7 4h-3a16.6 16.6 0 0 1-.7-4zm2.2 7.4c-.9-1.1-1.7-2.7-2.2-4.4h4.4c-.5 1.7-1.3 3.3-2.2 4.4zM18.3 16h-3.1a18.9 18.9 0 0 0 .6-4 18.9 18.9 0 0 0-.6-4h3.1a7.45 7.45 0 0 1 0 8z" fill="currentColor"></path>
          </svg>
        </span>
        <span class="landing-lang-label">ES</span>
      </button>
      <div id="landing-lang-menu" class="landing-lang-menu" role="menu" hidden>
        <button type="button" class="landing-lang-option" data-lang="en" role="menuitem" data-i18n="lang_option_en">English</button>
        <button type="button" class="landing-lang-option" data-lang="it" role="menuitem" data-i18n="lang_option_it">Italiano</button>
        <button type="button" class="landing-lang-option" data-lang="es" role="menuitem" data-i18n="lang_option_es">Español</button>
        <button type="button" class="landing-lang-option" data-lang="el" role="menuitem" data-i18n="lang_option_el">ellinika</button>
      </div>
    </div>
  `;

  const toggle = document.getElementById("landing-lang-toggle");
  const menu = document.getElementById("landing-lang-menu");
  const label = mount.querySelector(".landing-lang-label");
  if (!toggle || !menu || !label) return;

  const syncLabel = (lang) => {
    label.textContent = ({ es: "ES", en: "EN", it: "IT", el: "EL" })[lang] || "ES";
  };

  const sortLanguageOptions = () => {
    Array.from(menu.querySelectorAll(".landing-lang-option"))
      .sort((a, b) => a.textContent.localeCompare(b.textContent, undefined, { sensitivity: "base" }))
      .forEach((option) => menu.appendChild(option));
  };

  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-lang]");
    if (!option) return;
    i18n.setLanguage(option.dataset.lang);
    closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (menu.hidden) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  syncLabel(i18n.getLanguage());
  sortLanguageOptions();

  document.addEventListener("app:language-change", (event) => {
    syncLabel(event?.detail?.lang || "es");
    sortLanguageOptions();
  });
})();
