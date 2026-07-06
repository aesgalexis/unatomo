import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {randomUUID} from "node:crypto";
import QRCode from "qrcode";
import {generateRegistrationCode} from "../core/codes";
import {assertControlPanelAccess} from "../core/auth";
import {
  accountDirectoryCol,
  db,
  machineAccessCol,
  machinesCol,
  storageBucket,
  tagsCol,
} from "../core/firebase";
import {
  buildStorageDownloadUrl,
  deleteStorageFileIfExists,
} from "../core/storage";
import {
  assertAccountStorageAvailable,
  getStorageObjectSize,
  toSafeStorageSize,
} from "../core/storageQuota";
import {
  assertRegisteredAccount,
  getManagedMachineForAuth,
} from "./access";

const PUBLIC_SITE_ORIGIN = "https://unatomo.com";
const QR_CANVAS_SIZE = 100;
const generateTagChunk = () => generateRegistrationCode(4);
const generateTagId = () => `G-${generateTagChunk()}-${generateTagChunk()}`;
const normalizeLang = (value: string) =>
  (value || "").toString().trim().toLowerCase() === "en" ? "en" : "es";

const buildMachineTagUrl = (tagId: string, lang = "es") =>
  `${PUBLIC_SITE_ORIGIN}/nfc/${normalizeLang(
    lang,
  )}/m.html?tag=${encodeURIComponent(tagId)}`;

