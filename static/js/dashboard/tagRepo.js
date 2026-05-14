import { db, functions } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { getCurrentLang } from "/static/js/site/locale.js";

const assignMachineTagCallable = httpsCallable(functions, "assignMachineTag");

export const validateTag = async (tagId) => {
  const ref = doc(db, "tags", tagId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { exists: false };
  return { exists: true, id: tagId, ...snap.data() };
};

export const assignTag = async (tagId, _uid, machineId) => {
  await assignMachineTagCallable({ tagId, machineId, lang: getCurrentLang() });
};
