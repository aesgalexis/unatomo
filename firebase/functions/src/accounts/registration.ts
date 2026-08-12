import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {normalizeRegistrationCode} from "../core/codes";
import {db, registrationCodesCol} from "../core/firebase";

const isValidCodeFormat = (code: string) => /^[A-Z0-9_-]{3,32}$/.test(code);

const cleanProfileText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

export const validateRegistrationCode = onCall(async (request) => {
  const code = normalizeRegistrationCode(request.data?.code);
  if (!code || !isValidCodeFormat(code)) {
    return {valid: false, reason: code ? "invalid" : "empty", code};
  }

  const codeSnap = await registrationCodesCol().doc(code).get();
  if (!codeSnap.exists) return {valid: false, reason: "not_found", code};
  if (codeSnap.data()?.active === false) {
    return {valid: false, reason: "inactive", code};
  }
  const expiresAt = codeSnap.data()?.expiresAt?.toMillis?.() || 0;
  if (expiresAt && expiresAt <= Date.now()) {
    return {valid: false, reason: "expired", code};
  }

  const codeData = codeSnap.data() || {};
  const requestSnap = codeData.accessRequestId ?
    await db.collection("access_requests").doc(codeData.accessRequestId).get() :
    null;
  const requestedEmail = cleanProfileText(
    codeData.emailLower || requestSnap?.data()?.emailLower ||
      requestSnap?.data()?.email,
    320,
  ).toLowerCase();
  if (requestedEmail) {
    const existingUser = await admin.auth().getUserByEmail(requestedEmail)
      .catch(() => null);
    if (existingUser) {
      return {valid: false, reason: "existing_account", code};
    }
  }

  return {
    valid: true,
    code,
    email: requestedEmail,
    displayName: cleanProfileText(requestSnap?.data()?.displayName, 120),
  };
});

export const redeemRegistrationCode = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const code = normalizeRegistrationCode(request.data?.code);
  if (!code || !isValidCodeFormat(code)) {
    throw new HttpsError("invalid-argument", "invalid-code");
  }

  let authUser: admin.auth.UserRecord;
  try {
    authUser = await admin.auth().getUser(auth.uid);
  } catch (error) {
    if ((error as {code?: string})?.code === "auth/user-not-found") {
      throw new HttpsError("unauthenticated", "auth-account-missing");
    }
    throw error;
  }

  const userRef = db.collection("users").doc(auth.uid);
  const codeRef = registrationCodesCol().doc(code);
  const result = await db.runTransaction(async (transaction) => {
    const [userSnap, codeSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(codeRef),
    ]);
    const expiresAt = codeSnap.data()?.expiresAt?.toMillis?.() || 0;
    if (!codeSnap.exists || codeSnap.data()?.active === false ||
        (expiresAt && expiresAt <= Date.now())) {
      throw new HttpsError(
        "failed-precondition",
        "registration-code-unavailable",
      );
    }
    if (userSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "registration-profile-already-exists",
      );
    }

    const codeData = codeSnap.data() || {};
    const requestSnap = codeData.accessRequestId ?
      await transaction.get(
        db.collection("access_requests").doc(codeData.accessRequestId),
      ) : null;
    const requestedEmail = cleanProfileText(
      codeData.emailLower || requestSnap?.data()?.emailLower ||
        requestSnap?.data()?.email,
      320,
    ).toLowerCase();
    const authenticatedEmail = cleanProfileText(authUser.email, 320)
      .toLowerCase();
    if (requestedEmail && authenticatedEmail !== requestedEmail) {
      throw new HttpsError(
        "permission-denied",
        "registration-email-mismatch",
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    transaction.create(userRef, {
      uid: auth.uid,
      email: authenticatedEmail,
      displayName: cleanProfileText(request.data?.displayName, 120),
      photoURL: cleanProfileText(request.data?.photoURL, 2048),
      onboardingRequired: true,
      createdAt: now,
      updatedAt: now,
    });
    transaction.delete(codeRef);
    return {alreadyRegistered: false};
  });

  return {ok: true, uid: auth.uid, ...result};
});
