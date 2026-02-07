import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const INVITES_COLLECTION = "admin_machine_invites";

const normalizeEmail = (email) => (email || "").toString().trim().toLowerCase();

export const inviteDocId = (machineId, adminEmailLower) =>
  `${machineId}_${adminEmailLower}`;

export const getInviteForMachine = async (machineId, adminEmail) => {
  const adminEmailLower = normalizeEmail(adminEmail);
  if (!machineId || !adminEmailLower) return null;
  const ref = doc(db, INVITES_COLLECTION, inviteDocId(machineId, adminEmailLower));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const fetchInvitesForAdmin = async (email, status) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];
  const collectionRef = collection(db, INVITES_COLLECTION);
  const q = query(collectionRef, where("adminEmailLower", "==", normalizedEmail));
  const snap = await getDocs(q);
  const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (!status) return list;
  return list.filter((invite) => invite.status === status);
};
