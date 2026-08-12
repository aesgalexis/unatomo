import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

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
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.warn("Firebase local auth persistence unavailable.", error);
  });
export const storage = getStorage(app);
export const functions = getFunctions(app);
const validateCodeCallable = httpsCallable(functions, "validateRegistrationCode");
const redeemCodeCallable = httpsCallable(functions, "redeemRegistrationCode");
const passwordResetCallable = httpsCallable(
  functions,
  "requestAccountPasswordReset"
);

const buildAuthResult = (user) => ({
  ok: !!user,
  user: user || null,
  uid: user?.uid || ""
});

let pendingRegistrationCheck = null;
let pendingRegistrationUid = "";
let verifiedRegistrationState = null;
let verifiedRegistrationUid = "";

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

export function getUserRegistrationState(userOrUid) {
  const uid = typeof userOrUid === "string"
    ? userOrUid.trim()
    : (userOrUid?.uid || "").toString().trim();
  if (!uid) return Promise.resolve({ allowed: false, reason: "missing_user" });
  if (verifiedRegistrationState && verifiedRegistrationUid === uid) {
    return Promise.resolve(verifiedRegistrationState);
  }
  if (pendingRegistrationCheck && pendingRegistrationUid === uid) {
    return pendingRegistrationCheck;
  }

  pendingRegistrationUid = uid;
  pendingRegistrationCheck = getUserProfile(uid)
    .then((profile) => {
      if (!profile) return { allowed: false, reason: "missing_profile" };
      const registration = {
        allowed: true,
        reason: "ok",
        profile
      };
      verifiedRegistrationUid = uid;
      verifiedRegistrationState = registration;
      return registration;
    })
    .finally(() => {
      if (pendingRegistrationUid !== uid) return;
      pendingRegistrationCheck = null;
      pendingRegistrationUid = "";
    });
  return pendingRegistrationCheck;
}

export function isAccountOnboardingRequired(registration) {
  return registration?.allowed === true &&
    registration.profile?.onboardingRequired === true &&
    !registration.profile?.onboardingCompletedAt;
}

const staleAuthSessionCodes = new Set([
  "auth/invalid-user-token",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/user-token-expired"
]);

export async function getUsableCurrentUser() {
  await authPersistenceReady;
  const user = auth.currentUser;
  if (!user) return null;

  try {
    await user.getIdToken(true);
    return user;
  } catch (error) {
    const code = (error?.code || "").toString();
    if (!staleAuthSessionCodes.has(code)) throw error;
    try { await signOut(auth); } catch {}
    return null;
  }
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

  await authPersistenceReady;
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

  await authPersistenceReady;
  const cred = await createUserWithEmailAndPassword(auth, em, pw);

  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName: displayName.toString().trim() });
  }

  return redeemCodeForUser(cred.user, code);
}

export async function loginWithGoogle() {
  await authPersistenceReady;
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return buildAuthResult(result.user);
}

export async function loginWithEmail(email, password) {
  await authPersistenceReady;
  const em = (email || "").toString().trim();
  const pw = (password || "").toString();
  const cred = await signInWithEmailAndPassword(auth, em, pw);
  return buildAuthResult(cred.user);
}

export async function sendPasswordReset(email, languageCode = "es") {
  const em = (email || "").toString().trim();
  if (!em) return { ok: false };

  const response = await passwordResetCallable({
    email: em,
    language: languageCode === "en" ? "en" : "es"
  });
  return response?.data || { ok: true };
}
