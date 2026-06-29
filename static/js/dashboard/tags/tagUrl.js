import { getCurrentLang } from "/static/js/site/locale.js";

const CANONICAL_SITE_ORIGIN = "https://unatomo.com";

export const buildMachineTagUrl = (tagId, lang = getCurrentLang()) => {
  if (!tagId) return "";
  const safeLang = lang === "en" ? "en" : "es";
  return `${CANONICAL_SITE_ORIGIN}/nfc/${safeLang}/m.html?tag=${encodeURIComponent(tagId)}`;
};
