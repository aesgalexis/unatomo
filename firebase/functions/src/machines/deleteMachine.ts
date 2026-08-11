import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  invitesCol,
  linksCol,
  machineAccessCol,
  machinesCol,
  tagsCol,
  transferInvitesCol,
} from "../core/firebase";
import {deleteStorageFileIfExists} from "../core/storage";

const collectDocumentStoragePaths = (
  value: unknown,
  allowedPrefix: string,
  paths: Set<string>,
) => {
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectDocumentStoragePaths(item, allowedPrefix, paths),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (key === "storagePath" && typeof item === "string") {
      const path = item.trim();
      if (path.startsWith(allowedPrefix)) paths.add(path);
      return;
    }
    collectDocumentStoragePaths(item, allowedPrefix, paths);
  });
};

const addRefs = (
  target: Map<string, FirebaseFirestore.DocumentReference>,
  refs: FirebaseFirestore.DocumentReference[],
) => {
  refs.forEach((ref) => target.set(ref.path, ref));
};

const deleteRefsInBatches = async (
  refs: Map<string, FirebaseFirestore.DocumentReference>,
) => {
  const pending = Array.from(refs.values());
  for (let index = 0; index < pending.length; index += 400) {
    const batch = db.batch();
    pending.slice(index, index + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

export const deleteMachine = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const machineId = (request.data?.machineId || "").toString().trim();
  if (!machineId) {
    throw new HttpsError("invalid-argument", "machine-id-required");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  const ownerUid = (machine.ownerUid || "").toString().trim();
  if (!ownerUid || ownerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "owner-required");
  }

  const declaredTagId = (machine.tagId || "").toString().trim();
  const [
    tagsSnap,
    reservedTagsSnap,
    accessSnap,
    linksSnap,
    invitesSnap,
    transfersSnap,
    declaredTagSnap,
    declaredAccessSnap,
    sessionsSnap,
  ] = await Promise.all([
    tagsCol().where("machineId", "==", machineId).get(),
    tagsCol().where("reservedForMachineId", "==", machineId).get(),
    machineAccessCol().where("machineId", "==", machineId).get(),
    linksCol().where("machineId", "==", machineId).get(),
    invitesCol().where("machineId", "==", machineId).get(),
    transferInvitesCol().where("machineId", "==", machineId).get(),
    declaredTagId ? tagsCol().doc(declaredTagId).get() : Promise.resolve(null),
    declaredTagId ?
      machineAccessCol().doc(declaredTagId).get() :
      Promise.resolve(null),
    db.collection("machine_access_sessions")
      .where("machineId", "==", machineId)
      .get(),
  ]);

  const refs = new Map<string, FirebaseFirestore.DocumentReference>();
  const legacyMachineRef = db.collection("tenants")
    .doc(ownerUid)
    .collection("machines")
    .doc(machineId);
  addRefs(refs, [
    machineRef,
    legacyMachineRef,
    ...tagsSnap.docs.map((docSnap) => docSnap.ref),
    ...reservedTagsSnap.docs.map((docSnap) => docSnap.ref),
    ...accessSnap.docs.map((docSnap) => docSnap.ref),
    ...linksSnap.docs.map((docSnap) => docSnap.ref),
    ...invitesSnap.docs.map((docSnap) => docSnap.ref),
    ...transfersSnap.docs.map((docSnap) => docSnap.ref),
    ...sessionsSnap.docs.map((docSnap) => docSnap.ref),
  ]);

  const associatedTagIds = new Set([
    ...tagsSnap.docs.map((docSnap) => docSnap.id),
    ...reservedTagsSnap.docs.map((docSnap) => docSnap.id),
  ]);
  associatedTagIds.forEach((tagId) => {
    const ref = machineAccessCol().doc(tagId);
    refs.set(ref.path, ref);
  });
  if (declaredTagSnap?.exists) {
    const linkedMachineId = (
      declaredTagSnap.data()?.machineId || ""
    ).toString().trim();
    if (!linkedMachineId || linkedMachineId === machineId) {
      associatedTagIds.add(declaredTagId);
      refs.set(declaredTagSnap.ref.path, declaredTagSnap.ref);
    }
  }
  if (declaredAccessSnap?.exists) {
    const linkedMachineId = (
      declaredAccessSnap.data()?.machineId || ""
    ).toString().trim();
    if (!linkedMachineId || linkedMachineId === machineId) {
      associatedTagIds.add(declaredTagId);
      refs.set(declaredAccessSnap.ref.path, declaredAccessSnap.ref);
    }
  }

  const storagePaths = new Set<string>();
  const documentPrefix = `machine-docs/${ownerUid}/${machineId}/`;
  collectDocumentStoragePaths(machine.documents, documentPrefix, storagePaths);
  const declaredQrPath = (machine.tagQrPath || "").toString().trim();
  if (declaredQrPath.startsWith("tag-qrs/")) storagePaths.add(declaredQrPath);
  tagsSnap.docs.forEach((docSnap) => {
    const qrPath = (docSnap.data()?.qrPath || "").toString().trim();
    if (qrPath.startsWith("tag-qrs/")) storagePaths.add(qrPath);
  });
  reservedTagsSnap.docs.forEach((docSnap) => {
    const qrPath = (docSnap.data()?.qrPath || "").toString().trim();
    if (qrPath.startsWith("tag-qrs/")) storagePaths.add(qrPath);
  });
  if (declaredTagSnap?.exists) {
    const qrPath = (declaredTagSnap.data()?.qrPath || "").toString().trim();
    if (qrPath.startsWith("tag-qrs/")) storagePaths.add(qrPath);
  }
  associatedTagIds.forEach((tagId) => storagePaths.add(`tag-qrs/${tagId}.png`));

  await deleteRefsInBatches(refs);
  const layoutUids = new Set<string>([ownerUid]);
  linksSnap.docs.forEach((docSnap) => {
    const adminUid = (docSnap.data()?.adminUid || "").toString().trim();
    if (adminUid) layoutUids.add(adminUid);
  });
  await Promise.all(Array.from(layoutUids).map((uid) =>
    db.collection("dashboard_layout").doc(uid).set({
      placements: {
        [machineId]: admin.firestore.FieldValue.delete(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    }, {merge: true}),
  ));
  await Promise.all(
    Array.from(storagePaths).map((path) => deleteStorageFileIfExists(path)),
  );

  return {
    ok: true,
    machineId,
    deletedDocuments: refs.size,
    deletedStorageObjects: storagePaths.size,
  };
});
