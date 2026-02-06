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

export const fetchInvitesForAdmin = async (adminUid, status, email) => {
  if (!adminUid && !email) return [];
  const collectionRef = collection(db, INVITES_COLLECTION);
  let q = null;
  if (adminUid) {
    q = query(collectionRef, where("adminUid", "==", adminUid));
  } else {
    q = query(collectionRef, where("adminEmail", "==", email));
  }
  const snap = await getDocs(q);
  let list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (adminUid && email) {
    const emailSnap = await getDocs(query(collectionRef, where("adminEmail", "==", email)));
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
