import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export const upsertMachineAccessFromMachine = async (uid, machine) => {
  if (!machine?.tagId) return;
  const ref = doc(db, "machine_access", machine.tagId);
  await setDoc(
    ref,
    {
      tenantId: uid,
      machineId: machine.id,
      title: machine.title,
      brand: machine.brand,
      model: machine.model,
      year: machine.year ?? null,
      status: machine.status,
      logs: machine.logs || [],
      tasks: machine.tasks || [],
      users: machine.users || [],
      updatedAt: serverTimestamp(),
      updatedBy: uid
    },
    { merge: true }
  );
};

export const fetchMachineAccess = async (tagId) => {
  const ref = doc(db, "machine_access", tagId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const updateMachineAccess = async (tagId, patch, updatedBy) => {
  if (!tagId) return;
  const ref = doc(db, "machine_access", tagId);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy
    },
    { merge: true }
  );
};
