import { functions } from "/static/js/firebase/firebaseApp.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const checkAvailabilityCallable = httpsCallable(
  functions,
  "checkAccountHandleAvailability"
);
const claimHandleCallable = httpsCallable(functions, "claimAccountHandle");
const changeHandleCallable = httpsCallable(functions, "changeAccountHandle");

export const normalizeAccountHandle = (value) =>
  (value || "").toString().trim().replace(/^@+/, "").toLowerCase();

export const checkAccountHandleAvailability = async (handle) => {
  const response = await checkAvailabilityCallable({
    handle: normalizeAccountHandle(handle)
  });
  return response?.data || {};
};

export const claimAccountHandle = async (handle) => {
  const response = await claimHandleCallable({
    handle: normalizeAccountHandle(handle)
  });
  return response?.data || {};
};

export const changeAccountHandle = async (handle) => {
  const response = await changeHandleCallable({
    handle: normalizeAccountHandle(handle)
  });
  return response?.data || {};
};
