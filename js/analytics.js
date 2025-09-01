// js/analytics.js
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Incrementa el contador global de exportaciones en +1 y devuelve el total actualizado.
 * Seguro en concurrencia gracias a FieldValue.increment.
 */
export async function incrementGlobalExportCounter() {
  const ref = doc(db, "metrics", "exports");
  // Crea el doc si no existe y aplica increment sobre "total"
  await setDoc(
    ref,
    { total: increment(1), updatedAt: serverTimestamp() },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().total || 0) : 0;
}

/**
 * Lee el total actual (sin modificarlo).
 */
export async function getGlobalExportCount() {
  const ref = doc(db, "metrics", "exports");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().total || 0) : 0;
}
