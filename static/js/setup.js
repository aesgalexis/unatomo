(function () {
  const PREF_KEY = "cookiePrefs";
  const THEME_KEY = "theme";

  const themeInputs = document.querySelectorAll('input[name="theme"]');
  const cookieInputs = document.querySelectorAll("[data-cookie-key]");
  const enterBtn = document.getElementById("enter-site");

  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      cookieInputs.forEach((input) => {
        const key = input.dataset.cookieKey;
        if (key in prefs) {
          input.checked = Boolean(prefs[key]);
        }
      });
    }
  } catch (e) {}

  function initThemeControls() {
    if (!themeInputs.length) return;

    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {}

    let initialTheme = null;
    if (savedTheme === "light" || savedTheme === "dark") {
      initialTheme = savedTheme;
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      initialTheme = "dark";
    } else {
      initialTheme = "light";
    }

    themeInputs.forEach((input) => {
      input.checked = input.value === initialTheme;
    });

    themeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        const mode = input.value === "dark"  "dark" : "light";
        document.documentElement.setAttribute("data-theme", mode);
        try {
          localStorage.setItem(THEME_KEY, mode);
        } catch (e) {}

        const btn = document.getElementById("theme-toggle");
        if (btn) {
          if (mode === "dark") {
            btn.textContent = "☼";
            btn.setAttribute("aria-label", "Cambiar a modo claro");
          } else {
            btn.textContent = "☾";
            btn.setAttribute("aria-label", "Cambiar a modo oscuro");
          }
        }
      });
    });
  }

  initThemeControls();

  if (!enterBtn) return;

  enterBtn.addEventListener("click", () => {
    const defaultPrefs = {
      analytics: false,
      functional: false,
      marketing: false
    };
    const prefs = { ...defaultPrefs };
    cookieInputs.forEach((input) => {
      const key = input.dataset.cookieKey;
      prefs[key] = input.checked;
    });

    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {}

    window.location.href = "/es/contacto.html";
  });
})();
