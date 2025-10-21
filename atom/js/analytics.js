// analytics.js — Firestore (contador global) con imports dinámicos

// --- Config Firebase (la tuya) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBwSla3hdkIIB9gmVfvv7c_0j90IDiCqVU",
  authDomain: "unatomo-f5537.firebaseapp.com",
  projectId: "unatomo-f5537",
  storageBucket: "unatomo-f5537.firebasestorage.app",
  messagingSenderId: "369796455601",
  appId: "1:369796455601:web:4a1c876d330a78584bd690",
  measurementId: "G-DLBTXQBYXC",
};

// Documento donde guardamos el total global
const DOC_PATH = ["metrics", "exports"];

// reCAPTCHA v3 (App Check) — opcional
const RECAPTCHA_SITE_KEY = "6LfGMLorAAAAAGW3LUS1XRvgx6wdQ7eFMkGQ5Rrq";

let _initPromise = null;

async function ensureFirebase() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const [appMod, fsMod, appCheckMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js").catch(() => ({})),
    ]);

    const app = appMod.initializeApp(FIREBASE_CONFIG);

    // App Check (opcional). Si falla, seguimos sin él.
    try {
      if (appCheckMod.initializeAppCheck && appCheckMod.ReCaptchaV3Provider) {
        appCheckMod.initializeAppCheck(app, {
          provider: new appCheckMod.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
      }
    } catch (e) {
      console.warn("App Check init failed (continuamos sin él):", e);
    }

    const db = fsMod.getFirestore(app);

    // Re-exportamos helpers de Firestore que usamos
    const fs = {
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
      runTransaction: fsMod.runTransaction,
      setDoc: fsMod.setDoc,
      updateDoc: fsMod.updateDoc,
      serverTimestamp: fsMod.serverTimestamp,
    };

    return { app, db, fs };
  })();

  return _initPromise;
}

// Lee el total global (si falla, usa fallback local)
export async function getGlobalExportCount() {
  try {
    const { db, fs } = await ensureFirebase();
    const ref = fs.doc(db, ...DOC_PATH);
    const snap = await fs.getDoc(ref);
    const v = snap.exists() ? Number(snap.data()?.total) : 0;
    return Number.isFinite(v) ? v : 0;
  } catch (e) {
    console.warn("getGlobalExportCount() fallback local:", e);
    const local = Number(localStorage.getItem("fallback-exports") || "0");
    return Number.isFinite(local) ? local : 0;
  }
}

// Incrementa el contador global en +1 y devuelve el nuevo total.
// Si falla red, usa fallback local; también emite el evento 'global-export-count'.
export async function incrementGlobalExportCounter() {
  try {
    const { db, fs } = await ensureFirebase();
    const ref = fs.doc(db, ...DOC_PATH);

    const newTotal = await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists() ? Number(snap.data()?.total) : 0;
      const next = (Number.isFinite(prev) ? prev : 0) + 1;

      if (snap.exists()) {
        tx.update(ref, { total: next, updatedAt: fs.serverTimestamp() });
      } else {
        tx.set(ref, { total: next, updatedAt: fs.serverTimestamp() });
      }
      return next;
    });

    try {
      window.dispatchEvent(
        new CustomEvent("global-export-count", { detail: { value: newTotal } })
      );
    } catch {}

    return newTotal;
  } catch (e) {
    console.warn("incrementGlobalExportCounter() fallback local:", e);
    const local = Number(localStorage.getItem("fallback-exports") || "0") + 1;
    localStorage.setItem("fallback-exports", String(local));
    try {
      window.dispatchEvent(
        new CustomEvent("global-export-count", { detail: { value: local } })
      );
    } catch {}
    return local;
  }
}
