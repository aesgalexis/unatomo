import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const DIRECTORY_COLLECTION = "account_directory";

export const normalizeEmail = (email) =>
  (email || "").toString().trim().toLowerCase();

export const upsertAccountDirectory = async (user) => {
  if (!user || !user.email || !user.uid) return null;
  const normalized = normalizeEmail(user.email);
  if (!normalized) return null;
  const ref = doc(db, DIRECTORY_COLLECTION, normalized);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email,
      updatedAt: serverTimestamp()
    },
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

