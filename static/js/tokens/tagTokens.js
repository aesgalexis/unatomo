import { db, functions } from "/static/js/firebase/firebaseApp.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createMachineTagTokenCallable = httpsCallable(functions, "createMachineTagToken");

const TAG_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomChunk = () => {
  let value = "";
  for (let index = 0; index < 4; index += 1) {
    value += TAG_ALPHABET[Math.floor(Math.random() * TAG_ALPHABET.length)];
  }
  return value;
};

const buildTagId = () => `G-${randomChunk()}-${randomChunk()}`;

const createTagTokenInFirestore = async (uid) => {
  if (!uid) throw new Error("missing-uid");
  for (let attempts = 0; attempts < 5; attempts += 1) {
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

export const createTagToken = async (uid, machineId) => {
  if (!machineId) throw new Error("missing-machine-id");
  try {
    const response = await createMachineTagTokenCallable({ machineId });
    const tagId = (response?.data?.tagId || "").toString().trim();
    if (!tagId) throw new Error("tag-generate-failed");
    return tagId;
  } catch (error) {
    const code = (error?.code || "").toString();
    const message = (error?.message || "").toString();
    if (code.includes("resource-exhausted") || message.includes("storage-full")) {
      throw new Error("storage-full");
    }
    if (
      code.includes("functions/not-found") ||
      code.includes("functions/unimplemented") ||
      code.includes("not-found") ||
      code.includes("unimplemented") ||
      code.includes("functions/permission-denied")
    ) {
      return createTagTokenInFirestore(uid);
    }
    throw error;
  }
};
