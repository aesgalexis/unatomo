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
  const adminEmailLower = normalizeEmail(adminEmail);
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
      adminEmailLower,
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
  const normalizedPatch = {
    ...patch
  };
  if (Object.prototype.hasOwnProperty.call(normalizedPatch, "adminEmail")) {
    normalizedPatch.adminEmailLower = normalizeEmail(normalizedPatch.adminEmail);
  }
  await setDoc(
    ref,
    {
      ...normalizedPatch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const fetchInvitesForAdmin = async (adminUid, status, email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];
  const collectionRef = collection(db, INVITES_COLLECTION);
  const q = query(collectionRef, where("adminEmailLower", "==", normalizedEmail));
  const snap = await getDocs(q);
  let list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const map = new Map();
  list.forEach((invite) => {
    if (!invite || !invite.ownerUid || !invite.machineId) return;
    const key = `${invite.ownerUid}_${invite.machineId}`;
    const preferredId = inviteDocId(invite.ownerUid, invite.machineId);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, invite);
      return;
    }
    if (existing.id !== preferredId && invite.id === preferredId) {
      map.set(key, invite);
    }
  });
  list = Array.from(map.values());
  if (!status) return list;
  return list.filter((invite) => invite.status === status);
};
