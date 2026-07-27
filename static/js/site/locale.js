const SUPPORTED_LANGS = ["es", "en"];
const LANG_STORAGE_KEY = "unatomo_lang";
const LOCALIZED_PAGE_MAP = {
  "impresion-qr.html": {
    es: "impresion-qr.html",
    en: "qr-print.html",
  },
  "qr-print.html": {
    es: "impresion-qr.html",
    en: "qr-print.html",
  },
};

export const getAppBasePrefix = (pathname = window.location.pathname) =>
  /^\/nfc(?:\/|$)/i.test(pathname) ? "/nfc" : "";

const TEXT = {
  es: {
    session: {
      guest: "Invitado",
      user: "Usuario",
      login: "Iniciar sesi\u00f3n",
      logout: "Cerrar sesi\u00f3n",
      register: "Registrarse",
      settings: "Configuraci\u00f3n",
    },
    footer: {
      rights: (year) => `\u00a9 ${year} UNATOMO CORE SL \u00b7 Todos los derechos reservados.`,
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
      rights: (year) => `\u00a9 ${year} UNATOMO CORE SL \u00b7 All rights reserved.`,
    },
  },
};

export const getCurrentLang = () => {
  const pathMatch = window.location.pathname.match(/^\/(?:nfc\/)?([a-z]{2})(?:\/|$)/i);
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
  SUPPORTED_LANGS.includes(lang)
    ? `${getAppBasePrefix()}/${lang}`
    : `${getAppBasePrefix()}/es`;

export const localizeEsPath = (path, lang = getCurrentLang()) => {
  const targetPrefix = getLangPrefix(lang);
  if (!path) return targetPrefix;
  if (/^https?:\/\//i.test(path)) return path;
  if (path === "/") return `${getAppBasePrefix() || ""}/`;
  if (path === "/es") return targetPrefix;
  const fileName = path.split("/").pop();
  const mappedFileName = LOCALIZED_PAGE_MAP[fileName]?.[lang];
  if (mappedFileName) return `${targetPrefix}/${mappedFileName}`;
  if (path.startsWith("/es/")) return `${targetPrefix}${path.slice(3)}`;
  return path;
};

export const getUiPath = (fileName, lang = getCurrentLang()) => {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : "es";
  const basePrefix = getAppBasePrefix();
  if (basePrefix) return `${basePrefix}/${safeLang}/ui/${fileName}`;
  return `/nfc/${safeLang}/ui/${fileName}`;
};

export const getLocaleText = (lang = getCurrentLang()) => TEXT[lang] || TEXT.es;

export const isEnglish = (lang = getCurrentLang()) => lang === "en";

export const getLocalizedHref = (targetLang, href = window.location.href) => {
  const lang = SUPPORTED_LANGS.includes(targetLang) ? targetLang : getCurrentLang();
  const url = new URL(href, window.location.origin);
  const path = url.pathname;
  const basePrefix = getAppBasePrefix(path);
  const targetPrefix = `${basePrefix}/${lang}`;

  if (/^\/(?:nfc\/)?(?:es|en)(?:\/|$)/i.test(path)) {
    const fileName = path.split("/").pop();
    const mappedFileName = LOCALIZED_PAGE_MAP[fileName]?.[lang];
    if (mappedFileName) {
      url.pathname = `${targetPrefix}/${mappedFileName}`;
    } else {
      url.pathname = path.replace(/^\/(?:nfc\/)?(?:es|en)(?=\/|$)/i, targetPrefix);
    }
  } else {
    url.pathname = `${targetPrefix}${path === "/" ? "/index.html" : path}`;
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
