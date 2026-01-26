import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export const validateTag = async (tagId) => {
  const ref = doc(db, "tags", tagId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { exists: false };
  return { exists: true, id: tagId, ...snap.data() };
};

export const assignTag = async (tagId, uid, machineId) => {
  const ref = doc(db, "tags", tagId);
  await setDoc(
    ref,
    {
      state: "assigned",
      tenantId: uid,
      machineId,
      assignedAt: serverTimestamp(),
      assignedBy: uid
    },
    { merge: true }
  );
};
