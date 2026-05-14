import { db, functions } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { getCurrentLang } from "/static/js/site/locale.js";

const assignMachineTagCallable = httpsCallable(functions, "assignMachineTag");

const shouldUseFirestoreFallback = (error) => {
  const code = (error?.code || "").toString();
  return (
    code.includes("functions/not-found") ||
    code.includes("functions/unimplemented") ||
    code.includes("not-found") ||
    code.includes("unimplemented") ||
    code.includes("functions/permission-denied")
  );
};

export const validateTag = async (tagId) => {
  const ref = doc(db, "tags", tagId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { exists: false };
  return { exists: true, id: tagId, ...snap.data() };
};

export const assignTag = async (tagId, _uid, machineId) => {
  try {
    await assignMachineTagCallable({ tagId, machineId, lang: getCurrentLang() });
  } catch (error) {
    if (!shouldUseFirestoreFallback(error)) throw error;
    const ref = doc(db, "tags", tagId);
    await setDoc(
      ref,
      {
        state: "assigned",
        tenantId: _uid,
        machineId,
        assignedAt: serverTimestamp(),
        assignedBy: _uid
      },
      { merge: true }
    );
  }
};
