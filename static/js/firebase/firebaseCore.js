import {
  getApp,
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";

const runtimeConfig = window.__UNATOMO_CONFIG__ || {};
const firebaseConfig = {
  apiKey: runtimeConfig.FIREBASE_API_KEY || "",
  authDomain: runtimeConfig.FIREBASE_AUTH_DOMAIN || "",
  projectId: runtimeConfig.FIREBASE_PROJECT_ID || "",
  storageBucket: runtimeConfig.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: runtimeConfig.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: runtimeConfig.FIREBASE_APP_ID || "",
  measurementId: runtimeConfig.FIREBASE_MEASUREMENT_ID || "",
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase config missing. Revisa runtime-config.js o .env.local.");
  throw new Error("Missing Firebase config");
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const appCheckSiteKey = runtimeConfig.FIREBASE_APP_CHECK_SITE_KEY || "";
const appCheckDebugToken = runtimeConfig.FIREBASE_APP_CHECK_DEBUG_TOKEN || "";
if (appCheckDebugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;

let initializedAppCheck = null;
if (appCheckSiteKey) {
  try {
    initializedAppCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("Firebase App Check no se pudo inicializar.", error);
  }
}

export const appCheck = initializedAppCheck;
