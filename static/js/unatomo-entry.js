(function () {
  const PREF_KEY = "cookiePrefs";
  const LANG_KEY = "lang";
  const defaultPrefs = {
    analytics: false,
    functional: false,
    marketing: false
  };

  const paths = {
    es: "/es/index.html",
    en: "/en/index.html"
  };

  const pathname = window.location.pathname || "/";
  const isRoot =
    pathname === "/" ||
    pathname === "/index.html";

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
    } catch (e) {
    }
  }

  const langInputs = document.querySelectorAll('input[name="lang"]');
  const cookieInputs = document.querySelectorAll("[data-cookie-key]");
  const enterBtn = document.getElementById("enter-site");

  if (!enterBtn) return;

  try {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) {
      langInputs.forEach((input) => {
        input.checked = input.value === savedLang;
      });
    }
  } catch (e) {}

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

  enterBtn.addEventListener("click", () => {
    let lang = "es";
    langInputs.forEach((input) => {
      if (input.checked) lang = input.value;
    });

    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}

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
