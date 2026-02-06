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

const LINKS_COLLECTION = "admin_machine_links";

const normalizeEmail = (email) =>
  (email || "").toString().trim().toLowerCase();

export const linkDocId = (ownerUid, machineId, adminEmailLower) =>
  `${ownerUid}_${machineId}_${adminEmailLower}`;

export const getLinkForMachine = async (ownerUid, machineId, adminEmail) => {
  const adminEmailLower = normalizeEmail(adminEmail);
  if (!ownerUid || !machineId || !adminEmailLower) return null;
  const ref = doc(db, LINKS_COLLECTION, linkDocId(ownerUid, machineId, adminEmailLower));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const upsertLink = async (payload) => {
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
  if (!adminEmailLower) return null;
  const ref = doc(db, LINKS_COLLECTION, linkDocId(ownerUid, machineId, adminEmailLower));
  await setDoc(
    ref,
    {
      ownerUid,
      ownerEmail,
      machineId,
      machineTitle: machineTitle || "",
      adminUid: adminUid || "",
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

export const updateLinkStatus = async (ownerUid, machineId, adminEmail, patch) => {
  const adminEmailLower = normalizeEmail(adminEmail);
  if (!adminEmailLower) return null;
  const ref = doc(db, LINKS_COLLECTION, linkDocId(ownerUid, machineId, adminEmailLower));
  const normalizedPatch = { ...patch };
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

export const fetchLinksForAdmin = async (email, status) => {
  const adminEmailLower = normalizeEmail(email);
  if (!adminEmailLower) return [];
  const collectionRef = collection(db, LINKS_COLLECTION);
  const q = query(collectionRef, where("adminEmailLower", "==", adminEmailLower));
  const snap = await getDocs(q);
  const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (!status) return list;
  return list.filter((link) => link.status === status);
};

export const normalizeAdminEmail = normalizeEmail;
