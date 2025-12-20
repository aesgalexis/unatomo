(function () {
  const PREF_KEY = "cookiePrefs";
  const LANG_KEY = "lang";
  const THEME_KEY = "theme";

  const COPY = {
    es: {
      subtitle: "Tu proceso, Nuestra visión",
      introTitle: "Unatomo Core:",
      intro1: "Nos dedicamos a la gestión de maquinaria y procesos de lavado de prendas textiles.",
      intro2:
        "Ofrecemos variedad de servicios enfocados principalmente a lavanderías industriales, hoteleras y tintorerías, desde la venta de maquinaria, instalación, mantenimiento, formación a personal operativo y técnico hasta estudios y auditorías a medida enfocadas en ayudar a quienes ya saben lo que hacen, a poder hacerlo un poco mejor.",
      intro3:
        "Tenemos una larga trayectoria y casos de éxito consolidados en lavanderías industriales de gran tamaño, líderes del sector en España.",
      intro4: "Configura tus preferencias y accede al sitio para conocer más.",
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
      button: "Continuar como invitado"
    },
    en: {
      subtitle: "Your process, Our insight",
      introTitle: "Unatomo Core:",
      intro1: "We manage machinery and washing processes for textile garments.",
      intro2:
        "We offer a range of services mainly focused on industrial laundries, hotel laundries and dry cleaners: from machinery sales, installation and maintenance, to training for operational and technical staff, as well as tailored studies and audits to help those who already know what they are doing do it a bit better.",
      intro3:
        "We have a long track record and solid success cases in large industrial laundries, leaders in the sector in Spain.",
      intro4: "Set your preferences and access the site to learn more.",
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
      button: "Not available yet"
    },
    gr: {
      subtitle: "Η διαδικασία σου, η δική μας οπτική",
      introTitle: "Unatomo Core:",
      intro1: "Ασχολούμαστε με τη διαχείριση μηχανημάτων και διαδικασιών πλύσης υφασμάτινων ειδών.",
      intro2:
        "Προσφέρουμε μια σειρά υπηρεσιών που εστιάζουν κυρίως σε βιομηχανικά πλυντήρια, πλυντήρια ξενοδοχείων και στεγνοκαθαριστήρια: από πώληση, εγκατάσταση και συντήρηση μηχανημάτων, μέχρι εκπαίδευση προσωπικού και μελέτες ή ελέγχους προσαρμοσμένους σε όσους ήδη ξέρουν τη δουλειά τους αλλά θέλουν να τη βελτιώσουν λίγο περισσότερο.",
      intro3:
        "Διαθέτουμε μακρά πορεία και αποδεδειγμένες επιτυχίες σε μεγάλα βιομηχανικά πλυντήρια, ηγέτες του κλάδου στην Ισπανία.",
      intro4: "Ρύθμισε τις προτιμήσεις σου και μπες στον ιστότοπο για να μάθεις περισσότερα.",
      headingLang: "Γλώσσα",
      headingTheme: "Θέμα",
      headingCookies: "Κούκις",
      cookiesIntro: "Όλα τα προαιρετικά cookies είναι απενεργοποιημένα από προεπιλογή.",
      analyticsTitle: "Αναλυτικά",
      analyticsText: "Μας βοηθούν να καταλάβουμε πώς χρησιμοποιείται ο ιστότοπος.",
      functionalTitle: "Λειτουργικά",
      functionalText: "Θυμούνται μικρές προτιμήσεις (για παράδειγμα, γλώσσα).",
      marketingTitle: "Μάρκετινγκ",
      marketingText: "Περιεχόμενο και επικοινωνίες πιο κοντά στα ενδιαφέροντά σου.",
      themeLight: "Φωτεινό",
      themeDark: "Σκοτεινό",
      button: "Δεν είναι διαθέσιμο ακόμη"
    }
  };

  const paths = {
    es: "/es/index.html",
    en: "/en/index.html"
  };

  const pathname = window.location.pathname || "/";
  const isRoot = pathname === "/" || pathname === "/index.html";

  let isSetupMode = false;
  try {
    const url = new URL(window.location.href);
    isSetupMode = url.searchParams.get("setup") === "1";
  } catch (e) {}

  if (isRoot && !isSetupMode) {
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
  const legalFooter = document.getElementById("legal-footer");
  const loginBtn = document.getElementById("go-login");
  const registerBtn = document.getElementById("go-register");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/auth/login.html";
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      window.location.href = "/auth/register.html";
    });
  }

  if (legalFooter) {
    const year = new Date().getFullYear();
    legalFooter.textContent =
      "© " + year + " UNATOMO CORE SL · Todos los derechos reservados.";
  }

  function applyLanguage(lang) {
    const t = COPY[lang] || COPY.es;
    const get = (id) => document.getElementById(id);

    const subtitle = get("subtitle-main");
    if (subtitle) subtitle.textContent = t.subtitle;

    const introTitle = get("intro-title");
    if (introTitle) introTitle.textContent = t.introTitle;

    const intro1 = get("intro-line-1");
    if (intro1) intro1.textContent = t.intro1;

    const intro2 = get("intro-line-2");
    if (intro2) intro2.textContent = t.intro2;

    const intro3 = get("intro-line-3");
    if (intro3) intro3.textContent = t.intro3;

    const intro4 = get("intro-line-4");
    if (intro4) intro4.textContent = t.intro4;

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
    if (savedLang === "es" || savedLang === "en" || savedLang === "gr") {
      initialLang = savedLang;
    } else {
      const navLang =
        (navigator.language || navigator.userLanguage || "").toLowerCase();

      if (navLang.startsWith("en")) {
        initialLang = "en";
      } else if (navLang.startsWith("es")) {
        initialLang = "es";
      } else if (navLang.startsWith("el")) {
        initialLang = "gr";
      } else {
        initialLang = "es";
      }
    }
  } catch (e) {}

  langInputs.forEach((input) => {
    input.checked = input.value === initialLang;
  });

  applyLanguage(initialLang);

  langInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        const value = input.value;
        const lang = value === "en" || value === "gr" ? value : "es";
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

    if (lang === "en" || lang === "gr") {
      alert("The selected language version of this site is not available yet.");
      return;
    }

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
