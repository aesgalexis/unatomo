import {HttpsError, onCall} from "firebase-functions/v2/https";
import {admin, db, emailOutboxCol, machinesCol} from "../core/firebase";
import {isControlPanelAuth} from "../core/auth";
import {canCreateOwnedMachines} from "../machines/machinePolicy";
import {
  buildWelcomeEmailOutbox,
  welcomeEmailOutboxId,
} from "../email/outbox";

const cleanText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, maxLength);

export const completeAccountOnboarding = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const displayName = cleanText(request.data?.displayName, 120);
  const company = cleanText(request.data?.company, 60);
  const ownership = request.data?.ownership === "other" ? "other" : "own";
  const requestedCount = Number(request.data?.machineCount);
  const machineCount =
    ownership === "own" && Number.isInteger(requestedCount) ?
      requestedCount :
      0;
  const language = request.data?.language === "en" ? "en" : "es";

  if (!displayName) {
    throw new HttpsError("invalid-argument", "profile-fields-required");
  }
  if (machineCount < 0 || machineCount > 50) {
    throw new HttpsError("invalid-argument", "invalid-machine-count");
  }

  const userRef = db.collection("users").doc(auth.uid);
  const layoutRef = db.collection("dashboard_layout").doc(auth.uid);
  const email = cleanText(auth.token.email, 320);
  const emailLower = email.toLowerCase();
  const directoryRef = emailLower ?
    db.collection("account_directory").doc(emailLower) :
    null;
  const machineRefs = Array.from(
    {length: machineCount},
    () => machinesCol().doc(),
  );
  const welcomeEmailRef = emailOutboxCol().doc(
    welcomeEmailOutboxId(auth.uid),
  );
  let verificationUrl = "";
  if (email && auth.token.email_verified !== true) {
    const generatedActionUrl = await admin.auth()
      .generateEmailVerificationLink(email);
    const localizedActionUrl = new URL(generatedActionUrl);
    localizedActionUrl.searchParams.set("lang", language);
    verificationUrl = localizedActionUrl.toString();
  }

  const result = await db.runTransaction(async (transaction) => {
    const [profileSnap, ownedMachinesSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(machinesCol().where("ownerUid", "==", auth.uid)),
    ]);
    if (!profileSnap.exists) {
      throw new HttpsError("failed-precondition", "profile-missing");
    }
    const profile = profileSnap.data() || {};
    if (profile.onboardingCompletedAt) {
      return {alreadyCompleted: true, machineCount: 0};
    }
    if (profile.onboardingRequired !== true) {
      throw new HttpsError("failed-precondition", "onboarding-not-required");
    }
    if (
      !canCreateOwnedMachines(
        ownedMachinesSnap.size,
        machineCount,
        isControlPanelAuth(auth),
      )
    ) {
      throw new HttpsError("resource-exhausted", "owned-machine-limit");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    transaction.update(userRef, {
      displayName,
      company,
      language,
      onboardingRequired: false,
      onboardingOwnership: ownership,
      onboardingMachineCount: machineCount,
      onboardingCompletedAt: now,
      updatedAt: now,
    });
    transaction.set(layoutRef, {
      dashboardTitle: company || displayName,
      updatedAt: now,
      updatedBy: auth.uid,
    }, {merge: true});
    if (directoryRef) {
      transaction.set(directoryRef, {
        uid: auth.uid,
        email,
        emailLower,
        displayName,
        company,
        language,
        updatedAt: now,
      }, {merge: true});
    }
    machineRefs.forEach((ref, index) => {
      transaction.create(ref, {
        id: ref.id,
        ownerUid: auth.uid,
        tenantId: auth.uid,
        ownerEmail: email,
        title: language === "en" ?
          `Machine ${index + 1}` :
          `Equipo ${index + 1}`,
        brand: "",
        model: "",
        serial: "",
        year: null,
        location: "",
        status: "operativa",
        tagId: null,
        tagUrl: "",
        tagQrUrl: "",
        tagQrPath: "",
        tagQrSize: 0,
        tagLanguage: language,
        documents: {},
        logs: [],
        tasks: [],
        order: index,
        users: [],
        accessRolePermissions: {},
        adminEmail: "",
        adminName: "",
        adminStatus: "",
        ownershipTransferEmail: "",
        ownershipTransferStatus: "",
        activeStatusCycleId: "",
        createdAt: now,
        updatedAt: now,
        updatedBy: auth.uid,
      });
    });
    if (email) {
      transaction.set(welcomeEmailRef, buildWelcomeEmailOutbox({
        uid: auth.uid,
        email,
        displayName,
        language,
        verificationUrl,
      }));
    }
    return {alreadyCompleted: false, machineCount};
  });

  await admin.auth().updateUser(auth.uid, {displayName});
  return {ok: true, ...result};
});
