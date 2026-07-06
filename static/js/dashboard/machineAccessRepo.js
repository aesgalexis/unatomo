import { db, functions } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const getMachineAccessPublicCallable = httpsCallable(functions, "getMachineAccessPublic");

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
      updatedAt: serverTimestamp(),
      updatedBy: author
    },
    { merge: true }
  );
};

export const fetchMachineAccess = async (tagId) => {
  const response = await getMachineAccessPublicCallable({ tagId });
  return response?.data?.machine || null;
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
