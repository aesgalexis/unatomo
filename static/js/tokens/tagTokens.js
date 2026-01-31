import { db } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const randomChunk = () =>
  Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();

const buildTagId = () => `G-${randomChunk()}-${randomChunk()}`;

export const createTagToken = async (uid) => {
  if (!uid) throw new Error("missing-uid");
  let attempts = 0;
  while (attempts < 5) {
    attempts += 1;
    const tagId = buildTagId();
    const ref = doc(db, "tags", tagId);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      state: "available",
      tenantId: uid,
      machineId: null,
      createdAt: serverTimestamp(),
      createdBy: uid
    });
    return tagId;
  }
  throw new Error("tag-generate-failed");
};
