import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const INVITES_COLLECTION = "machine_admin_invites";

const normalizeEmail = (email) =>
  (email || "").toString().trim().toLowerCase();

export const inviteDocId = (ownerUid, machineId) =>
  `${ownerUid}_${machineId}`;

export const getInviteForMachine = async (ownerUid, machineId) => {
  if (!ownerUid || !machineId) return null;
  const ref = doc(db, INVITES_COLLECTION, inviteDocId(ownerUid, machineId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const upsertInvite = async (payload) => {
  const {
    ownerUid,
    ownerEmail,
    machineId,
    machineTitle,
    adminUid,
    adminEmail,
    status
  } = payload;
  const ref = doc(db, INVITES_COLLECTION, inviteDocId(ownerUid, machineId));
  await setDoc(
    ref,
    {
      ownerUid,
      ownerEmail,
      machineId,
      machineTitle: machineTitle || "",
      adminUid,
      adminEmail,
      status,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
  return ref.id;
};

export const updateInviteStatus = async (ownerUid, machineId, patch) => {
  const ref = doc(db, INVITES_COLLECTION, inviteDocId(ownerUid, machineId));
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const updateInviteStatusById = async (inviteId, patch) => {
  if (!inviteId) return;
  const ref = doc(db, INVITES_COLLECTION, inviteId);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const fetchInvitesForAdmin = async (adminUid, status, email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!adminUid && !normalizedEmail) return [];
  const collectionRef = collection(db, INVITES_COLLECTION);
  let q = null;
  if (adminUid) {
    q = query(collectionRef, where("adminUid", "==", adminUid));
  } else {
    q = query(collectionRef, where("adminEmail", "==", normalizedEmail));
  }
  const snap = await getDocs(q);
  let list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (adminUid && normalizedEmail) {
    const emailSnap = await getDocs(
      query(collectionRef, where("adminEmail", "==", normalizedEmail))
    );
    const emailList = emailSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const map = new Map();
    [...list, ...emailList].forEach((invite) => {
      if (invite && invite.id) map.set(invite.id, invite);
    });
    list = Array.from(map.values());
  }
  if (!status) return list;
  return list.filter((invite) => invite.status === status);
};
