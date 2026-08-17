import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";

const toMillis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const subscribeUserNotifications = (uid, onChange, onError) => {
  const notificationsQuery = query(
    collection(db, "user_notifications"),
    where("recipientUid", "==", uid)
  );
  return onSnapshot(notificationsQuery, (snap) => {
    const items = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    onChange(items);
  }, onError);
};

export const markUserNotificationsRead = async (items = []) => {
  const unread = items.filter((item) => item?.id && !item.readAt);
  await Promise.all(unread.map((item) =>
    updateDoc(doc(db, "user_notifications", item.id), { readAt: serverTimestamp() })
  ));
};
