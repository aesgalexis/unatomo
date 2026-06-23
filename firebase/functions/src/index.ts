/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at
 * https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {createHash, randomUUID} from "node:crypto";
import QRCode from "qrcode";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

admin.initializeApp();
const db = admin.firestore();

const normalizeEmail = (email: string) =>
  (email || "").toString().trim().toLowerCase();
const CONTROL_PANEL_EMAIL_HASH =
  "361be737851cc08e4a603606a25f7dc0649d8d75823f9e6244df97f14fd5ebd5";
const PUBLIC_SITE_ORIGIN = "https://unatomo.com";
const QR_CANVAS_SIZE = 100;

const hashEmail = (email: string) =>
  createHash("sha256").update(normalizeEmail(email)).digest("hex");

const assertControlPanelAccess = (auth: {
  token?: {email?: string | null};
} | null | undefined) => {
  if (!isControlPanelAuth(auth)) {
    throw new HttpsError("permission-denied", "not-allowed");
  }
};

const machinesCol = () => db.collection("machines");
const invitesCol = () => db.collection("admin_machine_invites");
const linksCol = () => db.collection("admin_machine_links");
const transferInvitesCol = () => db.collection("machine_transfer_invites");
const accountDirectoryCol = () => db.collection("account_directory");
const registrationCodesCol = () => db.collection("registration_codes");
const tagsCol = () => db.collection("tags");
const machineAccessCol = () => db.collection("machine_access");
const dashboardSuggestionsCol = () => db.collection("dashboard_suggestions");
const dashboardTodosCol = () => db.collection("dashboard_todos");
const accountHandlesCol = () => db.collection("account_handles");
const storageBucket = admin.storage().bucket();
const ACCOUNT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const QR_FALLBACK_BYTES = 4 * 1024;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCOUNT_HANDLE_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;
const RESERVED_ACCOUNT_HANDLES = new Set([
  "admin",
  "administrador",
  "administrator",
  "api",
  "nfc",
  "root",
  "sistema",
  "soporte",
  "support",
  "system",
  "todo",
  "unatomo",
  "www",
]);

const normalizeAccountHandle = (value: unknown) =>
  (value || "").toString().trim().replace(/^@+/, "").toLowerCase();

const getAccountHandleValidationError = (handle: string) => {
  if (!ACCOUNT_HANDLE_PATTERN.test(handle) || /[._-]{2}/.test(handle)) {
    return "handle-invalid";
  }
  if (RESERVED_ACCOUNT_HANDLES.has(handle)) return "handle-reserved";
  return "";
};

const toSafeStorageSize = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getMachineDocumentsStorageBytes = (
  machine: FirebaseFirestore.DocumentData,
) => {
  const documents = machine.documents;
  if (!documents || typeof documents !== "object" || Array.isArray(documents)) {
    return 0;
  }
  return Object.values(documents as Record<string, unknown>).reduce(
    (total: number, docData: unknown) => {
      if (Array.isArray(docData)) {
        return docData.reduce(
          (sum: number, item: unknown) =>
            sum + toSafeStorageSize((item as {size?: unknown})?.size),
          total,
        );
      }
      return total + toSafeStorageSize(
        (docData as {size?: unknown})?.size,
      );
    },
    0,
  );
};

const getStorageObjectSize = async (path: string) => {
  const safePath = (path || "").toString().trim();
  if (!safePath) return 0;
  try {
    const [metadata] = await storageBucket.file(safePath).getMetadata();
    return toSafeStorageSize(metadata.size);
  } catch {
    return 0;
  }
};

const getMachineQrStorageBytes = async (
  machine: FirebaseFirestore.DocumentData,
) => {
  const storedSize = toSafeStorageSize(machine.tagQrSize || machine.qrSize);
  if (storedSize) return storedSize;
  const qrPath = (machine.tagQrPath || machine.qrPath || "").toString().trim();
  const pathSize = await getStorageObjectSize(qrPath);
  if (pathSize) return pathSize;
  const hasQr = !!(
    (machine.tagQrUrl || machine.qrUrl || qrPath || "").toString().trim()
  );
  return hasQr ? QR_FALLBACK_BYTES : 0;
};

const getAccountStorageUsageBytes = async (ownerUid: string) => {
  const safeOwnerUid = (ownerUid || "").toString().trim();
  if (!safeOwnerUid) return 0;
  const snap = await machinesCol().where("ownerUid", "==", safeOwnerUid).get();
  const sizes: number[] = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const machine = (docSnap.data() || {}) as FirebaseFirestore.DocumentData;
      return (
        getMachineDocumentsStorageBytes(machine) +
        (await getMachineQrStorageBytes(machine))
      );
    }),
  );
  return sizes.reduce((total: number, size: number) => total + size, 0);
};

const assertAccountStorageAvailable = async (
  ownerUid: string,
  additionalBytes = 0,
) => {
  const usageBytes = await getAccountStorageUsageBytes(ownerUid);
  const requestedBytes = Math.max(0, toSafeStorageSize(additionalBytes));
  if (usageBytes + requestedBytes >= ACCOUNT_STORAGE_LIMIT_BYTES) {
    throw new HttpsError("resource-exhausted", "storage-full");
  }
  return usageBytes;
};

const generateRegistrationCode = (length = 8) => {
  let value = "";
  for (let idx = 0; idx < length; idx += 1) {
    const next = Math.floor(Math.random() * CODE_ALPHABET.length);
    value += CODE_ALPHABET[next];
  }
  return value;
};

const generateTagChunk = () => generateRegistrationCode(4);
const generateTagId = () => `G-${generateTagChunk()}-${generateTagChunk()}`;

const normalizeRegistrationCode = (value: string) =>
  (value || "").toString().trim().toUpperCase();
const normalizeLang = (value: string) =>
  (value || "").toString().trim().toLowerCase() === "en" ? "en" : "es";

const isControlPanelAuth = (auth: {
  token?: {email?: string | null};
} | null | undefined) => {
  const email = (auth?.token?.email || "").toString();
  return !!email && hashEmail(email) === CONTROL_PANEL_EMAIL_HASH;
};

type DashboardGroupLayoutEntry = {
  id: string;
  title: string;
  parentGroupId: string;
  order: number;
  collapsed: boolean;
};

const normalizeDashboardGroupLayoutInput = (
  rawGroups: unknown,
  rawPlacements: unknown,
) => {
  if (!Array.isArray(rawGroups) || rawGroups.length > 500) {
    throw new HttpsError("invalid-argument", "invalid-groups");
  }
  const groups: DashboardGroupLayoutEntry[] = rawGroups.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpsError("invalid-argument", "invalid-group");
    }
    const raw = value as Record<string, unknown>;
    const id = (raw.id || "").toString().trim().slice(0, 128);
    const title = (raw.title || "Grupo").toString().trim().slice(0, 40);
    const parentGroupId = (raw.parentGroupId || "")
      .toString()
      .trim()
      .slice(0, 128);
    const rawOrder = Number(raw.order);
    if (!id || !Number.isFinite(rawOrder)) {
      throw new HttpsError("invalid-argument", "invalid-group");
    }
    return {
      id,
      title: title || "Grupo",
      parentGroupId,
      order: rawOrder,
      collapsed: raw.collapsed === true,
    };
  });
  const groupById = new Map(groups.map((group) => [group.id, group]));
  if (groupById.size !== groups.length) {
    throw new HttpsError("invalid-argument", "duplicate-group-id");
  }
  groups.forEach((group) => {
    const seen = new Set([group.id]);
    let parentGroupId = group.parentGroupId;
    let depth = 0;
    while (parentGroupId) {
      if (seen.has(parentGroupId)) {
        throw new HttpsError("invalid-argument", "group-cycle");
      }
      const parent = groupById.get(parentGroupId);
      if (!parent) {
        throw new HttpsError("invalid-argument", "missing-parent-group");
      }
      seen.add(parentGroupId);
      depth += 1;
      if (depth > 2) {
        throw new HttpsError("invalid-argument", "group-depth-exceeded");
      }
      parentGroupId = parent.parentGroupId;
    }
  });

  if (
    !rawPlacements ||
    typeof rawPlacements !== "object" ||
    Array.isArray(rawPlacements)
  ) {
    throw new HttpsError("invalid-argument", "invalid-placements");
  }
  const placementEntries = Object.entries(
    rawPlacements as Record<string, unknown>,
  );
  if (placementEntries.length > 5000) {
    throw new HttpsError("invalid-argument", "invalid-placements");
  }
  const placements = Object.fromEntries(placementEntries.map(([id, value]) => {
    if (
      !id ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new HttpsError("invalid-argument", "invalid-placement");
    }
    const raw = value as Record<string, unknown>;
    const groupId = (raw.groupId || "").toString().trim().slice(0, 128);
    const order = Number(raw.order);
    if ((groupId && !groupById.has(groupId)) || !Number.isFinite(order)) {
      throw new HttpsError("invalid-argument", "invalid-placement");
    }
    return [id.slice(0, 128), {groupId, order}];
  }));
  return {groups, placements};
};

