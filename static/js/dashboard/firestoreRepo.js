import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
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
