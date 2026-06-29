import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { getCurrentLang } from "/static/js/site/locale.js";
export { buildMachineTagUrl } from "./tagUrl.js";

const generateMachineTagQrCallable = httpsCallable(
  functions,
  "generateMachineTagQr"
);
const disconnectMachineTagCallable = httpsCallable(
  functions,
  "disconnectMachineTag"
);
export const generateMachineTagQr = async (machineId, lang = getCurrentLang()) => {
  try {
    const response = await generateMachineTagQrCallable({ machineId, lang });
    return response?.data || {};
  } catch (error) {
    const code = (error?.code || "").toString();
    const message = (error?.message || "").toString();
    if (code.includes("resource-exhausted") || message.includes("storage-full")) {
      throw new Error("storage-full");
    }
    throw error;
  }
};

export const disconnectMachineTag = async (machineId) => {
  const response = await disconnectMachineTagCallable({ machineId });
  return response?.data || {};
};