export const saveDashboardGroupLayout = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const layout = normalizeDashboardGroupLayoutInput(
    request.data?.groups,
    request.data?.placements,
  );
  await db.collection("dashboard_layout").doc(auth.uid).set(
    {
      ...layout,
      groupLayoutVersion: 2,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    {merge: true},
  );
  return {ok: true, groupLayoutVersion: 2};
});

const buildMachineTagUrl = (tagId: string, lang = "es") =>
  `${PUBLIC_SITE_ORIGIN}/nfc/${normalizeLang(
    lang,
  )}/m.html?tag=${encodeURIComponent(tagId)}`;

const buildStorageDownloadUrl = (path: string, token: string) => {
  const encodedPath = encodeURIComponent(path);
  return (
    `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}/o/` +
    `${encodedPath}?alt=media&token=${token}`
  );
};

const getFirebaseDownloadToken = (
  metadata: {metadata?: Record<string, unknown>} | undefined,
) => {
  const token = (metadata?.metadata?.firebaseStorageDownloadTokens || "")
    .toString()
    .split(",")[0]
    .trim();
  return token || randomUUID();
};

const copyStorageFileWithToken = async (
  oldPath: string,
  oldPrefix: string,
  newPrefix: string,
) => {
  const safeOldPath = (oldPath || "").toString().trim();
  if (!safeOldPath || !safeOldPath.startsWith(oldPrefix)) {
    return {path: safeOldPath, url: "", copied: false};
  }

  const newPath = `${newPrefix}${safeOldPath.slice(oldPrefix.length)}`;
  if (newPath === safeOldPath) {
    return {path: safeOldPath, url: "", copied: false};
  }

  const source = storageBucket.file(safeOldPath);
  const destination = storageBucket.file(newPath);
  const [metadata] = await source.getMetadata();
  const token = getFirebaseDownloadToken(metadata);
  await source.copy(destination);
  await destination.setMetadata({
    metadata: {
      ...(metadata.metadata || {}),
      firebaseStorageDownloadTokens: token,
    },
  });

  return {
    path: newPath,
    url: buildStorageDownloadUrl(newPath, token),
    copied: true,
    oldPath: safeOldPath,
  };
};

const rewriteMachineDocumentStorageRefs = async (
  value: unknown,
  oldPrefix: string,
  newPrefix: string,
  copiedPaths: Set<string>,
): Promise<unknown> => {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        rewriteMachineDocumentStorageRefs(
          item,
          oldPrefix,
          newPrefix,
          copiedPaths,
        ),
      ),
    );
  }

  if (!value || typeof value !== "object") return value;

  const current = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(current)) {
    next[key] = await rewriteMachineDocumentStorageRefs(
      item,
      oldPrefix,
      newPrefix,
      copiedPaths,
    );
  }

  const storagePath = (current.storagePath || "").toString().trim();
  if (storagePath && storagePath.startsWith(oldPrefix)) {
    const copied = await copyStorageFileWithToken(
      storagePath,
      oldPrefix,
      newPrefix,
    );
    if (copied.copied && copied.oldPath) copiedPaths.add(copied.oldPath);
    next.storagePath = copied.path;
    if (copied.url && typeof current.url === "string") {
      next.url = copied.url;
    }
    if (copied.url && typeof current.downloadUrl === "string") {
      next.downloadUrl = copied.url;
    }
  }

  return next;
};

const deleteStorageFileIfExists = async (path: string) => {
  const safePath = (path || "").toString().trim();
  if (!safePath) return;
  try {
    await storageBucket.file(safePath).delete({ignoreNotFound: true});
  } catch {
    // ignore storage cleanup failures
  }
};

const collectUniqueDocRefs = (
  target: Map<string, FirebaseFirestore.DocumentReference>,
  refs: Array<FirebaseFirestore.DocumentReference | null | undefined>,
) => {
  refs.forEach((ref) => {
    if (!ref) return;
    target.set(ref.path, ref);
  });
};

const deleteCollectedDocRefs = async (
  refs: Map<string, FirebaseFirestore.DocumentReference>,
) => {
  await Promise.allSettled(
    Array.from(refs.values()).map((ref) => ref.delete()),
  );
};

const assertRegisteredAccount = async (
  auth: {uid?: string | null} | null | undefined,
) => {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "auth-required");
  const userSnap = await db.collection("users").doc(auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "account-not-registered");
  }
};

const isAcceptedAdminOfMachine = async (
  uid: string,
  ownerUid: string,
  machineId: string,
) => {
  const linkSnap = await linksCol().doc(`${machineId}_${uid}`).get();
  if (!linkSnap.exists) return false;
  const link = linkSnap.data() || {};
  return (
    (link.adminUid || "").toString() === uid &&
    (link.ownerUid || "").toString() === ownerUid &&
    (link.status || "").toString() === "accepted"
  );
};

const getManagedMachineForAuth = async (
  auth: {uid?: string | null} | null | undefined,
  machineId: string,
) => {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "auth-required");
  const safeMachineId = (machineId || "").toString().trim();
  if (!safeMachineId) {
    throw new HttpsError("invalid-argument", "machineId-required");
  }
  const machineRef = machinesCol().doc(safeMachineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  const ownerUid = (machine.ownerUid || machine.tenantId || "")
    .toString()
    .trim();
  if (
    ownerUid !== auth.uid &&
    !(await isAcceptedAdminOfMachine(auth.uid, ownerUid, safeMachineId))
  ) {
    throw new HttpsError("permission-denied", "not-machine-manager");
  }
  return {machineRef, machine, ownerUid};
};


