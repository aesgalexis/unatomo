import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const DIRECTORY_COLLECTION = "account_directory";

export const normalizeEmail = (email) =>
  (email || "").toString().trim().toLowerCase();

export const upsertAccountDirectory = async (user) => {
  if (!user || !user.email || !user.uid) return null;
  const normalized = normalizeEmail(user.email);
  if (!normalized) return null;
  const displayName = (user.displayName || "").toString().trim();
  const hasCompany = Object.prototype.hasOwnProperty.call(user, "company") ||
    Object.prototype.hasOwnProperty.call(user, "companyName");
  const company = (user.company || user.companyName || "").toString().trim();
  const ref = doc(db, DIRECTORY_COLLECTION, normalized);
  const payload = {
    uid: user.uid,
    email: user.email,
    emailLower: normalized,
    displayName,
    updatedAt: serverTimestamp()
  };
  if (hasCompany) payload.company = company;
  await setDoc(
    ref,
    payload,
    { merge: true }
  );
  return { uid: user.uid, email: user.email };
};

export const getAccountByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const ref = doc(db, DIRECTORY_COLLECTION, normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getDisplayNameByEmail = async (email) => {
  const rawEmail = (email || "").toString().trim();
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) return "";
  const account = await getAccountByEmail(normalized);
  if (account && account.displayName) {
    return account.displayName.toString().trim();
  }
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", rawEmail));
  let snap = await getDocs(q);
  if (snap.empty && rawEmail !== normalized) {
    const qNormalized = query(usersRef, where("email", "==", normalized));
    snap = await getDocs(qNormalized);
  }
  if (snap.empty) return "";
  const first = snap.docs[0].data() || {};
  return (first.displayName || "").toString().trim();
};
