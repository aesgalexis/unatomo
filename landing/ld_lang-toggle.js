(() => {
  const mount = document.getElementById("landing-lang-toggle-mount");
  const i18n = window.unatomoI18n;
  if (!mount || !i18n) return;

  mount.innerHTML = `
    <div class="landing-lang-picker">
      <button id="landing-lang-toggle" class="landing-lang-button" type="button" aria-expanded="false" aria-controls="landing-lang-menu">
        <span class="landing-lang-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path></svg>
        </span>
        <span class="landing-lang-label">ES</span>
      </button>
      <div id="landing-lang-menu" class="landing-lang-menu" role="menu" hidden>
        <button type="button" class="landing-lang-option" data-lang="en" role="menuitemradio"><span data-i18n="lang_option_en">English</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
        <button type="button" class="landing-lang-option" data-lang="it" role="menuitemradio"><span data-i18n="lang_option_it">Italiano</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
        <button type="button" class="landing-lang-option" data-lang="es" role="menuitemradio"><span data-i18n="lang_option_es">Español</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
        <button type="button" class="landing-lang-option" data-lang="el" role="menuitemradio"><span data-i18n="lang_option_el">ellinika</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
      </div>
    </div>
  `;

  const toggle = document.getElementById("landing-lang-toggle");
  const menu = document.getElementById("landing-lang-menu");
  const label = mount.querySelector(".landing-lang-label");
  if (!toggle || !menu || !label) return;

  const syncLabel = (lang) => {
    label.textContent = ({ es: "ES", en: "EN", it: "IT", el: "EL" })[lang] || "ES";
    menu.querySelectorAll(".landing-lang-option").forEach((option) => {
      option.setAttribute("aria-checked", option.dataset.lang === lang ? "true" : "false");
    });
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