export const createAdminInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  const adminEmailRaw = (request.data?.adminEmail || "").toString();
  const adminEmailLower = normalizeEmail(adminEmailRaw);
  if (!machineId || !adminEmailLower) {
    throw new HttpsError("invalid-argument", "machineId/adminEmail required");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  if (machine.ownerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "not-owner");
  }
  const transferStatus = (machine.ownershipTransferStatus || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (transferStatus.startsWith("pendiente")) {
    throw new HttpsError(
      "failed-precondition",
      "ownership-transfer-pending",
    );
  }

  const inviteId = `${machineId}_${adminEmailLower}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ownerEmail = (auth.token.email || machine.ownerEmail || "").toString();
  await invitesCol().doc(inviteId).set(
    {
      ownerUid: auth.uid,
      ownerEmail,
      machineId,
      machineTitle: (machine.title || "").toString(),
      adminEmail: adminEmailRaw,
      adminEmailLower,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await machineRef.set(
    {
      adminEmail: adminEmailRaw,
      adminStatus: "Pendiente aceptación",
    },
    {merge: true},
  );

  return {ok: true, inviteId};
});

export const respondAdminInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const decision = (request.data?.decision || "").toString();
  if (!["accepted", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "decision-invalid");
  }
  const emailLower = normalizeEmail(auth.token.email || "");
  const inviteId =
    (request.data?.inviteId || "").toString().trim() ||
    `${(request.data?.machineId || "").toString().trim()}_${emailLower}`;
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId-required");

  const inviteRef = invitesCol().doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "invite-not-found");
  }
  const invite = inviteSnap.data() || {};
  if (
    !invite.adminEmailLower ||
    normalizeEmail(invite.adminEmailLower) !== emailLower
  ) {
    throw new HttpsError("permission-denied", "not-invitee");
  }
  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "invite-not-pending");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const machineRef = machinesCol().doc(invite.machineId);
  if (decision === "accepted") {
    const linkId = `${invite.machineId}_${auth.uid}`;
    await linksCol().doc(linkId).set(
      {
        ownerUid: invite.ownerUid,
        ownerEmail: invite.ownerEmail || "",
        machineId: invite.machineId,
        machineTitle: invite.machineTitle || "",
        adminUid: auth.uid,
        adminEmail: invite.adminEmail || "",
        adminEmailLower: invite.adminEmailLower,
        status: "accepted",
        createdAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
    await inviteRef.set(
      {
        status: "accepted",
        adminUid: auth.uid,
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
    await machineRef.set(
      {
        adminEmail: invite.adminEmail || "",
        adminStatus: `Administrado por ${invite.adminEmail || ""}`,
      },
      {merge: true},
    );
  } else {
    await inviteRef.set(
      {
        status: "rejected",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
    await machineRef.set(
      {
        adminEmail: "",
        adminStatus: `Invitación rechazada por ${invite.adminEmail || ""}`,
      },
      {merge: true},
    );
  }

  return {ok: true};
});

export const leaveAdminRole = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  if (!machineId) {
    throw new HttpsError("invalid-argument", "machineId-required");
  }

  const linkId = `${machineId}_${auth.uid}`;
  const linkRef = linksCol().doc(linkId);
  const linkSnap = await linkRef.get();
  if (!linkSnap.exists) {
    throw new HttpsError("not-found", "link-not-found");
  }
  const link = linkSnap.data() || {};
  if (link.adminUid !== auth.uid) {
    throw new HttpsError("permission-denied", "not-admin");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await linkRef.set(
    {
      status: "left",
      respondedAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  if (link.ownerUid && link.machineId) {
    const inviteId = `${link.machineId}_${
      normalizeEmail(link.adminEmail || "")
    }`;
    await invitesCol().doc(inviteId).set(
      {
        status: "left",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
    await machinesCol().doc(link.machineId).set(
      {
        adminEmail: "",
        adminStatus: "",
      },
      {merge: true},
    );
  }

  return {ok: true};
});

export const revokeAdminInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  const adminEmailRaw = (request.data?.adminEmail || "").toString();
  const adminEmailLower = normalizeEmail(adminEmailRaw);
  if (!machineId) {
    throw new HttpsError("invalid-argument", "machineId-required");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  if (machine.ownerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "not-owner");
  }
  const currentAdminEmail = (machine.adminEmail || "").toString().trim();
  if (currentAdminEmail) {
    throw new HttpsError("failed-precondition", "admin-already-assigned");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  if (adminEmailLower) {
    const inviteId = `${machineId}_${adminEmailLower}`;
    await invitesCol().doc(inviteId).set(
      {
        status: "left",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
  }

  const linkQuery = await linksCol()
    .where("machineId", "==", machineId)
    .where("ownerUid", "==", auth.uid)
    .get();
  linkQuery.forEach((docSnap) => {
    docSnap.ref.set(
      {
        status: "left",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
  });

  await machineRef.set(
    {
      adminEmail: "",
      adminStatus: "",
    },
    {merge: true},
  );

  return {ok: true};
});

export const ensureAdminLink = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const inviteId = (request.data?.inviteId || "").toString().trim();
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId-required");

  const emailLower = normalizeEmail(auth.token.email || "");
  const inviteRef = invitesCol().doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "invite-not-found");
  }
  const invite = inviteSnap.data() || {};
  if (
    !invite.adminEmailLower ||
    normalizeEmail(invite.adminEmailLower) !== emailLower
  ) {
    throw new HttpsError("permission-denied", "not-invitee");
  }
  if (invite.status !== "accepted") {
    return {ok: true, created: false};
  }
  const linkId = `${invite.machineId}_${auth.uid}`;
  const linkRef = linksCol().doc(linkId);
  const linkSnap = await linkRef.get();
  if (linkSnap.exists) {
    return {ok: true, created: false};
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await linkRef.set(
    {
      ownerUid: invite.ownerUid,
      ownerEmail: invite.ownerEmail || "",
      machineId: invite.machineId,
      machineTitle: invite.machineTitle || "",
      adminUid: auth.uid,
      adminEmail: invite.adminEmail || "",
      adminEmailLower: invite.adminEmailLower,
      status: "accepted",
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );
  return {ok: true, created: true};
});

export const createMachineTransferInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  const toEmailRaw = (request.data?.toEmail || "").toString().trim();
  const toEmailLower = normalizeEmail(toEmailRaw);
  if (!machineId || !toEmailLower) {
    throw new HttpsError("invalid-argument", "machineId/toEmail required");
  }

  const targetAccountSnap = await accountDirectoryCol().doc(toEmailLower).get();
  if (!targetAccountSnap.exists) {
    throw new HttpsError("not-found", "target-account-not-found");
  }
  const targetAccount = targetAccountSnap.data() || {};
  const toOwnerUid = (targetAccount.uid || "").toString().trim();
  const toOwnerEmail = (targetAccount.email || toEmailRaw).toString().trim();
  if (!toOwnerUid) {
    throw new HttpsError("failed-precondition", "target-account-incomplete");
  }
  if (toOwnerUid === auth.uid) {
    throw new HttpsError("failed-precondition", "same-owner");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  if (machine.ownerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "not-owner");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ownerEmail = (auth.token.email || machine.ownerEmail || "").toString();
  const inviteId = `${machineId}_${toOwnerUid}`;
  await transferInvitesCol().doc(inviteId).set(
    {
      fromOwnerUid: auth.uid,
      fromOwnerEmail: ownerEmail,
      toOwnerUid,
      toOwnerEmail,
      toOwnerEmailLower: toEmailLower,
      machineId,
      machineTitle: (machine.title || "").toString(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await machineRef.set(
    {
      ownershipTransferEmail: toOwnerEmail,
      ownershipTransferStatus: "Pendiente aceptaci\u00f3n",
      updatedAt: now,
      updatedBy: auth.uid,
    },
    {merge: true},
  );

  return {ok: true, inviteId};
});

export const respondMachineTransferInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const decision = (request.data?.decision || "").toString();
  if (!["accepted", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "decision-invalid");
  }
  const inviteId = (request.data?.inviteId || "").toString().trim();
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId-required");

  const inviteRef = transferInvitesCol().doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "transfer-invite-not-found");
  }
  const invite = inviteSnap.data() || {};
  if ((invite.toOwnerUid || "").toString() !== auth.uid) {
    throw new HttpsError("permission-denied", "not-transfer-recipient");
  }
  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "transfer-not-pending");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const machineId = (invite.machineId || "").toString().trim();
  const fromOwnerUid = (invite.fromOwnerUid || "").toString().trim();
  const fromOwnerEmail = (invite.fromOwnerEmail || "").toString().trim();
  const toOwnerUid = (invite.toOwnerUid || "").toString().trim();
  const toOwnerEmail = (invite.toOwnerEmail || auth.token.email || "")
    .toString()
    .trim();
  if (!machineId || !fromOwnerUid || !toOwnerUid) {
    throw new HttpsError("failed-precondition", "transfer-invite-incomplete");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  if ((machine.ownerUid || "").toString() !== fromOwnerUid) {
    throw new HttpsError("failed-precondition", "machine-owner-changed");
  }

  if (decision === "rejected") {
    await Promise.all([
      inviteRef.set(
        {
          status: "rejected",
          respondedAt: now,
          updatedAt: now,
        },
        {merge: true},
      ),
      machineRef.set(
        {
          ownershipTransferStatus:
            `Transferencia rechazada por ${toOwnerEmail}`,
          updatedAt: now,
          updatedBy: auth.uid,
        },
        {merge: true},
      ),
    ]);
    return {ok: true};
  }

  await assertAccountStorageAvailable(
    toOwnerUid,
    getMachineDocumentsStorageBytes(machine) +
      (await getMachineQrStorageBytes(machine)),
  );

  const oldPrefix = `machine-docs/${fromOwnerUid}/${machineId}/`;
  const newPrefix = `machine-docs/${toOwnerUid}/${machineId}/`;
  const copiedPaths = new Set<string>();
  let nextDocuments = machine.documents || {};
  if (machine.documents && typeof machine.documents === "object") {
    try {
      nextDocuments = await rewriteMachineDocumentStorageRefs(
        machine.documents,
        oldPrefix,
        newPrefix,
        copiedPaths,
      );
    } catch (error) {
      throw new HttpsError(
        "failed-precondition",
        "storage-copy-failed",
        {message: (error as Error)?.message || ""},
      );
    }
  }

  const logs = Array.isArray(machine.logs) ? machine.logs : [];
  const transferLog = {
    ts: new Date().toISOString(),
    type: "ownership_transfer",
    fromOwnerEmail,
    toOwnerEmail,
    user: toOwnerEmail,
  };

  const previousOwnerLinkId = `${machineId}_${fromOwnerUid}`;
  const writes: Array<Promise<unknown>> = [
    machineRef.set(
      {
        ...machine,
        ownerUid: toOwnerUid,
        ownerEmail: toOwnerEmail,
        tenantId: toOwnerUid,
        documents: nextDocuments,
        adminEmail: fromOwnerEmail,
        adminName: "",
        adminStatus: `Administrado por ${fromOwnerEmail}`,
        ownershipTransferEmail: "",
        ownershipTransferStatus: "",
        logs: [...logs, transferLog],
        updatedAt: now,
        updatedBy: auth.uid,
      },
      {merge: false},
    ),
    inviteRef.set(
      {
        status: "accepted",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    ),
    linksCol().doc(previousOwnerLinkId).set(
      {
        ownerUid: toOwnerUid,
        ownerEmail: toOwnerEmail,
        machineId,
        machineTitle: (machine.title || invite.machineTitle || "").toString(),
        adminUid: fromOwnerUid,
        adminEmail: fromOwnerEmail,
        adminEmailLower: normalizeEmail(fromOwnerEmail),
        status: "accepted",
        createdAt: now,
        updatedAt: now,
      },
      {merge: true},
    ),
  ];

  const tagId = (machine.tagId || "").toString().trim();
  if (tagId) {
    writes.push(
      tagsCol().doc(tagId).set(
        {
          tenantId: toOwnerUid,
          ownerUid: toOwnerUid,
          machineId,
          updatedAt: now,
          updatedBy: auth.uid,
        },
        {merge: true},
      ),
    );
    writes.push(
      machineAccessCol().doc(tagId).set(
        {
          tenantId: toOwnerUid,
          machineId,
          title: machine.title || "",
          brand: machine.brand || "",
          model: machine.model || "",
          serial: machine.serial || "",
          year: machine.year ?? null,
          location: machine.location || "",
          status: machine.status || "",
          logs: [...logs, transferLog],
          tasks: Array.isArray(machine.tasks) ? machine.tasks : [],
          users: Array.isArray(machine.users) ? machine.users : [],
          updatedAt: now,
          updatedBy: auth.uid,
        },
        {merge: true},
      ),
    );
  }

  const priorLinksSnap = await linksCol()
    .where("machineId", "==", machineId)
    .where("ownerUid", "==", fromOwnerUid)
    .get();
  const usernamesSnap = await db.collection("usernames")
    .where("machineId", "==", machineId)
    .where("ownerUid", "==", fromOwnerUid)
    .get();
  priorLinksSnap.forEach((docSnap) => {
    if (docSnap.id === previousOwnerLinkId) return;
    writes.push(
      docSnap.ref.set(
        {
          status: "left",
          updatedAt: now,
          respondedAt: now,
        },
        {merge: true},
      ),
    );
  });
  usernamesSnap.forEach((docSnap) => {
    const usernameData = docSnap.data() || {};
    const username = (usernameData.username || "")
      .toString()
      .trim()
      .toLowerCase();
    if (!username) return;
    writes.push(
      db.collection("usernames").doc(`${toOwnerUid}_${username}`).set(
        {
          ...usernameData,
          ownerUid: toOwnerUid,
          machineId,
          updatedAt: now,
          updatedBy: auth.uid,
        },
        {merge: true},
      ),
    );
    writes.push(docSnap.ref.delete());
  });

  await Promise.all(writes);

  await Promise.allSettled(
    Array.from(copiedPaths.values()).map((path) =>
      deleteStorageFileIfExists(path),
    ),
  );

  return {ok: true, machineId};
});

export const cancelMachineTransferInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  if (!machineId) {
    throw new HttpsError("invalid-argument", "machineId-required");
  }

  const machineRef = machinesCol().doc(machineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  if ((machine.ownerUid || "").toString() !== auth.uid) {
    throw new HttpsError("permission-denied", "not-owner");
  }

  const toEmailLower = normalizeEmail(machine.ownershipTransferEmail || "");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const updates: Array<Promise<unknown>> = [
    machineRef.set(
      {
        ownershipTransferEmail: "",
        ownershipTransferStatus: "",
        updatedAt: now,
        updatedBy: auth.uid,
      },
      {merge: true},
    ),
  ];

  if (toEmailLower) {
    const targetAccountSnap = await accountDirectoryCol()
      .doc(toEmailLower)
      .get();
    const targetUid = (targetAccountSnap.data()?.uid || "").toString().trim();
    if (targetUid) {
      updates.push(
        transferInvitesCol().doc(`${machineId}_${targetUid}`).set(
          {
            status: "canceled",
            respondedAt: now,
            updatedAt: now,
          },
          {merge: true},
        ),
      );
    }
  }

  await Promise.all(updates);
  return {ok: true, machineId};
});

type ControlPanelIntegrityIssue = {
  code: string;
  count: number;
  samples: string[];
};

export const checkAccountHandleAvailability = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const handle = normalizeAccountHandle(request.data?.handle);
  const validationError = getAccountHandleValidationError(handle);
  if (validationError) {
    return {
      ok: true,
      handle,
      valid: false,
      available: false,
      reason: validationError,
    };
  }

  const [handleSnap, userSnap] = await Promise.all([
    accountHandlesCol().doc(handle).get(),
    db.collection("users").doc(auth.uid).get(),
  ]);
  const currentHandle = normalizeAccountHandle(userSnap.data()?.accountHandle);
  const claimedBy = (handleSnap.data()?.uid || "").toString().trim();
  return {
    ok: true,
    handle,
    valid: true,
    available: !handleSnap.exists || claimedBy === auth.uid,
    owned: currentHandle === handle && claimedBy === auth.uid,
    reason: handleSnap.exists && claimedBy !== auth.uid ? "handle-taken" : "",
  };
});

export const claimAccountHandle = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const handle = normalizeAccountHandle(request.data?.handle);
  const validationError = getAccountHandleValidationError(handle);
  if (validationError) {
    throw new HttpsError("invalid-argument", validationError);
  }

  const userRef = db.collection("users").doc(auth.uid);
  const handleRef = accountHandlesCol().doc(handle);
  const emailLower = normalizeEmail(auth.token?.email || "");
  const directoryRef = emailLower ?
    accountDirectoryCol().doc(emailLower) :
    null;
  await db.runTransaction(async (tx) => {
    const [userSnap, handleSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(handleRef),
    ]);
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "profile-required");
    }
    const currentHandle = normalizeAccountHandle(
      userSnap.data()?.accountHandle,
    );
    const claimedBy = (handleSnap.data()?.uid || "").toString().trim();
    if (currentHandle && currentHandle !== handle) {
      throw new HttpsError("failed-precondition", "handle-already-set");
    }
    if (handleSnap.exists && claimedBy !== auth.uid) {
      throw new HttpsError("already-exists", "handle-taken");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    if (!handleSnap.exists) {
      tx.create(handleRef, {
        uid: auth.uid,
        handle,
        createdAt: now,
      });
    }
    tx.set(userRef, {
      accountHandle: handle,
      accountHandleNormalized: handle,
      accountHandleCreatedAt: userSnap.data()?.accountHandleCreatedAt || now,
      updatedAt: now,
    }, {merge: true});
    if (directoryRef) {
      tx.set(directoryRef, {
        uid: auth.uid,
        email: auth.token?.email || emailLower,
        emailLower,
        accountHandle: handle,
        updatedAt: now,
      }, {merge: true});
    }
  });

  return {ok: true, handle};
});

export const getControlPanelSystemStatus = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const queryLimit = 2000;
  const listAuthUsers = async () => {
    const users: admin.auth.UserRecord[] = [];
    let pageToken: string | undefined;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      users.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);
    return users;
  };

  const [
    machinesSnap,
    tagsSnap,
    accessSnap,
    linksSnap,
    invitesSnap,
    transfersSnap,
    todosSnap,
    suggestionsSnap,
    usersSnap,
    accountHandlesSnap,
    authUsers,
  ] = await Promise.all([
    machinesCol().limit(queryLimit).get(),
    tagsCol().limit(queryLimit).get(),
    machineAccessCol().limit(queryLimit).get(),
    linksCol().limit(queryLimit).get(),
    invitesCol().limit(queryLimit).get(),
    transferInvitesCol().limit(queryLimit).get(),
    dashboardTodosCol().limit(queryLimit).get(),
    dashboardSuggestionsCol().limit(queryLimit).get(),
    db.collection("users").limit(queryLimit).get(),
    accountHandlesCol().limit(queryLimit).get(),
    listAuthUsers(),
  ]);

  const machineById = new Map<string, FirebaseFirestore.DocumentData>();
  machinesSnap.forEach((docSnap) => {
    machineById.set(docSnap.id, docSnap.data() || {});
  });
  const tagById = new Map<string, FirebaseFirestore.DocumentData>();
  tagsSnap.forEach((docSnap) => {
    tagById.set(docSnap.id, docSnap.data() || {});
  });
  const accessByTagId = new Map<string, FirebaseFirestore.DocumentData>();
  accessSnap.forEach((docSnap) => {
    accessByTagId.set(docSnap.id, docSnap.data() || {});
  });
  const authUids = new Set(authUsers.map((user) => user.uid));
  const machineLabel = (id: string) => {
    const machine = machineById.get(id) || {};
    return (machine.title || id).toString().trim() || id;
  };
  const issues: ControlPanelIntegrityIssue[] = [];
  const addIssue = (code: string, matches: string[]) => {
    if (!matches.length) return;
    issues.push({
      code,
      count: matches.length,
      samples: matches.slice(0, 5),
    });
  };

  const missingMachineOwner: string[] = [];
  const unknownMachineOwner: string[] = [];
  const machineMissingTag: string[] = [];
  const machineMissingAccess: string[] = [];
  const machineTagOwners = new Map<string, string[]>();
  let operationalMachines = 0;
  let outOfServiceMachines = 0;
  let pendingTasks = 0;
  machinesSnap.forEach((docSnap) => {
    const machine = docSnap.data() || {};
    const id = docSnap.id;
    const ownerUid = (machine.ownerUid || "").toString().trim();
    const tagId = (machine.tagId || "").toString().trim();
    const status = (machine.status || "").toString().trim();
    if (!ownerUid) missingMachineOwner.push(machineLabel(id));
    else if (!authUids.has(ownerUid)) {
      unknownMachineOwner.push(machineLabel(id));
    }
    if (tagId) {
      if (!tagById.has(tagId)) machineMissingTag.push(machineLabel(id));
      if (!accessByTagId.has(tagId)) {
        machineMissingAccess.push(machineLabel(id));
      }
      const owners = machineTagOwners.get(tagId) || [];
      owners.push(machineLabel(id));
      machineTagOwners.set(tagId, owners);
    }
    if (status === "fuera_de_servicio") outOfServiceMachines += 1;
    else operationalMachines += 1;
    const tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
    pendingTasks += tasks.filter((task) => task?.completed !== true).length;
  });

  const duplicateMachineTags = Array.from(machineTagOwners.entries())
    .filter(([, owners]) => owners.length > 1)
    .map(([tagId, owners]) => `${tagId}: ${owners.join(", ")}`);
  const tagMissingMachine: string[] = [];
  const tagMachineMissing: string[] = [];
  const tagMachineMismatch: string[] = [];
  const tagOwnerMismatch: string[] = [];
  const tagMissingAccess: string[] = [];
  tagsSnap.forEach((docSnap) => {
    const tag = docSnap.data() || {};
    const tagId = docSnap.id;
    const machineId = (tag.machineId || "").toString().trim();
    if (!machineId) {
      if ((tag.state || "").toString().trim() === "assigned") {
        tagMissingMachine.push(tagId);
      }
      return;
    }
    const machine = machineById.get(machineId);
    if (!machine) {
      tagMachineMissing.push(tagId);
      return;
    }
    if ((machine.tagId || "").toString().trim() !== tagId) {
      tagMachineMismatch.push(`${tagId}: ${machineLabel(machineId)}`);
    }
    const tagOwner = (tag.ownerUid || tag.tenantId || "").toString().trim();
    const machineOwner = (machine.ownerUid || "").toString().trim();
    if (tagOwner && machineOwner && tagOwner !== machineOwner) {
      tagOwnerMismatch.push(`${tagId}: ${machineLabel(machineId)}`);
    }
    if (!accessByTagId.has(tagId)) tagMissingAccess.push(tagId);
  });

  const accessMissingTag: string[] = [];
  const accessMissingMachine: string[] = [];
  accessSnap.forEach((docSnap) => {
    const access = docSnap.data() || {};
    const tagId = docSnap.id;
    const machineId = (access.machineId || "").toString().trim();
    if (!tagById.has(tagId)) accessMissingTag.push(tagId);
    if (!machineId || !machineById.has(machineId)) {
      accessMissingMachine.push(tagId);
    }
  });

  const linkMachineMissing = linksSnap.docs
    .filter((docSnap) => {
      const machineId = (docSnap.data()?.machineId || "").toString().trim();
      return !machineId || !machineById.has(machineId);
    })
    .map((docSnap) => docSnap.id);
  const pendingInviteMachineMissing = invitesSnap.docs
    .filter((docSnap) => {
      const data = docSnap.data() || {};
      const machineId = (data.machineId || "").toString().trim();
      return data.status === "pending" &&
        (!machineId || !machineById.has(machineId));
    })
    .map((docSnap) => docSnap.id);
  const pendingTransferMachineMissing = transfersSnap.docs
    .filter((docSnap) => {
      const data = docSnap.data() || {};
      const machineId = (data.machineId || "").toString().trim();
      return data.status === "pending" &&
        (!machineId || !machineById.has(machineId));
    })
    .map((docSnap) => docSnap.id);

  addIssue("machine-missing-owner", missingMachineOwner);
  addIssue("machine-owner-not-in-auth", unknownMachineOwner);
  addIssue("machine-tag-missing", machineMissingTag);
  addIssue("machine-access-missing", machineMissingAccess);
  addIssue("duplicate-machine-tag", duplicateMachineTags);
  addIssue("assigned-tag-missing-machine", tagMissingMachine);
  addIssue("tag-machine-missing", tagMachineMissing);
  addIssue("tag-machine-mismatch", tagMachineMismatch);
  addIssue("tag-owner-mismatch", tagOwnerMismatch);
  addIssue("tag-access-missing", tagMissingAccess);
  addIssue("access-tag-missing", accessMissingTag);
  addIssue("access-machine-missing", accessMissingMachine);
  addIssue("admin-link-machine-missing", linkMachineMissing);
  addIssue("invite-machine-missing", pendingInviteMachineMissing);
  addIssue("transfer-machine-missing", pendingTransferMachineMissing);

  const handleByUid = new Map<string, string[]>();
  const userProfileByUid = new Map(
    usersSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() || {}]),
  );
  const handleMissingUser: string[] = [];
  const invalidHandle: string[] = [];
  const handleProfileMismatch: string[] = [];
  accountHandlesSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const handle = normalizeAccountHandle(data.handle || docSnap.id);
    const uid = (data.uid || "").toString().trim();
    if (docSnap.id !== handle || getAccountHandleValidationError(handle)) {
      invalidHandle.push(docSnap.id);
    }
    if (!uid || !authUids.has(uid)) handleMissingUser.push(docSnap.id);
    if (uid) {
      const handles = handleByUid.get(uid) || [];
      handles.push(handle);
      handleByUid.set(uid, handles);
      const profileHandle = normalizeAccountHandle(
        userProfileByUid.get(uid)?.accountHandle,
      );
      if (profileHandle !== handle) {
        handleProfileMismatch.push(`${uid}: @${handle}`);
      }
    }
  });
  usersSnap.forEach((docSnap) => {
    const profileHandle = normalizeAccountHandle(docSnap.data()?.accountHandle);
    if (!profileHandle) return;
    const indexed = handleByUid.get(docSnap.id) || [];
    if (!indexed.includes(profileHandle)) {
      handleProfileMismatch.push(`${docSnap.id}: @${profileHandle}`);
    }
  });
  const duplicateAccountHandles = Array.from(handleByUid.entries())
    .filter(([, handles]) => handles.length > 1)
    .map(([uid, handles]) =>
      `${uid}: ${handles.map((item) => `@${item}`).join(", ")}`,
    );
  addIssue("account-handle-invalid", invalidHandle);
  addIssue("account-handle-user-missing", handleMissingUser);
  addIssue("account-handle-profile-mismatch", handleProfileMismatch);
  addIssue("account-handle-duplicate-user", duplicateAccountHandles);

  const issueCount = issues.reduce((total, issue) => total + issue.count, 0);
  const pendingTodos = todosSnap.docs.filter(
    (docSnap) => docSnap.data()?.completed !== true,
  ).length;
  const openSuggestions = suggestionsSnap.docs.filter(
    (docSnap) => docSnap.data()?.resolved !== true,
  ).length;
  const pendingInvites = invitesSnap.docs.filter(
    (docSnap) => docSnap.data()?.status === "pending",
  ).length;
  const pendingTransfers = transfersSnap.docs.filter(
    (docSnap) => docSnap.data()?.status === "pending",
  ).length;
  const queriedSnapshots = [
    machinesSnap,
    tagsSnap,
    accessSnap,
    linksSnap,
    invitesSnap,
    transfersSnap,
    todosSnap,
    suggestionsSnap,
    usersSnap,
    accountHandlesSnap,
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    services: {
      functions: "ok",
      firestore: "ok",
      authentication: "ok",
    },
    summary: {
      users: authUsers.length,
      accountHandles: accountHandlesSnap.size,
      machines: machinesSnap.size,
      operationalMachines,
      outOfServiceMachines,
      tags: tagsSnap.size,
      accessRecords: accessSnap.size,
      pendingTasks,
      pendingTodos,
      openSuggestions,
      pendingInvites,
      pendingTransfers,
    },
    integrity: {
      status: issueCount ? "warning" : "ok",
      issueCount,
      issues,
      storageObjectsChecked: false,
      scopeLimited: queriedSnapshots.some((snap) => snap.size >= queryLimit),
    },
  };
});

export const listControlPanelUsers = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const listAuthUsers = async () => {
    const users: Array<{
      uid: string;
      email: string;
      displayName: string;
    }> = [];
    let pageToken: string | undefined;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((user) => {
        users.push({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
        });
      });
      pageToken = page.pageToken;
    } while (pageToken);
    return users;
  };

  const [directorySnap, usersSnap, authUsers] = await Promise.all([
    accountDirectoryCol()
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
    db.collection("users")
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
    listAuthUsers(),
  ]);

  const map = new Map<string, {
    uid: string;
    email: string;
    displayName: string;
    company: string;
    accountHandle: string;
    suggestionsCollaborator: boolean;
  }>();

  const upsertItem = (
    raw: {
      uid?: unknown;
      email?: unknown;
      displayName?: unknown;
      company?: unknown;
      accountHandle?: unknown;
      suggestionsCollaborator?: unknown;
    },
  ) => {
    const uid = (raw.uid || "").toString().trim();
    const email = (raw.email || "").toString().trim();
    const displayName = (raw.displayName || "").toString().trim();
    const company = (raw.company || "").toString().trim();
    const accountHandle = normalizeAccountHandle(raw.accountHandle);
    const key = uid || normalizeEmail(email);
    if (!key) return;
    const current = map.get(key);
    map.set(key, {
      uid: uid || (current?.uid || ""),
      email: email || (current?.email || ""),
      displayName: displayName || (current?.displayName || ""),
      company: company || (current?.company || ""),
      accountHandle: accountHandle || (current?.accountHandle || ""),
      suggestionsCollaborator:
        typeof raw.suggestionsCollaborator === "boolean" ?
          raw.suggestionsCollaborator :
          !!current?.suggestionsCollaborator,
    });
  };

  directorySnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  usersSnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  authUsers.forEach((user) => {
    upsertItem(user);
  });

  const items = Array.from(map.values()).sort((a, b) => {
    const left = (a.displayName || a.email || a.uid).toLowerCase();
    const right = (b.displayName || b.email || b.uid).toLowerCase();
    return left.localeCompare(right, "en");
  });

  return {ok: true, items};
});

export const setControlPanelUserCollaborator = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const uid = (request.data?.uid || "").toString().trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid-required");

  const enabled = request.data?.enabled === true;
  await db.collection("users").doc(uid).set(
    {
      suggestionsCollaborator: enabled,
      suggestionsCollaboratorUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      suggestionsCollaboratorUpdatedBy: auth.uid || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  return {ok: true, uid, suggestionsCollaborator: enabled};
});

const canUseDashboardTodo = async (auth: {
  uid?: string;
  token?: {email?: string | null};
} | null | undefined) => {
  if (isControlPanelAuth(auth)) return {allowed: true, isSuperadmin: true};
  const userSnap = await db.collection("users").doc(auth?.uid || "").get();
  const userData = userSnap.data() || {};
  return {
    allowed: userData.suggestionsCollaborator === true,
    isSuperadmin: false,
  };
};

type DashboardTodoPerson = {
  uid: string;
  email: string;
  displayName: string;
  mention: string;
};

const getTodoMention = (email: string) =>
  normalizeEmail(email).split("@")[0] || "";

const toDashboardTodoPerson = (
  user: admin.auth.UserRecord,
  accountHandle = "",
) => ({
  uid: user.uid,
  email: normalizeEmail(user.email || ""),
  displayName: (user.displayName || user.email || "").toString().trim(),
  mention: normalizeAccountHandle(accountHandle) ||
    getTodoMention(user.email || ""),
});

const getAccountHandleForUid = async (uid: string) => {
  const snap = await db.collection("users").doc(uid).get();
  return normalizeAccountHandle(snap.data()?.accountHandle);
};

const canUserRecordUseDashboardTodo = async (
  user: admin.auth.UserRecord,
) => {
  if (isControlPanelAuth({token: {email: user.email || ""}})) return true;
  const snap = await db.collection("users").doc(user.uid).get();
  return snap.data()?.suggestionsCollaborator === true;
};

const resolveDashboardTodoMentions = async (
  mentions: string[],
  creatorUid: string,
) => {
  if (!mentions.length) return [] as DashboardTodoPerson[];
  if (mentions.length > 10) {
    throw new HttpsError("invalid-argument", "too-many-todo-mentions");
  }
  const wanted = new Set(mentions);
  const matches = new Map<string, admin.auth.UserRecord[]>();
  const resolvedHandles = await Promise.all(
    mentions.map(async (mention) => {
      const snap = await accountHandlesCol().doc(mention).get();
      const uid = (snap.data()?.uid || "").toString().trim();
      if (!snap.exists || !uid) return null;
      const user = await admin.auth().getUser(uid).catch(() => null);
      return user ? {mention, user} : null;
    }),
  );
  resolvedHandles.forEach((match) => {
    if (!match) return;
    matches.set(match.mention, [match.user]);
    wanted.delete(match.mention);
  });
  let pageToken: string | undefined;
  if (wanted.size) {
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((user) => {
        const mention = getTodoMention(user.email || "");
        if (!wanted.has(mention)) return;
        const current = matches.get(mention) || [];
        current.push(user);
        matches.set(mention, current);
      });
      pageToken = page.pageToken;
    } while (pageToken);
  }

  const people: DashboardTodoPerson[] = [];
  for (const mention of mentions) {
    const candidates = matches.get(mention) || [];
    if (candidates.length !== 1) {
      throw new HttpsError(
        candidates.length ? "failed-precondition" : "not-found",
        candidates.length ?
          "todo-mention-ambiguous" :
          "todo-mention-not-found",
      );
    }
    const user = candidates[0];
    if (user.uid === creatorUid) continue;
    if (!await canUserRecordUseDashboardTodo(user)) {
      throw new HttpsError("permission-denied", "todo-recipient-disabled");
    }
    people.push(toDashboardTodoPerson(user, mention));
  }
  return people;
};

const normalizeDashboardTodoPerson = (
  value: unknown,
): DashboardTodoPerson | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const uid = (raw.uid || "").toString().trim();
  if (!uid) return null;
  return {
    uid,
    email: normalizeEmail((raw.email || "").toString()),
    displayName: (raw.displayName || "").toString().trim(),
    mention: (raw.mention || "").toString().trim().toLowerCase(),
  };
};

export const listDashboardTodoCollaborators = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }

  const enabledSnap = await db.collection("users")
    .where("suggestionsCollaborator", "==", true)
    .get();
  const enabledUids = new Set(enabledSnap.docs.map((docSnap) => docSnap.id));
  const enabledProfiles = new Map(
    enabledSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() || {}]),
  );
  const eligibleUsers: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    page.users.forEach((user) => {
      if (user.uid === auth.uid) return;
      const isSuperadmin = isControlPanelAuth({
        token: {email: user.email || ""},
      });
      if (!enabledUids.has(user.uid) && !isSuperadmin) return;
      eligibleUsers.push(user);
    });
    pageToken = page.pageToken;
  } while (pageToken);

  const people = await Promise.all(eligibleUsers.map(async (user) => {
    const profile = enabledProfiles.get(user.uid);
    const accountHandle = normalizeAccountHandle(
      profile?.accountHandle || await getAccountHandleForUid(user.uid),
    );
    return toDashboardTodoPerson(user, accountHandle);
  }));

  people.sort((a, b) => {
    const left = (a.displayName || a.email || a.mention).toLowerCase();
    const right = (b.displayName || b.email || b.mention).toLowerCase();
    return left.localeCompare(right, "es");
  });
  return {ok: true, items: people};
});

export const listDashboardTodos = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    return {
      ok: true,
      canTodo: false,
      isSuperadmin: access.isSuperadmin,
      items: [],
    };
  }
  const rawLimit = Number(request.data?.limit || 254);
  const limit = Math.max(1, Math.min(500, Math.floor(rawLimit)));
  const [ownedSnap, sharedSnap] = await Promise.all([
    dashboardTodosCol()
      .where("ownerUid", "==", auth.uid)
      .limit(limit)
      .get(),
    dashboardTodosCol()
      .where("participantUids", "array-contains", auth.uid)
      .limit(limit)
      .get(),
  ]);
  const todoDocs = new Map<
    string,
    FirebaseFirestore.QueryDocumentSnapshot
  >();
  [...ownedSnap.docs, ...sharedSnap.docs].forEach((docSnap) => {
    todoDocs.set(docSnap.id, docSnap);
  });
  const items = Array.from(todoDocs.values()).map((docSnap) => {
    const data = docSnap.data() || {};
    const owner = normalizeDashboardTodoPerson(data.owner);
    const recipients = Array.isArray(data.sharedWith) ?
      data.sharedWith
        .map(normalizeDashboardTodoPerson)
        .filter((person): person is DashboardTodoPerson => !!person) :
      [];
    const sharedWith = data.ownerUid === auth.uid ?
      recipients :
      [owner, ...recipients]
        .filter((person): person is DashboardTodoPerson => !!person)
        .filter((person) => person.uid !== auth.uid);
    return {
      id: docSnap.id,
      text: data.text || "",
      ownerUid: data.ownerUid || "",
      canDelete: data.ownerUid === auth.uid,
      isShared: recipients.length > 0,
      sharedWith,
      completed: data.completed === true,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || "",
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() ||
        data.completedAt || "",
    };
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const left = a.updatedAt || a.createdAt;
    const right = b.updatedAt || b.createdAt;
    return new Date(right).getTime() - new Date(left).getTime();
  }).slice(0, limit);
  return {
    ok: true,
    canTodo: true,
    isSuperadmin: access.isSuperadmin,
    items,
  };
});

export const createDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const text: string = (request.data?.text || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
  if (!text) throw new HttpsError("invalid-argument", "text-required");
  const mentionMatches = text.match(
    /@[a-z0-9][a-z0-9._-]{0,63}/gi,
  ) || [];
  const mentions = mentionMatches
    .map((match) => match.slice(1).toLowerCase())
    .filter((mention, index, values) => values.indexOf(mention) === index);
  const recipients = await resolveDashboardTodoMentions(mentions, auth.uid);
  const storedText = text
    .replace(/@[a-z0-9][a-z0-9._-]{0,63}/gi, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!storedText) throw new HttpsError("invalid-argument", "text-required");
  const [creatorRecord, creatorHandle] = await Promise.all([
    admin.auth().getUser(auth.uid),
    getAccountHandleForUid(auth.uid),
  ]);
  const owner = toDashboardTodoPerson(creatorRecord, creatorHandle);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = dashboardTodosCol().doc();
  await ref.set({
    text: storedText,
    ownerUid: auth.uid,
    owner,
    participantUids: [auth.uid, ...recipients.map((person) => person.uid)],
    sharedWith: recipients,
    completed: false,
    completedAt: "",
    createdAt: now,
    updatedAt: now,
  });
  return {ok: true, id: ref.id};
});

export const updateDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const todoId = (request.data?.todoId || "").toString().trim();
  if (!todoId) throw new HttpsError("invalid-argument", "todoId-required");
  const ref = dashboardTodosCol().doc(todoId);
  const completed = request.data?.completed === true;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "todo-not-found");
    const todo = snap.data() || {};
    const participantUids = Array.isArray(todo.participantUids) ?
      todo.participantUids :
      [];
    if (todo.ownerUid !== auth.uid && !participantUids.includes(auth.uid)) {
      throw new HttpsError("permission-denied", "not-todo-participant");
    }
    tx.set(
      ref,
      {
        completed,
        completedByUid: completed ? auth.uid : "",
        completedAt: completed ?
          admin.firestore.FieldValue.serverTimestamp() :
          "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  });
  return {ok: true, todoId, completed};
});

export const deleteDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const todoId = (request.data?.todoId || "").toString().trim();
  if (!todoId) throw new HttpsError("invalid-argument", "todoId-required");
  const ref = dashboardTodosCol().doc(todoId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    if ((snap.data()?.ownerUid || "") !== auth.uid) {
      throw new HttpsError("permission-denied", "not-todo-owner");
    }
    tx.delete(ref);
  });
  return {ok: true, todoId};
});

export const createDashboardSuggestion = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const userRef = db.collection("users").doc(auth.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const canSuggest =
    isControlPanelAuth(auth) || userData.suggestionsCollaborator === true;
  if (!canSuggest) {
    throw new HttpsError("permission-denied", "suggestions-disabled");
  }

  const text = (request.data?.text || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
  if (!text) throw new HttpsError("invalid-argument", "text-required");
  const replyToSuggestionId = (request.data?.replyToSuggestionId || "")
    .toString()
    .trim();

  const now = admin.firestore.FieldValue.serverTimestamp();
  const nowIso = new Date().toISOString();
  const authorEmail = normalizeEmail(auth.token?.email || userData.email || "");
  const authorName = (
    auth.token?.name ||
    userData.displayName ||
    authorEmail ||
    ""
  ).toString().trim();

  if (replyToSuggestionId) {
    const ref = dashboardSuggestionsCol().doc(replyToSuggestionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "suggestion-not-found");
    }
    const suggestion = snap.data() || {};
    if (!isControlPanelAuth(auth) && suggestion.authorUid !== auth.uid) {
      throw new HttpsError("permission-denied", "not-suggestion-author");
    }
    const reply = {
      id: dashboardSuggestionsCol().doc().id,
      text,
      authorUid: auth.uid,
      authorEmail,
      authorName,
      createdAt: nowIso,
    };
    await ref.set(
      {
        replies: admin.firestore.FieldValue.arrayUnion(reply),
        updatedAt: now,
        lastActivityAt: now,
      },
      {merge: true},
    );
    return {ok: true, id: ref.id, replyId: reply.id};
  }

  const ref = dashboardSuggestionsCol().doc();
  await ref.set({
    text,
    authorUid: auth.uid,
    authorEmail,
    authorName,
    replies: [],
    resolved: false,
    resolvedAt: "",
    resolvedByUid: "",
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  return {ok: true, id: ref.id};
});

export const updateDashboardSuggestionResolved = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const suggestionId = (request.data?.suggestionId || "").toString().trim();
  if (!suggestionId) {
    throw new HttpsError("invalid-argument", "suggestionId-required");
  }
  const resolved = request.data?.resolved === true;
  await dashboardSuggestionsCol().doc(suggestionId).set(
    {
      resolved,
      resolvedAt: resolved ? admin.firestore.FieldValue.serverTimestamp() : "",
      resolvedByUid: resolved ? auth.uid : "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );
  return {ok: true, suggestionId, resolved};
});

export const deleteDashboardSuggestion = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const suggestionId = (request.data?.suggestionId || "").toString().trim();
  if (!suggestionId) {
    throw new HttpsError("invalid-argument", "suggestionId-required");
  }
  await dashboardSuggestionsCol().doc(suggestionId).delete();
  return {ok: true, suggestionId};
});

export const listDashboardSuggestions = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const userSnap = await db.collection("users").doc(auth.uid).get();
  const userData = userSnap.data() || {};
  const isSuperadmin = isControlPanelAuth(auth);
  const canSuggest =
    isSuperadmin || userData.suggestionsCollaborator === true;
  if (!canSuggest) {
    return {
      ok: true,
      canSuggest: false,
      isSuperadmin,
      items: [],
      suggestionsSeenAt: "",
    };
  }

  const rawLimit = Number(request.data?.limit || 254);
  const limit = Math.max(1, Math.min(500, Math.floor(rawLimit)));
  let query: FirebaseFirestore.Query = dashboardSuggestionsCol()
    .orderBy("createdAt", "desc")
    .limit(limit);
  if (!isSuperadmin) {
    query = dashboardSuggestionsCol()
      .where("authorUid", "==", auth.uid)
      .limit(limit);
  }

  const [suggestionsSnap, layoutSnap] = await Promise.all([
    query.get(),
    db.collection("dashboard_layout").doc(auth.uid).get(),
  ]);
  const items = suggestionsSnap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      text: data.text || "",
      authorUid: data.authorUid || "",
      authorEmail: data.authorEmail || "",
      authorName: data.authorName || "",
      resolved: data.resolved === true,
      resolvedAt: data.resolvedAt?.toDate?.()?.toISOString?.() ||
        data.resolvedAt || "",
      resolvedByUid: data.resolvedByUid || "",
      replies: Array.isArray(data.replies) ? data.replies.map((reply) => ({
        id: (reply.id || "").toString(),
        text: (reply.text || "").toString(),
        authorUid: (reply.authorUid || "").toString(),
        authorEmail: (reply.authorEmail || "").toString(),
        authorName: (reply.authorName || "").toString(),
        createdAt: (reply.createdAt || "").toString(),
      })) : [],
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
      lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString?.() ||
        data.createdAt?.toDate?.()?.toISOString?.() || "",
    };
  }).sort((a, b) => {
    const left = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const right = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return right - left;
  });

  return {
    ok: true,
    canSuggest,
    isSuperadmin,
    items,
    suggestionsSeenAt: layoutSnap.data()?.suggestionsSeenAt || "",
  };
});

export const markDashboardSuggestionsSeen = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  if (!isControlPanelAuth(auth)) return {ok: true};

  const seenAt = new Date().toISOString();
  await db.collection("dashboard_layout").doc(auth.uid).set(
    {
      suggestionsSeenAt: seenAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    {merge: true},
  );
  return {ok: true, suggestionsSeenAt: seenAt};
});

export const deleteControlPanelUser = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const uid = (request.data?.uid || "").toString().trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid-required");

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const userRecord = await admin.auth().getUser(uid).catch(() => null);
  const emailLower = normalizeEmail(
    (userRecord?.email || userData.email || "").toString(),
  );

  const [
    accountDirectorySnap,
    accountHandlesSnap,
    ownerMachinesSnap,
    usernamesSnap,
    tagsSnap,
    machineAccessSnap,
    ownerLinksSnap,
    adminLinksSnap,
    ownerInvitesSnap,
    adminInvitesSnap,
    legacyMachinesSnap,
  ] = await Promise.all([
    accountDirectoryCol().where("uid", "==", uid).get(),
    accountHandlesCol().where("uid", "==", uid).get(),
    machinesCol().where("ownerUid", "==", uid).get(),
    db.collection("usernames").where("ownerUid", "==", uid).get(),
    tagsCol().where("tenantId", "==", uid).get(),
    machineAccessCol().where("tenantId", "==", uid).get(),
    linksCol().where("ownerUid", "==", uid).get(),
    linksCol().where("adminUid", "==", uid).get(),
    invitesCol().where("ownerUid", "==", uid).get(),
    emailLower ?
      invitesCol().where("adminEmailLower", "==", emailLower).get() :
      Promise.resolve(null),
    db.collection("tenants").doc(uid).collection("machines").get(),
  ]);

  const refsToDelete = new Map<string, FirebaseFirestore.DocumentReference>();
  const qrPaths = new Set<string>();
  const machineIdsToClearAdmin = new Set<string>();

  collectUniqueDocRefs(refsToDelete, [userRef]);
  if (emailLower) {
    collectUniqueDocRefs(refsToDelete, [accountDirectoryCol().doc(emailLower)]);
  }
  collectUniqueDocRefs(
    refsToDelete,
    accountDirectorySnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    accountHandlesSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    usernamesSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    ownerMachinesSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    legacyMachinesSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    tagsSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    machineAccessSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    ownerLinksSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    adminLinksSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    ownerInvitesSnap.docs.map((docSnap) => docSnap.ref),
  );
  collectUniqueDocRefs(
    refsToDelete,
    (adminInvitesSnap?.docs || []).map((docSnap) => docSnap.ref),
  );

  ownerMachinesSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const tagId = (data.tagId || "").toString().trim();
    const qrPath = (data.tagQrPath || "").toString().trim();
    if (tagId) {
      collectUniqueDocRefs(refsToDelete, [tagsCol().doc(tagId)]);
      collectUniqueDocRefs(refsToDelete, [machineAccessCol().doc(tagId)]);
    }
    if (qrPath) qrPaths.add(qrPath);
  });

  tagsSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const tagId = docSnap.id;
    const qrPath = (data.qrPath || "").toString().trim();
    if (tagId) {
      collectUniqueDocRefs(refsToDelete, [machineAccessCol().doc(tagId)]);
    }
    if (qrPath) qrPaths.add(qrPath);
  });

  adminLinksSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const machineId = (data.machineId || "").toString().trim();
    const ownerUid = (data.ownerUid || "").toString().trim();
    if (machineId && ownerUid && ownerUid !== uid) {
      machineIdsToClearAdmin.add(machineId);
    }
  });

  (adminInvitesSnap?.docs || []).forEach((docSnap) => {
    const data = docSnap.data() || {};
    const machineId = (data.machineId || "").toString().trim();
    const ownerUid = (data.ownerUid || "").toString().trim();
    if (machineId && ownerUid && ownerUid !== uid) {
      machineIdsToClearAdmin.add(machineId);
    }
  });

  await Promise.allSettled(
    Array.from(qrPaths.values()).map((qrPath) =>
      deleteStorageFileIfExists(qrPath),
    ),
  );

  await Promise.allSettled(
    Array.from(machineIdsToClearAdmin.values()).map((machineId) =>
      machinesCol().doc(machineId).set(
        {
          adminEmail: "",
          adminName: "",
          adminStatus: "",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.uid,
        },
        {merge: true},
      ),
    ),
  );

  await deleteCollectedDocRefs(refsToDelete);
  await db.collection("tenants").doc(uid).delete().catch(() => undefined);
  await admin.auth().deleteUser(uid).catch(() => undefined);

  return {ok: true, uid};
});

export const listControlPanelRegistrationCodes = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const snap = await db.collection("registration_codes").get();

  const map = new Map<string, {code: string; active: unknown}>();
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const normalizedCode = normalizeRegistrationCode(docSnap.id);
    if (!normalizedCode || data.active === false) return;
    if (!map.has(normalizedCode)) {
      map.set(normalizedCode, {
        code: normalizedCode,
        active: data.active,
      });
    }
  });

  const items = Array.from(map.values()).sort((a, b) =>
    a.code.localeCompare(b.code, "en"),
  );

  return {ok: true, items};
});

export const createControlPanelRegistrationCode = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const requestedCode = normalizeRegistrationCode(
    (request.data?.code || "").toString(),
  );
  let code = requestedCode;
  if (code && !/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new HttpsError("invalid-argument", "invalid-code");
  }

  if (!code) {
    for (let tries = 0; tries < 10; tries += 1) {
      const candidate = generateRegistrationCode();
      const snap = await registrationCodesCol().doc(candidate).get();
      if (!snap.exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new HttpsError("resource-exhausted", "could-not-generate-code");
    }
  } else {
    const existing = await registrationCodesCol().get();
    const duplicate = existing.docs.find((docSnap) => {
      const active = docSnap.data()?.active;
      return active !== false && normalizeRegistrationCode(docSnap.id) === code;
    });
    if (duplicate) {
      throw new HttpsError("already-exists", "code-already-active");
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await registrationCodesCol().doc(code).set(
    {
      active: true,
      updatedAt: now,
      createdAt: now,
    },
    {merge: true},
  );

  return {ok: true, code};
});

export const deleteControlPanelRegistrationCode = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const code = normalizeRegistrationCode((request.data?.code || "").toString());
  if (!code) throw new HttpsError("invalid-argument", "code-required");

  const snap = await registrationCodesCol().get();
  const refs = snap.docs.filter(
    (docSnap) => normalizeRegistrationCode(docSnap.id) === code,
  );
  if (!refs.length) throw new HttpsError("not-found", "code-not-found");

  const now = admin.firestore.FieldValue.serverTimestamp();
  await Promise.all(
    refs.map((docSnap) =>
      docSnap.ref.set(
        {
          active: false,
          updatedAt: now,
        },
        {merge: true},
      ),
    ),
  );

  return {ok: true, code};
});

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
        users: Array.isArray(machine.users) ? machine.users : [],
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
