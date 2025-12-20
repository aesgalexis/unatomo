import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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
const db = getFirestore(app);

export async function validateRegistrationCode(code) {
  const normalized = (code ?? "").toString().trim().toUpperCase();
  if (!normalized) return { valid: false };

  const ref = doc(db, "registration_codes", normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { valid: false };

  const data = snap.data() || {};
  if (data.active === false) return { valid: false };

  return { valid: true, code: normalized };
}
