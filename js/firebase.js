// ./js/firebase.js
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// 👇 tu config de Firebase (la que ya pegaste antes)
const firebaseConfig = {
  apiKey: "AIzaSyBwSla3hdkIIB9gmVfvv7c_0j90IDiCqVU",
  authDomain: "unatomo-f5537.firebaseapp.com",
  projectId: "unatomo-f5537",
  storageBucket: "unatomo-f5537.firebasestorage.app",
  messagingSenderId: "369796455601",
  appId: "1:369796455601:web:4a1c876d330a78584bd690",
  measurementId: "G-DLBTXQBYXC"
};

export const app = initializeApp(firebaseConfig);

// ✅ En desarrollo local, usa token de depuración de App Check
if (location.hostname === "localhost") {
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// ✅ Inicializa App Check con reCAPTCHA v3 (usa tu SITE KEY pública)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LfGMLorAAAAAGW3LUS1XRvgx6wdQ7eFMkGQ5Rrq"),
  isTokenAutoRefreshEnabled: true,
});
