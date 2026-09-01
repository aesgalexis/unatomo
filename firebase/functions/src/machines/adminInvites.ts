import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  getAccountHandleValidationError,
  normalizeAccountHandle,
} from "../core/accountHandles";
import {assertVerifiedEmail, normalizeEmail} from "../core/auth";
import {
  accountDirectoryCol,
  accountHandlesCol,
  db,
  invitesCol,
  linksCol,
  machinesCol,
} from "../core/firebase";
import {getEmailRecipient} from "../email/recipients";
import {queueAdminInviteEmail} from "../notifications/adminInviteEmails";
import {writeUserNotification} from "../notifications/userNotifications";

const resolveInviteeIdentity = async (value: string) => {
  const raw = (value || "").toString().trim();
  if (!raw.startsWith("@")) {
    return {
      adminEmail: raw,
      adminEmailLower: normalizeEmail(raw),
      adminUid: "",
      adminHandle: "",
    };
  }

  const handle = normalizeAccountHandle(raw);
  const validationError = getAccountHandleValidationError(handle);
  if (validationError) {
    throw new HttpsError("invalid-argument", validationError);
  }

  const handleSnap = await accountHandlesCol().doc(handle).get();
  const adminUid = (handleSnap.data()?.uid || "").toString().trim();
  if (!handleSnap.exists || !adminUid) {
    throw new HttpsError("not-found", "account-handle-not-found");
  }

  const directorySnap = await accountDirectoryCol()
    .where("uid", "==", adminUid)
    .limit(1)
    .get();
  const directoryData = directorySnap.docs[0]?.data() || {};
  const adminEmailLower = normalizeEmail(directoryData.emailLower || "");
  const adminEmail = (directoryData.email || adminEmailLower).toString().trim();
  if (!adminEmailLower) {
    throw new HttpsError("not-found", "account-email-not-found");
  }

  return {
    adminEmail,
    adminEmailLower,
    adminUid,
    adminHandle: handle,
  };
};

export const createAdminInvite = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertVerifiedEmail(auth);
  const machineId = (request.data?.machineId || "").toString().trim();
  const adminEmailRaw = (request.data?.adminEmail || "").toString();
  const invitee = await resolveInviteeIdentity(adminEmailRaw);
  const adminEmailLower = invitee.adminEmailLower;
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

  const existingLinks = await linksCol()
    .where("machineId", "==", machineId)
    .get();
  const alreadyAdmin = existingLinks.docs.some((docSnap) => {
    const link = docSnap.data() || {};
    return link.status === "accepted" &&
      normalizeEmail(link.adminEmailLower || link.adminEmail || "") ===
        adminEmailLower;
  });
  if (alreadyAdmin) {
    throw new HttpsError("failed-precondition", "admin-already-assigned");
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
      adminEmail: invitee.adminEmail,
      adminEmailLower,
      adminUid: invitee.adminUid,
      adminHandle: invitee.adminHandle,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {merge: true},
  );

  await machineRef.set(
    {
      adminEmail: invitee.adminEmail,
      adminStatus: "Pendiente aceptación",
    },
    {merge: true},
  );

  const recipient = await getEmailRecipient(
    invitee.adminEmail,
    invitee.adminUid,
  );
  await queueAdminInviteEmail({
    ownerUid: auth.uid,
    actorName: (auth.token.name || ownerEmail).toString(),
    recipientEmail: recipient.email,
    recipientLanguage: recipient.language,
    recipientDisplayName: recipient.displayName,
    machineId,
    machineName: (machine.title || "").toString(),
    inviteId,
  });

  return {ok: true, inviteId};
});

