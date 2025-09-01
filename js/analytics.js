// js/analytics.js
// Carga Firebase desde CDN (sin bundler) y expone helpers para el contador global

// ⚠️ Tu config (está bien que el apiKey esté público; no es secreto)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBwSla3hdkIIB9gmVfvv7c_0j90IDiCqVU",
  authDomain: "unatomo-f5537.firebaseapp.com",
  projectId: "unatomo-f5537",
  storageBucket: "unatomo-f5537.firebasestorage.app",
  messagingSenderId: "369796455601",
  appId: "1:369796455601:web:4a1c876d330a78584bd690",
  measurementId: "G-DLBTXQBYXC"
};

// Si quieres App Check reCAPTCHA v3 en producción, pon aquí tu Site Key:
const RECAPTCHA_V3_SITE_KEY = "6LfGMLorAAAAAGW3LUS1XRvgx6wdQ7eFMkGQ5Rrq"; // pública
// Para desarrollo con App Check en modo "Aplicar", puedes habilitar el debug token en index.html:
//   <script>self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;</script>

let _app = null;
let _db = null;
let _fs = null; // módulo de firestore dinámico

async function initFirebase() {
  if (_db) return _db;

  // Import dinámico desde CDN (versiona si quieres)
  const [appMod, fsMod, appCheckMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    // App Check es opcional: si falla, seguimos sin él
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js").catch(() => ({})),
  ]);

  _app = appMod.initializeApp(FIREBASE_CONFIG);
  _fs = fsMod;

  // App Check (opcional). Si en Firebase tienes "Aplicar", necesitas esto funcionando.
  try {
    if (appCheckMod && appCheckMod.initializeAppCheck) {
      appCheckMod.initializeAppCheck(_app, {
        provider: new appCheckMod.ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (e) {
    console.warn("App Check no inicializado (continuamos):", e);
  }

  _db = fsMod.getFirestore(_app);
  return _db;
}

/**
 * Lee el total global del doc fijo metrics/exports
 * Devuelve número (0 si no existe o hay error)
 */
export async function getGlobalExportCount() {
  try {
    const db = await initFirebase();
    const ref = _fs.doc(db, "metrics", "exports");
    const snap = await _fs.getDoc(ref);
    return snap.exists() ? (snap.data().total || 0) : 0;
  } catch (e) {
    console.warn("getGlobalExportCount falló:", e);
    return 0;
  }
}

/**
 * Incrementa el total global (transacción) y emite evento para la UI
 * Devuelve el nuevo total o null si falla
 */
export async function incrementGlobalExportCounter() {
  try {
    const db = await initFirebase();
    const ref = _fs.doc(db, "metrics", "exports");

    const newTotal = await _fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, { total: 1, updatedAt: _fs.serverTimestamp() });
        return 1;
      }
      const current = typeof snap.data().total === "number" ? snap.data().total : 0;
      const next = current + 1;
      tx.update(ref, { total: next, updatedAt: _fs.serverTimestamp() });
      return next;
    });

    // Notifica a la UI (ui.js escucha este evento)
    window.dispatchEvent(new CustomEvent("global-export-count", { detail: { value: newTotal } }));
    return newTotal;
  } catch (e) {
    console.warn("incrementGlobalExportCounter falló:", e);
    return null;
  }
}
