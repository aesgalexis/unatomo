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
const QR_CANVAS_SIZE = 300;

const hashEmail = (email: string) =>
  createHash("sha256").update(normalizeEmail(email)).digest("hex");

const assertControlPanelAccess = (auth: {
  token?: {email?: string | null};
} | null | undefined) => {
  const email = (auth?.token?.email || "").toString();
  if (!email || hashEmail(email) !== CONTROL_PANEL_EMAIL_HASH) {
    throw new HttpsError("permission-denied", "not-allowed");
  }
};

const machinesCol = () => db.collection("machines");
const invitesCol = () => db.collection("admin_machine_invites");
const linksCol = () => db.collection("admin_machine_links");
const accountDirectoryCol = () => db.collection("account_directory");
const registrationCodesCol = () => db.collection("registration_codes");
const tagsCol = () => db.collection("tags");
const machineAccessCol = () => db.collection("machine_access");
const storageBucket = admin.storage().bucket();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRegistrationCode = (length = 8) => {
  let value = "";
  for (let idx = 0; idx < length; idx += 1) {
    const next = Math.floor(Math.random() * CODE_ALPHABET.length);
    value += CODE_ALPHABET[next];
  }
  return value;
};

const normalizeRegistrationCode = (value: string) =>
  (value || "").toString().trim().toUpperCase();
const normalizeLang = (value: string) =>
  (value || "").toString().trim().toLowerCase() === "en" ? "en" : "es";

const buildMachineTagUrl = (tagId: string, lang = "es") =>
  `${PUBLIC_SITE_ORIGIN}/${normalizeLang(lang)}/m.html?tag=${encodeURIComponent(
    tagId,
  )}`;

const decorateQrSvg = (svgMarkup: string) => svgMarkup;

const buildStorageDownloadUrl = (path: string, token: string) => {
  const encodedPath = encodeURIComponent(path);
  return (
    `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}/o/` +
    `${encodedPath}?alt=media&token=${token}`
  );
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

const getOwnedMachineForAuth = async (
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
  if ((machine.ownerUid || "").toString().trim() !== auth.uid) {
    throw new HttpsError("permission-denied", "not-owner");
  }
  return {machineRef, machine};
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

export const listControlPanelUsers = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const [directorySnap, usersSnap] = await Promise.all([
    accountDirectoryCol()
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
    db.collection("users")
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
  ]);

  const map = new Map<string, {
    uid: string;
    email: string;
    displayName: string;
  }>();

  const upsertItem = (
    raw: {uid?: unknown; email?: unknown; displayName?: unknown},
  ) => {
    const uid = (raw.uid || "").toString().trim();
    const email = (raw.email || "").toString().trim();
    const displayName = (raw.displayName || "").toString().trim();
    const key = uid || normalizeEmail(email);
    if (!key) return;
    const current = map.get(key);
    map.set(key, {
      uid: uid || (current?.uid || ""),
      email: email || (current?.email || ""),
      displayName: displayName || (current?.displayName || ""),
    });
  };

  directorySnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  usersSnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  const items = Array.from(map.values()).sort((a, b) => {
    const left = (a.displayName || a.email || a.uid).toLowerCase();
    const right = (b.displayName || b.email || b.uid).toLowerCase();
    return left.localeCompare(right, "en");
  });

  return {ok: true, items};
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


export const generateMachineTagQr = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  const requestedLang = (request.data?.lang || "").toString().trim();
  const {machineRef, machine} = await getOwnedMachineForAuth(auth, machineId);
  const tagId = (machine.tagId || "").toString().trim();
  if (!tagId) {
    throw new HttpsError("failed-precondition", "tag-not-connected");
  }

  const tagSnap = await tagsCol().doc(tagId).get();
  if (!tagSnap.exists) {
    throw new HttpsError("not-found", "tag-not-found");
  }

  const tagUrl = buildMachineTagUrl(tagId, requestedLang);

  const rawSvg = await QRCode.toString(tagUrl, {
    type: "svg",
    width: QR_CANVAS_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
  const qrSvg = decorateQrSvg(rawSvg);

  const qrPath = `tag-qrs/${tagId}.svg`;
  const downloadToken = randomUUID();
  await storageBucket.file(qrPath).save(qrSvg, {
    resumable: false,
    contentType: "image/svg+xml",
    metadata: {
      cacheControl: "private, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });
  const qrUrl = buildStorageDownloadUrl(qrPath, downloadToken);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await Promise.all([
    machineRef.set(
      {
        tagUrl,
        tagQrUrl: qrUrl,
        tagQrPath: qrPath,
        updatedAt: now,
        updatedBy: auth.uid,
      },
      {merge: true},
    ),
    tagsCol().doc(tagId).set(
      {
        tenantId: auth.uid,
        machineId,
        qrUrl,
        qrPath,
        url: tagUrl,
        updatedAt: now,
        updatedBy: auth.uid,
      },
      {merge: true},
    ),
  ]);

  return {ok: true, tagId, tagUrl, qrUrl, qrPath};
});

export const disconnectMachineTag = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = (request.data?.machineId || "").toString().trim();
  const {machineRef, machine} = await getOwnedMachineForAuth(auth, machineId);
  const tagId = (machine.tagId || "").toString().trim();
  const qrPath = (machine.tagQrPath || "").toString().trim();

  if (!tagId) {
    await machineRef.set(
      {
        tagId: null,
        tagUrl: "",
        tagQrUrl: "",
        tagQrPath: "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
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
        updatedAt: now,
        updatedBy: auth.uid,
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
      urlPath: `/es/m.html?tag=${encodeURIComponent(tagId)}`,
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
