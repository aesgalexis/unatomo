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

  return {valid: true, code};
});

export const redeemRegistrationCode = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const code = normalizeRegistrationCode(request.data?.code);
  if (!code || !isValidCodeFormat(code)) {
    throw new HttpsError("invalid-argument", "invalid-code");
  }

  try {
    await admin.auth().getUser(auth.uid);
  } catch (error) {
    if ((error as {code?: string})?.code === "auth/user-not-found") {
      throw new HttpsError("unauthenticated", "auth-account-missing");
    }
    throw error;
  }

  const userRef = db.collection("users").doc(auth.uid);
  const codeRef = registrationCodesCol().doc(code);
  const result = await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists) {
      if (userSnap.data()?.regCode !== undefined) {
        transaction.update(userRef, {
          regCode: admin.firestore.FieldValue.delete(),
        });
      }
      return {alreadyRegistered: true};
    }

    const codeSnap = await transaction.get(codeRef);
    const expiresAt = codeSnap.data()?.expiresAt?.toMillis?.() || 0;
    if (!codeSnap.exists || codeSnap.data()?.active === false ||
        (expiresAt && expiresAt <= Date.now())) {
      throw new HttpsError(
        "failed-precondition",
        "registration-code-unavailable",
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    transaction.create(userRef, {
      uid: auth.uid,
      email: cleanProfileText(auth.token.email, 320),
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
