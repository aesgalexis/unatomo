// js/analytics.js
// --- Config de tu proyecto Firebase (la misma que ya creaste) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBwSla3hdkIIB9gmVfvv7c_0j90IDiCqVU",
  authDomain: "unatomo-f5537.firebaseapp.com",
  projectId: "unatomo-f5537",
  storageBucket: "unatomo-f5537.firebasestorage.app",
  messagingSenderId: "369796455601",
  appId: "1:369796455601:web:4a1c876d330a78584bd690",
  measurementId: "G-DLBTXQBYXC",
};

// reCAPTCHA v3 (site key pública para App Check)
// OJO: la "clave secreta" NUNCA va en el frontend.
const RECAPTCHA_SITE_KEY = "6LfGMLorAAAAAGW3LUS1XRvgx6wdQ7eFMkGQ5Rrq";

// Doc que vamos a usar en Firestore
const DOC_PATH = ["metrics", "exports"];

// Caché del init para no inicializar 2 veces
let _fb = null;

// Inicializa Firebase + Firestore (+ App Check opcional)
async function ensureFirebase() {
  if (_fb) return _fb;

  const [{ initializeApp }, fs, appCheckMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    // App Check es opcional; si falla seguimos sin él
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js").catch(
      () => ({})
    ),
  ]);

  const app = initializeApp(FIREBASE_CONFIG);

  // App Check con reCAPTCHA v3 (opcional pero recomendado)
  try {
    if (appCheckMod && appCheckMod.initializeAppCheck) {
      // Activa modo debug si pusiste self.FIREBASE_APPCHECK_DEBUG_TOKEN = true en index
      if (window.FIREBASE_APPCHECK_DEBUG_TOKEN) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      appCheckMod.initializeAppCheck(app, {
        provider: new appCheckMod.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (e) {
    console.warn("App Check init falló (continuamos sin él):", e);
  }

  const db = fs.getFirestore(app);
  _fb = { app, db, fs };
  return _fb;
}

// === API pública que usa tu UI/estado ===

// Lee el total global (0 si no existe)
export async function getGlobalExportCount() {
  try {
    const { db, fs } = await ensureFirebase();
    const ref = fs.doc(db, ...DOC_PATH);
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return 0;
    const n = Number(snap.data()?.total);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    console.warn("getGlobalExportCount() falló:", e);
    return 0; // fallback silencioso
  }
}

// Incrementa el contador global en +1 (transacción)
// y emite el evento 'global-export-count' con el nuevo valor.
export async function incrementGlobalExportCounter() {
  try {
    const { db, fs } = await ensureFirebase();
    // Asegúrate de que DOC_PATH sea por ejemplo: ['metrics', 'exports']
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

    // 👇 Notifica a la UI
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("global-export-count", { detail: { value: newTotal } })
      );
    }

    // 👇 Devuelve el total actualizado (importantísimo para state.js)
    return newTotal;
  } catch (err) {
    console.error("incrementGlobalExportCounter failed:", err);
    throw err;
  }
}

    // Notifica a la UI (ui.js ya escucha este evento)
    window.dispatchEvent(
      new CustomEvent("global-export-count", { detail: { value: newTotal } })
    );

    return newTotal;
  } catch (e) {
    console.warn("incrementGlobalExportCounter() falló:", e);
    return null; // no rompas la UI si hay fallo de red/reglas
  }
}
