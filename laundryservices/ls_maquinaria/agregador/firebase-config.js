import { app, auth, db, loginWithGoogle } from "/static/js/registro/firebase-init.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

export const ADMIN_EMAIL = "aesg.alexis@gmail.com";

export { app, auth, db, loginWithGoogle };

export const storage = getStorage(app);

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const isAdminUser = (user) => normalizeEmail(user?.email) === ADMIN_EMAIL;
