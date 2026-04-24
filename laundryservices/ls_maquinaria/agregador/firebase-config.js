import { app, auth, db, loginWithGoogle } from "/static/js/registro/firebase-init.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

export const ADMIN_EMAILS = new Set([
  "aesg.alexis@gmail.com",
  "alcalatriasmonica@gmail.com",
]);

export { app, auth, db, loginWithGoogle };

export const storage = getStorage(app);

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const isAdminUser = (user) => ADMIN_EMAILS.has(normalizeEmail(user?.email));
