import { app, auth, db, loginWithGoogle } from "/static/js/registro/firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const ADMIN_CLAIM = "laundryServicesAdmin";
const adminClaimCache = new Map();

export { app, auth, db, loginWithGoogle };

export const storage = getStorage(app);

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const resolveAdminUser = async (user, forceRefresh = false) => {
  const uid = user?.uid || "";
  if (!uid) return false;
  try {
    const token = await getIdTokenResult(user, forceRefresh);
    const isAdmin = token?.claims?.[ADMIN_CLAIM] === true;
    adminClaimCache.set(uid, isAdmin);
    return isAdmin;
  } catch {
    adminClaimCache.set(uid, false);
    return false;
  }
};

export const isAdminUser = (user) => adminClaimCache.get(user?.uid || "") === true;
