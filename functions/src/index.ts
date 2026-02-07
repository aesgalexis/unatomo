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

const machinesCol = () => db.collection("machines");
const invitesCol = () => db.collection("admin_machine_invites");
const linksCol = () => db.collection("admin_machine_links");

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
