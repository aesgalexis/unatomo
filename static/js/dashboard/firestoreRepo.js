import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  writeBatch,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const machinesCollection = collection(db, "machines");
const usernamesDoc = (ownerUid, normalized) =>
  doc(db, "usernames", `${ownerUid}_${normalized}`);

export const fetchMachines = async (uid) => {
  const q = query(machinesCollection, where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const fetchLegacyMachines = async (uid) => {
  if (!uid) return [];
  const legacyCol = collection(db, "tenants", uid, "machines");
  const snap = await getDocs(legacyCol);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const migrateLegacyMachines = async (uid, legacyMachines = []) => {
  if (!uid || !legacyMachines.length) return;
  const batch = writeBatch(db);
  const now = serverTimestamp();
  legacyMachines.forEach((machine) => {
    const ref = doc(machinesCollection, machine.id);
    batch.set(
      ref,
      {
        ...machine,
        ownerUid: uid,
        tenantId: uid,
        updatedAt: now,
        updatedBy: uid
      },
      { merge: true }
    );
  });
  await batch.commit();
};

export const fetchMachine = async (uid, machineId) => {
  const ref = doc(db, "machines", machineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (uid && data.ownerUid && data.ownerUid !== uid) return null;
  return { id: snap.id, ...data };
};

export const commitChanges = async (uid, { creates, updates, deletes }) => {
  const batch = writeBatch(db);
  const col = machinesCollection;
  const now = serverTimestamp();

  creates.forEach((machine) => {
    const ref = doc(col, machine.id);
    batch.set(ref, {
      ...machine,
      ownerUid: machine.tenantId || machine.ownerUid || uid,
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
        ownerUid: machine.tenantId || machine.ownerUid || uid,
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
  const ref = doc(db, "machines", machine.id);
  const ownerUid = machine.tenantId || machine.ownerUid || uid;
  const payload = {
    ownerUid,
    tenantId: ownerUid,
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
    adminEmail: machine.adminEmail || "",
    adminStatus: machine.adminStatus || "",
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
  const ref = doc(db, "machines", machineId);
  await deleteDoc(ref);
};

export const addUserWithRegistry = async (uid, machineId, user, options = {}) => {
  const { normalizeName, allowExisting = false } = options;
  const machineRef = doc(db, "machines", machineId);
  const normalized = normalizeName
    ? normalizeName(user.username)
    : (user.username || "").trim().toLowerCase();
  const userRef = usernamesDoc(uid, normalized);

  return runTransaction(db, async (tx) => {
    const [machineSnap, userSnap] = await Promise.all([
      tx.get(machineRef),
      tx.get(userRef)
    ]);
    if (!machineSnap.exists()) throw new Error("machine-missing");
    const machineData = machineSnap.data() || {};
    if (machineData.ownerUid && machineData.ownerUid !== uid) {
      throw new Error("not-owner");
    }
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
        ownerUid: uid,
        machineId,
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

export const deleteUserRegistry = async (uid, normalized) => {
  if (!normalized) return;
  const ref = usernamesDoc(uid, normalized);
  await deleteDoc(ref);
};
