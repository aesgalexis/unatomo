import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const LINKS_COLLECTION = "admin_machine_links";

export const linkDocId = (machineId, adminUid) => `${machineId}_${adminUid}`;

export const getLinkForAdminMachine = async (machineId, adminUid) => {
  if (!machineId || !adminUid) return null;
  const ref = doc(db, LINKS_COLLECTION, linkDocId(machineId, adminUid));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const fetchLinksForAdmin = async (adminUid, status) => {
  if (!adminUid) return [];
  const collectionRef = collection(db, LINKS_COLLECTION);
  const q = query(collectionRef, where("adminUid", "==", adminUid));
  const snap = await getDocs(q);
  const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (!status) return list;
  return list.filter((link) => link.status === status);
};