export const createGlobalAdminInvites = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertVerifiedEmail(auth);

  const invitee = await resolveInviteeIdentity(
    (request.data?.adminEmail || "").toString(),
  );
  if (!invitee.adminEmailLower) {
    throw new HttpsError("invalid-argument", "adminEmail-required");
  }

  const machinesSnap = await machinesCol()
    .where("ownerUid", "==", auth.uid)
    .get();
  const ownerEmail = (auth.token.email || "").toString();
  const recipient = await getEmailRecipient(
    invitee.adminEmail,
    invitee.adminUid,
  );
  const result = {
    total: machinesSnap.size,
    invited: 0,
    alreadyAdmin: 0,
    alreadyPending: 0,
    blockedTransfer: 0,
  };

  for (const machineSnap of machinesSnap.docs) {
    const machineId = machineSnap.id;
    const machine = machineSnap.data() || {};
    const transferStatus = (machine.ownershipTransferStatus || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (transferStatus.startsWith("pendiente")) {
      result.blockedTransfer += 1;
      continue;
    }

    const existingLinks = await linksCol()
      .where("machineId", "==", machineId)
      .get();
    const alreadyAdmin = existingLinks.docs.some((docSnap) => {
      const link = docSnap.data() || {};
      return link.status === "accepted" &&
        normalizeEmail(link.adminEmailLower || link.adminEmail || "") ===
          invitee.adminEmailLower;
    });
    if (alreadyAdmin) {
      result.alreadyAdmin += 1;
      continue;
    }

    const inviteId = `${machineId}_${invitee.adminEmailLower}`;
    const inviteRef = invitesCol().doc(inviteId);
    const inviteSnap = await inviteRef.get();
    if (inviteSnap.data()?.status === "pending") {
      result.alreadyPending += 1;
      continue;
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await inviteRef.set({
      ownerUid: auth.uid,
      ownerEmail: ownerEmail || (machine.ownerEmail || "").toString(),
      machineId,
      machineTitle: (machine.title || "").toString(),
      adminEmail: invitee.adminEmail,
      adminEmailLower: invitee.adminEmailLower,
      adminUid: invitee.adminUid,
      adminHandle: invitee.adminHandle,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }, {merge: true});
    await machineSnap.ref.set({
      adminEmail: invitee.adminEmail,
      adminStatus: "Pendiente aceptación",
    }, {merge: true});

    await queueAdminInviteEmail({
      ownerUid: auth.uid,
      actorName: (auth.token.name || ownerEmail).toString(),
      recipientEmail: recipient.email,
      recipientLanguage: recipient.language,
      recipientDisplayName: recipient.displayName,
      machineId,
      machineName: (machine.title || "").toString(),
      inviteId,
    });
    result.invited += 1;
  }

  return {ok: true, ...result};
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
  const invite = await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists) {
      throw new HttpsError("not-found", "invite-not-found");
    }
    const currentInvite = inviteSnap.data() || {};
    if (
      !currentInvite.adminEmailLower ||
      normalizeEmail(currentInvite.adminEmailLower) !== emailLower
    ) {
      throw new HttpsError("permission-denied", "not-invitee");
    }
    if (currentInvite.status !== "pending") {
      throw new HttpsError("failed-precondition", "invite-not-pending");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminName = (auth.token.name || "").toString().trim();
    const machineRef = machinesCol().doc(currentInvite.machineId);
    const linkId = `${currentInvite.machineId}_${auth.uid}`;
    const linkRef = linksCol().doc(linkId);
    const linkSnap = await transaction.get(linkRef);

    if (decision === "accepted") {
      transaction.set(
        linkRef,
        {
          ownerUid: currentInvite.ownerUid,
          ownerEmail: currentInvite.ownerEmail || "",
          machineId: currentInvite.machineId,
          machineTitle: currentInvite.machineTitle || "",
          adminUid: auth.uid,
          adminEmail: currentInvite.adminEmail || "",
          adminEmailLower: currentInvite.adminEmailLower,
          adminName,
          status: "accepted",
          createdAt: now,
          updatedAt: now,
        },
        {merge: true},
      );
      transaction.set(
        inviteRef,
        {
          status: "accepted",
          adminUid: auth.uid,
          respondedAt: now,
          updatedAt: now,
        },
        {merge: true},
      );
      transaction.set(
        machineRef,
        {
          adminEmail: currentInvite.adminEmail || "",
          adminName,
          adminStatus: `Administrado por ${currentInvite.adminEmail || ""}`,
          logs: admin.firestore.FieldValue.arrayUnion({
            ts: new Date().toISOString(),
            type: "admin_accept",
            admin: currentInvite.adminEmail || "",
            user: adminName || currentInvite.adminEmail || "",
          }),
        },
        {merge: true},
      );
    } else {
      transaction.set(
        inviteRef,
        {
          status: "rejected",
          respondedAt: now,
          updatedAt: now,
        },
        {merge: true},
      );
      transaction.set(
        machineRef,
        {
          adminEmail: "",
          adminStatus:
            `Invitación rechazada por ${currentInvite.adminEmail || ""}`,
        },
        {merge: true},
      );
      if (linkSnap.exists) {
        transaction.set(
          linkRef,
          {
            status: "rejected",
            respondedAt: now,
            updatedAt: now,
          },
          {merge: true},
        );
      }
    }
    return currentInvite;
  });

  await writeUserNotification({
    recipientUid: (invite.ownerUid || "").toString(),
    type: decision === "accepted" ?
      "admin_invite_accepted" : "admin_invite_rejected",
    machineId: (invite.machineId || "").toString(),
    machineTitle: (invite.machineTitle || "").toString(),
    actorUid: auth.uid,
    actorLabel: (
      auth.token.name || auth.token.email || invite.adminEmail || ""
    ).toString(),
    actionUrl: "/nfc/es/index.html#/usuarios",
    dedupeKey: `admin-invite-response_${inviteId}_${decision}`,
  });

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
    await writeUserNotification({
      recipientUid: (link.ownerUid || "").toString(),
      type: "admin_left_machine",
      machineId: (link.machineId || "").toString(),
      machineTitle: (link.machineTitle || "").toString(),
      actorUid: auth.uid,
      actorLabel: (
        auth.token.name || auth.token.email || link.adminEmail || ""
      ).toString(),
      actionUrl: "/nfc/es/index.html#/usuarios",
      dedupeKey: `admin-left_${linkId}_${Date.now()}`,
    });
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
  await Promise.all(linkQuery.docs.map(async (docSnap) => {
    const link = docSnap.data() || {};
    await docSnap.ref.set(
      {
        status: "left",
        respondedAt: now,
        updatedAt: now,
      },
      {merge: true},
    );
    if (link.status === "accepted" && link.adminUid) {
      await writeUserNotification({
        recipientUid: (link.adminUid || "").toString(),
        type: "admin_access_removed",
        machineId,
        machineTitle: (machine.title || link.machineTitle || "").toString(),
        actorUid: auth.uid,
        actorLabel: (
          auth.token.name || auth.token.email || machine.ownerEmail || ""
        ).toString(),
        actionUrl: "/nfc/es/index.html#/notificaciones",
        dedupeKey: `admin-removed_${machineId}_${docSnap.id}_${Date.now()}`,
      });
    }
  }));

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
