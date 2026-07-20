import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app-check.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const runtimeConfig = window.__UNATOMO_CONFIG__ || {};
const firebaseConfig = {
  apiKey: runtimeConfig.FIREBASE_API_KEY || "",
  authDomain: runtimeConfig.FIREBASE_AUTH_DOMAIN || "",
  projectId: runtimeConfig.FIREBASE_PROJECT_ID || "",
  storageBucket: runtimeConfig.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: runtimeConfig.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: runtimeConfig.FIREBASE_APP_ID || "",
  measurementId: runtimeConfig.FIREBASE_MEASUREMENT_ID || ""
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase config missing. Revisa runtime-config.js o .env.local.");
  throw new Error("Missing Firebase config");
}

export const app = initializeApp(firebaseConfig);

const appCheckSiteKey = runtimeConfig.FIREBASE_APP_CHECK_SITE_KEY || "";
const appCheckDebugToken = runtimeConfig.FIREBASE_APP_CHECK_DEBUG_TOKEN || "";
if (appCheckDebugToken) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
}

let initializedAppCheck = null;
if (appCheckSiteKey) {
  try {
    initializedAppCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.warn("Firebase App Check no se pudo inicializar.", error);
  }
}

export const appCheck = initializedAppCheck;

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
const validateCodeCallable = httpsCallable(functions, "validateRegistrationCode");
const redeemCodeCallable = httpsCallable(functions, "redeemRegistrationCode");

const buildLoginResult = async (user) => {
  if (!user) return { ok: false };
  const registration = await getUserRegistrationState(user);
  return {
    ok: registration.allowed,
    uid: user.uid,
    needsRegistration: !registration.allowed,
    registrationReason: registration.reason || ""
  };
};

export async function validateRegistrationCode(code) {
  const normalized = (code || "").toString().trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "empty" };
  const response = await validateCodeCallable({ code: normalized });
  const result = response?.data || {};
  return {
    valid: result.valid === true,
    reason: (result.reason || "").toString(),
    code: (result.code || normalized).toString()
  };
}


export async function getUserProfile(userOrUid) {
  const uid = typeof userOrUid === "string"
    ? userOrUid.trim()
    : (userOrUid?.uid || "").toString().trim();
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

export async function getUserRegistrationState(userOrUid) {
  const profile = await getUserProfile(userOrUid);
  if (!profile) return { allowed: false, reason: "missing_profile" };
  return {
    allowed: true,
    reason: "ok",
    profile
  };
}

async function redeemCodeForUser(user, regCode) {
  const response = await redeemCodeCallable({
    code: (regCode || "").toString().trim().toUpperCase(),
    displayName: user?.displayName || "",
    photoURL: user?.photoURL || ""
  });
  return response?.data || { ok: false };
}

export async function registerWithGoogle(regCode) {
  const code = (regCode || "").toString().trim().toUpperCase();
  if (!code) return { ok: false };

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  const user = result.user;
  if (!user) return { ok: false };

  return redeemCodeForUser(user, code);
}

export async function completeCurrentUserRegistration(regCode) {
  const code = (regCode || "").toString().trim().toUpperCase();
  const user = auth.currentUser;
  if (!user || !code) return { ok: false };

  return redeemCodeForUser(user, code);
}

export async function registerWithEmail(regCode, email, password, displayName) {
  const code = (regCode || "").toString().trim().toUpperCase();
  const em = (email || "").toString().trim();
  const pw = (password || "").toString();

  if (!code || !em || !pw) return { ok: false };

  const cred = await createUserWithEmailAndPassword(auth, em, pw);

  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName: displayName.toString().trim() });
  }

  return redeemCodeForUser(cred.user, code);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return buildLoginResult(result.user);
}

export async function loginWithEmail(email, password) {
  const em = (email || "").toString().trim();
  const pw = (password || "").toString();
  const cred = await signInWithEmailAndPassword(auth, em, pw);
  if (!cred.user) return { ok: false };
  const registration = await getUserRegistrationState(cred.user);
  return {
    ok: registration.allowed,
    uid: cred.user.uid,
    needsRegistration: !registration.allowed,
    registrationReason: registration.reason || ""
  };
}

export async function sendPasswordReset(email) {
  const em = (email || "").toString().trim();
  if (!em) return { ok: false };
  await sendPasswordResetEmail(auth, em);
  return { ok: true };
}
