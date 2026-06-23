import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {normalizeEmail} from "../core/auth";
import {
  accountDirectoryCol,
  db,
  linksCol,
  machineAccessCol,
  machinesCol,
  tagsCol,
  transferInvitesCol,
} from "../core/firebase";
import {
  deleteStorageFileIfExists,
  rewriteMachineDocumentStorageRefs,
} from "../core/storage";
import {
  assertAccountStorageAvailable,
  getMachineDocumentsStorageBytes,
  getMachineQrStorageBytes,
} from "../core/storageQuota";

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
