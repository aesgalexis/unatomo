import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
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
    serial: machine.serial || "",
    year: machine.year ?? null,
    location: machine.location || "",
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

const usernameDoc = (uid, normalized) =>
  doc(db, "tenants", uid, "usernames", normalized);

export const addUserWithRegistry = async (uid, machineId, user, options = {}) => {
  const { normalizeName, allowExisting = false } = options;
  const machineRef = doc(db, "tenants", uid, "machines", machineId);
  const normalized = normalizeName
    ? normalizeName(user.username)
    : (user.username || "").trim().toLowerCase();
  const userRef = usernameDoc(uid, normalized);

  return runTransaction(db, async (tx) => {
    const [machineSnap, userSnap] = await Promise.all([
      tx.get(machineRef),
      tx.get(userRef)
    ]);
    if (!machineSnap.exists()) throw new Error("machine-missing");
    const machineData = machineSnap.data() || {};
    const users = Array.isArray(machineData.users) ? [...machineData.users] : [];
    const existsInMachine = users.some((u) => {
      const uname = normalizeName
        ? normalizeName(u.username)
        : (u.username || "").trim().toLowerCase();
      return uname === normalized;
    });
    if (existsInMachine) throw new Error("duplicate-user");

    if (userSnap.exists()) {
      if (!allowExisting) throw new Error("duplicate-user");
      const data = userSnap.data() || {};
      user.saltBase64 = data.saltBase64 || user.saltBase64 || "";
      user.passwordHashBase64 = data.passwordHashBase64 || user.passwordHashBase64 || "";
      user.username = data.username || user.username;
      if (!user.saltBase64 || !user.passwordHashBase64) {
        throw new Error("missing-credentials");
      }
    } else {
      if (!user.saltBase64 || !user.passwordHashBase64) {
        throw new Error("missing-credentials");
      }
      tx.set(userRef, {
        username: user.username,
        saltBase64: user.saltBase64,
        passwordHashBase64: user.passwordHashBase64,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid
      });
    }

    users.push(user);
    tx.set(
      machineRef,
      { users, updatedAt: serverTimestamp(), updatedBy: uid },
      { merge: true }
    );
    return users;
  });
};
