import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";

const preferencesDoc = (uid) => doc(db, "user_notification_preferences", uid);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  email: Object.freeze({
    enabled: false,
    events: Object.freeze({
      machineOutOfService: true,
      machineOperationalAgain: true
    })
  })
});

export const normalizeNotificationPreferences = (value) => ({
  email: {
    enabled: value?.email?.enabled === true,
    events: {
      machineOutOfService: value?.email?.events?.machineOutOfService !== false,
      machineOperationalAgain: value?.email?.events?.machineOperationalAgain !== false
    }
  }
});

export const fetchNotificationPreferences = async (uid) => {
  if (!uid) return normalizeNotificationPreferences();
  const snapshot = await getDoc(preferencesDoc(uid));
  return normalizeNotificationPreferences(snapshot.exists() ? snapshot.data() : null);
};

export const saveNotificationPreferences = async (uid, preferences) => {
  if (!uid) return;
  await setDoc(preferencesDoc(uid), {
    ...normalizeNotificationPreferences(preferences),
    schemaVersion: 1,
    updatedAt: serverTimestamp()
  }, { merge: true });
};
