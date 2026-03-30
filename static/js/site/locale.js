const SUPPORTED_LANGS = ["es", "en"];
const LANG_STORAGE_KEY = "unatomo_lang";

const TEXT = {
  es: {
    session: {
      guest: "Invitado",
      user: "Usuario",
      login: "Iniciar sesión",
      logout: "Cerrar sesión",
      register: "Registrarse",
      settings: "Configuración",
    },
    footer: {
      rights: (year) => `© ${year} UNATOMO CORE SL · Todos los derechos reservados.`,
    },
  },
  en: {
    session: {
      guest: "Guest",
      user: "User",
      login: "Sign in",
      logout: "Sign out",
      register: "Register",
      settings: "Settings",
    },
    footer: {
      rights: (year) => `© ${year} UNATOMO CORE SL · All rights reserved.`,
    },
  },
};

export const getCurrentLang = () => {
  const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  const fromPath = pathMatch ? pathMatch[1].toLowerCase() : "";
  if (SUPPORTED_LANGS.includes(fromPath)) return fromPath;

  const fromHtml = (document.documentElement.lang || "").trim().toLowerCase();
  if (SUPPORTED_LANGS.includes(fromHtml)) return fromHtml;

  return "es";
};

export const getSavedLang = () => {
  try {
    const value = (localStorage.getItem(LANG_STORAGE_KEY) || "").trim().toLowerCase();
    return SUPPORTED_LANGS.includes(value) ? value : "";
  } catch {
    return "";
  }
};

export const setSavedLang = (lang) => {
  const value = SUPPORTED_LANGS.includes(lang) ? lang : "";
  if (!value) return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, value);
  } catch {}
};

export const resolvePreferredLang = () => {
  const saved = getSavedLang();
  if (saved) return saved;

  const browserLangs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || ""];

  const first = browserLangs
    .map((value) => String(value || "").trim().toLowerCase())
    .find(Boolean);

  return first.startsWith("es") ? "es" : "en";
};

export const getLangPrefix = (lang = getCurrentLang()) =>
  SUPPORTED_LANGS.includes(lang) ? `/${lang}` : "/es";

export const localizeEsPath = (path, lang = getCurrentLang()) => {
  const targetPrefix = getLangPrefix(lang);
  if (!path) return targetPrefix;
  if (/^https?:\/\//i.test(path)) return path;
  if (path === "/es") return targetPrefix;
  if (path.startsWith("/es/")) return `${targetPrefix}${path.slice(3)}`;
  return path;
};

export const getUiPath = (fileName, lang = getCurrentLang()) =>
  `${getLangPrefix(lang)}/ui/${fileName}`;

export const getLocaleText = (lang = getCurrentLang()) => TEXT[lang] || TEXT.es;

export const isEnglish = (lang = getCurrentLang()) => lang === "en";

export const getLocalizedHref = (targetLang, href = window.location.href) => {
  const lang = SUPPORTED_LANGS.includes(targetLang) ? targetLang : getCurrentLang();
  const url = new URL(href, window.location.origin);
  const path = url.pathname;

  if (/^\/(?:es|en)(?:\/|$)/i.test(path)) {
    url.pathname = path.replace(/^\/(?:es|en)(?=\/|$)/i, `/${lang}`);
  } else {
    url.pathname = `${getLangPrefix(lang)}${path === "/" ? "/index.html" : path}`;
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
