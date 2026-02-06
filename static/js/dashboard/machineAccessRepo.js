import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export const upsertMachineAccessFromMachine = async (tenantId, machine, updatedBy) => {
  if (!machine.tagId) return;
  const ref = doc(db, "machine_access", machine.tagId);
  const author = updatedBy || tenantId;
  await setDoc(
    ref,
    {
      tenantId,
      machineId: machine.id,
      title: machine.title,
      brand: machine.brand,
      model: machine.model,
      serial: machine.serial || "",
      year: machine.year ?? null,
      location: machine.location || "",
      status: machine.status,
      logs: machine.logs || [],
      tasks: machine.tasks || [],
      users: machine.users || [],
      updatedAt: serverTimestamp(),
      updatedBy: author
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
