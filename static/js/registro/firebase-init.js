import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWsV-z0v90W9OxtHDx-m2N4SF-iUc9JNY",
  authDomain: "unatomo-c20a4.firebaseapp.com",
  projectId: "unatomo-c20a4",
  storageBucket: "unatomo-c20a4.firebasestorage.app",
  messagingSenderId: "856960214566",
  appId: "1:856960214566:web:8cfe8fffe96143e98728e7",
  measurementId: "G-8S09EBX9ZK"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export async function validateRegistrationCode(code) {
  const normalized = (code  "").toString().trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "empty" };

  const ref = doc(db, "registration_codes", normalized);
  const snap = await getDoc(ref);

  if (!snap.exists()) return { valid: false, reason: "not_found", code: normalized };

  const data = snap.data() || {};
  if (data.active === false) return { valid: false, reason: "inactive", code: normalized };

  return { valid: true, code: normalized, data };
}

async function upsertUserProfile(user, regCode) {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    regCode: regCode,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });
}

export async function registerWithGoogle(regCode) {
  const code = (regCode  "").toString().trim().toUpperCase();
  if (!code) return { ok: false };

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  const user = result.user;
  if (!user) return { ok: false };

  await upsertUserProfile(user, code);
  return { ok: true, uid: user.uid };
}

export async function registerWithEmail(regCode, email, password, displayName) {
  const code = (regCode  "").toString().trim().toUpperCase();
  const em = (email  "").toString().trim();
  const pw = (password  "").toString();

  if (!code || !em || !pw) return { ok: false };

  const cred = await createUserWithEmailAndPassword(auth, em, pw);

  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName: displayName.toString().trim() });
  }

  await upsertUserProfile(cred.user, code);
  return { ok: true, uid: cred.user.uid };
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  if (!result.user) return { ok: false };
  return { ok: true, uid: result.user.uid };
}

export async function loginWithEmail(email, password) {
  const em = (email  "").toString().trim();
  const pw = (password  "").toString();
  const cred = await signInWithEmailAndPassword(auth, em, pw);
  if (!cred.user) return { ok: false };
  return { ok: true, uid: cred.user.uid };
}

export async function sendPasswordReset(email) {
  const em = (email  "").toString().trim();
  if (!em) return { ok: false };
  await sendPasswordResetEmail(auth, em);
  return { ok: true };
}