export const createMachineTagToken = onCall(async (request) => {
  const auth = request.auth;
  await assertRegisteredAccount(auth);
  const machineId = (request.data?.machineId || "").toString().trim();
  const {ownerUid} = await getManagedMachineForAuth(auth, machineId);
  await assertAccountStorageAvailable(ownerUid);

  let tagId = "";
  for (let tries = 0; tries < 10; tries += 1) {
    const candidate = generateTagId();
    const snap = await tagsCol().doc(candidate).get();
    if (!snap.exists) {
      tagId = candidate;
      break;
    }
  }
  if (!tagId) {
    throw new HttpsError("resource-exhausted", "tag-generate-failed");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await tagsCol().doc(tagId).set({
    state: "available",
    tenantId: ownerUid,
    machineId: null,
    createdAt: now,
    createdBy: auth?.uid || ownerUid,
  });

  return {ok: true, tagId};
});

export const assignMachineTag = onCall(async (request) => {
  const auth = request.auth;
  await assertRegisteredAccount(auth);
  const machineId = (request.data?.machineId || "").toString().trim();
  const tagId = (request.data?.tagId || "").toString().trim();
  const requestedLang = (request.data?.lang || "").toString().trim();
  if (!tagId) throw new HttpsError("invalid-argument", "tagId-required");

  const {machineRef, machine, ownerUid} = await getManagedMachineForAuth(
    auth,
    machineId,
  );
  const tagRef = tagsCol().doc(tagId);
  const tagSnap = await tagRef.get();
  if (!tagSnap.exists) {
    throw new HttpsError("not-found", "tag-not-found");
  }
  const tag = tagSnap.data() || {};
  const tagTenantId = (tag.tenantId || "").toString().trim();
  const tagMachineId = (tag.machineId || "").toString().trim();
  if (tagTenantId && tagTenantId !== ownerUid) {
    throw new HttpsError("permission-denied", "tag-owned-by-other-account");
  }
  if (tagMachineId && tagMachineId !== machineId) {
    throw new HttpsError("failed-precondition", "tag-already-assigned");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const tagUrl = buildMachineTagUrl(tagId, requestedLang);
  await Promise.all([
    machineRef.set(
      {
        tagId,
        tagUrl,
        tagQrUrl: "",
        tagQrPath: "",
        tagQrSize: 0,
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
    tagRef.set(
      {
        state: "assigned",
        tenantId: ownerUid,
        machineId,
        url: tagUrl,
        assignedAt: now,
        assignedBy: auth?.uid || ownerUid,
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
    machineAccessCol().doc(tagId).set(
      {
        tenantId: ownerUid,
        machineId,
        title: machine.title || "",
        brand: machine.brand || "",
        model: machine.model || "",
        serial: machine.serial || "",
        year: machine.year ?? null,
        location: machine.location || "",
        status: machine.status || "",
        logs: Array.isArray(machine.logs) ? machine.logs : [],
        tasks: Array.isArray(machine.tasks) ? machine.tasks : [],
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
  ]);

  return {ok: true, tagId, tagUrl};
});


export const generateMachineTagQr = onCall(async (request) => {
  const auth = request.auth;
  await assertRegisteredAccount(auth);
  const machineId = (request.data?.machineId || "").toString().trim();
  const requestedLang = (request.data?.lang || "").toString().trim();
  const {machineRef, machine, ownerUid} = await getManagedMachineForAuth(
    auth,
    machineId,
  );
  const tagId = (machine.tagId || "").toString().trim();
  const previousQrPath = (machine.tagQrPath || "").toString().trim();
  if (!tagId) {
    throw new HttpsError("failed-precondition", "tag-not-connected");
  }

  const tagSnap = await tagsCol().doc(tagId).get();
  if (!tagSnap.exists) {
    throw new HttpsError("not-found", "tag-not-found");
  }
  const tag = tagSnap.data() || {};
  const tagTenantId = (tag.tenantId || "").toString().trim();
  const tagMachineId = (tag.machineId || "").toString().trim();
  if (tagTenantId && tagTenantId !== ownerUid) {
    throw new HttpsError("permission-denied", "tag-owned-by-other-account");
  }
  if (tagMachineId && tagMachineId !== machineId) {
    throw new HttpsError(
      "failed-precondition",
      "tag-assigned-to-other-machine",
    );
  }

  const tagUrl = buildMachineTagUrl(tagId, requestedLang);

  const qrPng = await QRCode.toBuffer(tagUrl, {
    type: "png",
    width: QR_CANVAS_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  const qrPath = `tag-qrs/${tagId}.png`;
  const downloadToken = randomUUID();
  const previousQrBytes =
    toSafeStorageSize(machine.tagQrSize || machine.qrSize) ||
    (await getStorageObjectSize(previousQrPath));
  await assertAccountStorageAvailable(
    ownerUid,
    Math.max(0, qrPng.length - previousQrBytes),
  );
  await storageBucket.file(qrPath).save(qrPng, {
    resumable: false,
    contentType: "image/png",
    metadata: {
      cacheControl: "private, max-age=31536000",
      contentDisposition: `attachment; filename="${tagId}.png"`,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });
  if (previousQrPath && previousQrPath !== qrPath) {
    await deleteStorageFileIfExists(previousQrPath);
  }
  const qrUrl = buildStorageDownloadUrl(qrPath, downloadToken);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await Promise.all([
    machineRef.set(
      {
        tagUrl,
        tagQrUrl: qrUrl,
        tagQrPath: qrPath,
        tagQrSize: qrPng.length,
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
    tagsCol().doc(tagId).set(
      {
        tenantId: ownerUid,
        machineId,
        qrUrl,
        qrPath,
        qrSize: qrPng.length,
        url: tagUrl,
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
  ]);

  return {ok: true, tagId, tagUrl, qrUrl, qrPath, qrSize: qrPng.length};
});

export const disconnectMachineTag = onCall(async (request) => {
  const auth = request.auth;
  await assertRegisteredAccount(auth);
  const machineId = (request.data?.machineId || "").toString().trim();
  const {machineRef, machine, ownerUid} = await getManagedMachineForAuth(
    auth,
    machineId,
  );
  const tagId = (machine.tagId || "").toString().trim();
  const qrPath = (machine.tagQrPath || "").toString().trim();

  if (!tagId) {
    await machineRef.set(
      {
        tagId: null,
        tagUrl: "",
        tagQrUrl: "",
        tagQrPath: "",
        tagQrSize: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    );
    return {ok: true, machineId, tagId: ""};
  }

  await deleteStorageFileIfExists(qrPath);

  const now = admin.firestore.FieldValue.serverTimestamp();
  await Promise.all([
    machineRef.set(
      {
        tagId: null,
        tagUrl: "",
        tagQrUrl: "",
        tagQrPath: "",
        tagQrSize: 0,
        updatedAt: now,
        updatedBy: auth?.uid || ownerUid,
      },
      {merge: true},
    ),
    tagsCol().doc(tagId).delete().catch(() => undefined),
    machineAccessCol().doc(tagId).delete().catch(() => undefined),
  ]);

  return {ok: true, machineId, tagId};
});

export const listControlPanelTags = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const [tagsSnap, machinesSnap, machineAccessSnap, directorySnap, usersSnap] =
    await Promise.all([
      tagsCol().orderBy("createdAt", "desc").limit(1000).get(),
      machinesCol().limit(1000).get(),
      db.collection("machine_access").limit(1000).get(),
      accountDirectoryCol().limit(1000).get(),
      db.collection("users").limit(1000).get(),
    ]);

  const machineById = new Map<string, FirebaseFirestore.DocumentData>();
  machinesSnap.forEach((docSnap) => {
    machineById.set(docSnap.id, docSnap.data() || {});
  });

  const accessByTagId = new Map<string, FirebaseFirestore.DocumentData>();
  machineAccessSnap.forEach((docSnap) => {
    accessByTagId.set(docSnap.id, docSnap.data() || {});
  });

  const usersByUid = new Map<string, {
    email: string;
    displayName: string;
  }>();
  const upsertUser = (raw: {
    uid?: unknown;
    email?: unknown;
    displayName?: unknown;
  }) => {
    const uid = (raw.uid || "").toString().trim();
    if (!uid) return;
    const current = usersByUid.get(uid);
    usersByUid.set(uid, {
      email: (raw.email || "").toString().trim() || current?.email || "",
      displayName:
        (raw.displayName || "").toString().trim() || current?.displayName || "",
    });
  };
  directorySnap.forEach((docSnap) => upsertUser(docSnap.data() || {}));
  usersSnap.forEach((docSnap) => upsertUser(docSnap.data() || {}));

  const items = tagsSnap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    const tagId = docSnap.id;
    const machineId = (data.machineId || "").toString().trim();
    const access = accessByTagId.get(tagId) || {};
    const machine = machineId ? (machineById.get(machineId) || {}) : {};
    const tenantUid = (data.tenantId || machine.ownerUid || "")
      .toString()
      .trim();
    const tenantUser = tenantUid ? usersByUid.get(tenantUid) : null;
    const createdByUid = (data.createdBy || "").toString().trim();
    const createdByUser = createdByUid ? usersByUid.get(createdByUid) : null;
    const assignedByUid = (data.assignedBy || "").toString().trim();
    const assignedByUser = assignedByUid ? usersByUid.get(assignedByUid) : null;
    const machineTitle =
      (access.title || machine.title || "").toString().trim() || "";

    return {
      tagId,
      state: (data.state || "").toString().trim() || "unknown",
      machineId,
      machineTitle,
      urlPath: `/nfc/es/m.html?tag=${encodeURIComponent(tagId)}`,
      tenantUid,
      tenantEmail: tenantUser?.email || "",
      tenantDisplayName: tenantUser?.displayName || "",
      createdByUid,
      createdByEmail: createdByUser?.email || "",
      createdByDisplayName: createdByUser?.displayName || "",
      assignedByUid,
      assignedByEmail: assignedByUser?.email || "",
      assignedByDisplayName: assignedByUser?.displayName || "",
      createdAt: data.createdAt || null,
      assignedAt: data.assignedAt || null,
      updatedAt: access.updatedAt || null,
    };
  });

  return {ok: true, items};
});
