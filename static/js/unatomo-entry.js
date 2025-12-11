(function () {
  const PREF_KEY = "cookiePrefs";
  const LANG_KEY = "lang";
  const THEME_KEY = "theme";

  const COPY = {
    es: {
      subtitle: "Your process, Our insight",
      headingLang: "Idioma",
      headingTheme: "Tema",
      headingCookies: "Cookies",
      cookiesIntro: "Todas las cookies opcionales están desactivadas por defecto.",
      analyticsTitle: "Analíticas",
      analyticsText: "Nos ayudan a entender cómo se usa la web.",
      functionalTitle: "Funcionales",
      functionalText: "Recuerdan pequeñas preferencias (por ejemplo, idioma).",
      marketingTitle: "Marketing",
      marketingText: "Contenido y comunicaciones más ajustadas a ti.",
      themeLight: "Claro",
      themeDark: "Oscuro",
      button: "Guardar y acceder"
    },
    en: {
      subtitle: "Choose language and configure cookies",
      headingLang: "Language",
      headingTheme: "Theme",
      headingCookies: "Cookies",
      cookiesIntro: "All optional cookies are disabled by default.",
      analyticsTitle: "Analytics",
      analyticsText: "Help us understand how the site is used.",
      functionalTitle: "Functional",
      functionalText: "Remember small preferences (for example, language).",
      marketingTitle: "Marketing",
      marketingText: "More tailored content and communications.",
      themeLight: "Light",
      themeDark: "Dark",
      button: "Save and continue"
    }
  };

  const paths = {
    es: "/es/index.html",
    en: "/en/index.html"
  };

  const pathname = window.location.pathname || "/";
  const isRoot = pathname === "/" || pathname === "/index.html";

  if (isRoot) {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      const rawPrefs = localStorage.getItem(PREF_KEY);

      if (savedLang && rawPrefs) {
        JSON.parse(rawPrefs);
        const target = paths[savedLang] || paths.es;
        window.location.href = target;
        return;
      }
    } catch (e) {}
  }

  const langInputs = document.querySelectorAll('input[name="lang"]');
  const themeInputs = document.querySelectorAll('input[name="theme"]');
  const cookieInputs = document.querySelectorAll("[data-cookie-key]");
  const enterBtn = document.getElementById("enter-site");

  function applyLanguage(lang) {
    const t = COPY[lang] || COPY.es;
    const get = (id) => document.getElementById(id);

    const subtitle = get("subtitle-main");
    if (subtitle) subtitle.textContent = t.subtitle;

    const headingLang = get("heading-lang");
    if (headingLang) headingLang.textContent = t.headingLang;

    const headingTheme = get("heading-theme");
    if (headingTheme) headingTheme.textContent = t.headingTheme;

    const headingCookies = get("heading-cookies");
    if (headingCookies) headingCookies.textContent = t.headingCookies;

    const cookiesIntro = get("cookies-intro");
    if (cookiesIntro) cookiesIntro.textContent = t.cookiesIntro;

    const aTitle = get("cookie-analytics-title");
    if (aTitle) aTitle.textContent = t.analyticsTitle;
    const aText = get("cookie-analytics-text");
    if (aText) aText.textContent = t.analyticsText;

    const fTitle = get("cookie-functional-title");
    if (fTitle) fTitle.textContent = t.functionalTitle;
    const fText = get("cookie-functional-text");
    if (fText) fText.textContent = t.functionalText;

    const mTitle = get("cookie-marketing-title");
    if (mTitle) mTitle.textContent = t.marketingTitle;
    const mText = get("cookie-marketing-text");
    if (mText) mText.textContent = t.marketingText;

    const themeLight = get("theme-label-light");
    if (themeLight) themeLight.textContent = t.themeLight;

    const themeDark = get("theme-label-dark");
    if (themeDark) themeDark.textContent = t.themeDark;

    if (enterBtn) enterBtn.textContent = t.button;
  }

  let initialLang = "es";
  try {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang === "es" || savedLang === "en") {
      initialLang = savedLang;
    }
  } catch (e) {}

  langInputs.forEach((input) => {
    input.checked = input.value === initialLang;
  });

  applyLanguage(initialLang);

  langInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        const lang = input.value === "en" ? "en" : "es";
        applyLanguage(lang);
      }
    });
  });

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
    } else if (window.matchMedia &&
               window.matchMedia("(prefers-color-scheme: dark)").matches) {
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
        const mode = input.value === "dark" ? "dark" : "light";
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
    let lang = "es";
    langInputs.forEach((input) => {
      if (input.checked) lang = input.value;
    });

    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}

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

    const target = paths[lang] || paths.es;
    window.location.href = target;
  });
})();
