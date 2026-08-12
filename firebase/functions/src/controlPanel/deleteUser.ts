import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {assertControlPanelAccess, normalizeEmail} from "../core/auth";
import {
  accountDirectoryCol,
  accountHandleHistoryCol,
  accountHandlesCol,
  db,
  emailOutboxCol,
  invitesCol,
  linksCol,
  machineAccessCol,
  machinesCol,
  tagsCol,
} from "../core/firebase";
import {
  collectUniqueDocRefs,
  deleteCollectedDocRefs,
  deleteStorageFileIfExists,
} from "../core/storage";
import {buildEmailOutbox} from "../email/outbox";

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
    accountHandleHistorySnap,
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
    accountHandleHistoryCol().where("uid", "==", uid).get(),
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
    accountHandleHistorySnap.docs.map((docSnap) => docSnap.ref),
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

  if (emailLower) {
    const language = userData.language === "en" ? "en" : "es";
    const eventId = Date.now().toString(36);
    await emailOutboxCol().doc(`account_deleted_${uid}_${eventId}`).set(
      buildEmailOutbox({
        type: "account_activity",
        to: emailLower,
        language,
        data: {
          displayName: (userData.displayName || userRecord?.displayName || "")
            .toString(),
          activityTitle: language === "en" ?
            "Account deleted" : "Cuenta eliminada",
          activityDetail: language === "en" ?
            "Your Unatomo account was deleted by an administrator." :
            "Un administrador ha eliminado tu cuenta de Unatomo.",
          occurredAt: new Intl.DateTimeFormat(
            language === "en" ? "en-GB" : "es-ES",
            {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Madrid",
            },
          ).format(new Date()),
        },
        idempotencyKey: `account-deleted/${uid}/${eventId}`,
      }),
    ).catch(() => undefined);
  }

  return {ok: true, uid};
});
