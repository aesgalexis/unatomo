import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const machinesCollection = (uid) => collection(db, "tenants", uid, "machines");

export const fetchMachines = async (uid) => {
  const snap = await getDocs(machinesCollection(uid));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const commitChanges = async (uid, { creates, updates, deletes }) => {
  const batch = writeBatch(db);
  const col = machinesCollection(uid);
  const now = serverTimestamp();

  creates.forEach((machine) => {
    const ref = doc(col, machine.id);
    batch.set(ref, {
      ...machine,
      createdAt: now,
      updatedAt: now,
      updatedBy: uid
    });
  });

  updates.forEach((machine) => {
    const ref = doc(col, machine.id);
    batch.set(
      ref,
      {
        ...machine,
        updatedAt: now,
        updatedBy: uid
      },
      { merge: true }
    );
  });

  deletes.forEach((id) => {
    const ref = doc(col, id);
    batch.delete(ref);
  });

  await batch.commit();
};

export const upsertMachine = async (uid, machine) => {
  const ref = doc(db, "tenants", uid, "machines", machine.id);
  const payload = {
    title: machine.title,
    brand: machine.brand,
    model: machine.model,
    year: machine.year ?? null,
    status: machine.status,
    tagId: machine.tagId ?? null,
    logs: machine.logs || [],
    tasks: machine.tasks || [],
    order: typeof machine.order === "number" ? machine.order : 0,
    users: machine.users || [],
    notifications: machine.notifications || null,
    updatedAt: serverTimestamp(),
    updatedBy: uid
  };
  if (machine.isNew) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
};

export const deleteMachine = async (uid, machineId) => {
  const ref = doc(db, "tenants", uid, "machines", machineId);
  await deleteDoc(ref);
};
