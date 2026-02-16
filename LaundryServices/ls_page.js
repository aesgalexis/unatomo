(() => {
  const toggle = document.getElementById("lang-toggle");
  const menu = document.getElementById("lang-menu");
  const label = document.querySelector(".lang-label");
  const i18n = window.unatomoI18n;

  if (!toggle || !menu || !label) return;

  const sortLanguageOptions = () => {
    const options = Array.from(menu.querySelectorAll(".lang-option"));
    options
      .sort((a, b) =>
        a.textContent.localeCompare(b.textContent, undefined, {
          sensitivity: "base",
        })
      )
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
    const lang = option.dataset.lang;
    if (i18n && typeof i18n.setLanguage === "function") {
      i18n.setLanguage(lang);
    } else {
      label.textContent = lang.toUpperCase();
      document.documentElement.lang = lang;
    }
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

  sortLanguageOptions();
  document.addEventListener("app:language-change", sortLanguageOptions);

})();
