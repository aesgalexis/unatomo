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
import {createHash} from "node:crypto";

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
