import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { getCurrentLang } from "/static/js/site/locale.js";

const generateMachineTagQrCallable = httpsCallable(
  functions,
  "generateMachineTagQr"
);
const disconnectMachineTagCallable = httpsCallable(
  functions,
  "disconnectMachineTag"
);
const CANONICAL_SITE_ORIGIN = "https://unatomo.com";

export const buildMachineTagUrl = (tagId, lang = getCurrentLang()) => {
  if (!tagId) return "";
  const safeLang = lang === "en" ? "en" : "es";
  return `${CANONICAL_SITE_ORIGIN}/nfc/${safeLang}/m.html?tag=${encodeURIComponent(tagId)}`;
};

export const generateMachineTagQr = async (machineId, lang = getCurrentLang()) => {
  const response = await generateMachineTagQrCallable({ machineId, lang });
  return response?.data || {};
};

export const disconnectMachineTag = async (machineId) => {
  const response = await disconnectMachineTagCallable({ machineId });
  return response?.data || {};
};
