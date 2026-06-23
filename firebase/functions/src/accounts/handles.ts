import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  ACCOUNT_HANDLE_CHANGE_COOLDOWN_MS,
  ACCOUNT_HANDLE_RESERVATION_MS,
  firestoreValueToMillis,
  getAccountHandleValidationError,
  isExpiredAccountHandle,
  normalizeAccountHandle,
} from "../core/accountHandles";
import {normalizeEmail} from "../core/auth";
import {
  accountDirectoryCol,
  accountHandleHistoryCol,
  accountHandlesCol,
  db,
} from "../core/firebase";

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
  const handleData = handleSnap.data() || {};
  const claimedBy = (handleData.uid || "").toString().trim();
  const expired = handleSnap.exists && isExpiredAccountHandle(handleData);
  return {
    ok: true,
    handle,
    valid: true,
    available: !handleSnap.exists || claimedBy === auth.uid || expired,
    owned: currentHandle === handle && claimedBy === auth.uid,
    reason: handleSnap.exists && claimedBy !== auth.uid && !expired ?
      "handle-taken" : "",
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
    const handleData = handleSnap.data() || {};
    const claimedBy = (handleData.uid || "").toString().trim();
    const expired = handleSnap.exists && isExpiredAccountHandle(handleData);
    if (currentHandle && currentHandle !== handle) {
      throw new HttpsError("failed-precondition", "handle-already-set");
    }
    if (handleSnap.exists && claimedBy !== auth.uid && !expired) {
      throw new HttpsError("already-exists", "handle-taken");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(handleRef, {
      uid: auth.uid,
      handle,
      status: "active",
      redirectTo: "",
      reservedUntil: "",
      createdAt: claimedBy === auth.uid ? handleData.createdAt || now : now,
      updatedAt: now,
    });
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

export const changeAccountHandle = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const nextHandle = normalizeAccountHandle(request.data?.handle);
  const validationError = getAccountHandleValidationError(nextHandle);
  if (validationError) {
    throw new HttpsError("invalid-argument", validationError);
  }

  const userRef = db.collection("users").doc(auth.uid);
  const nextHandleRef = accountHandlesCol().doc(nextHandle);
  const historyRef = accountHandleHistoryCol().doc();
  const emailLower = normalizeEmail(auth.token?.email || "");
  const directoryRef = emailLower ?
    accountDirectoryCol().doc(emailLower) :
    null;
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "profile-required");
    }
    const userData = userSnap.data() || {};
    const previousHandle = normalizeAccountHandle(userData.accountHandle);
    if (!previousHandle) {
      throw new HttpsError("failed-precondition", "handle-required");
    }
    if (previousHandle === nextHandle) return;

    const changedAt = firestoreValueToMillis(userData.accountHandleChangedAt);
    if (changedAt &&
        Date.now() - changedAt < ACCOUNT_HANDLE_CHANGE_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "handle-change-cooldown");
    }

    const previousHandleRef = accountHandlesCol().doc(previousHandle);
    const [previousSnap, nextSnap] = await Promise.all([
      tx.get(previousHandleRef),
      tx.get(nextHandleRef),
    ]);
    const nextData = nextSnap.data() || {};
    const nextOwnerUid = (nextData.uid || "").toString().trim();
    const nextExpired = nextSnap.exists && isExpiredAccountHandle(nextData);
    if (nextSnap.exists && nextOwnerUid !== auth.uid && !nextExpired) {
      throw new HttpsError("already-exists", "handle-taken");
    }

    const now = admin.firestore.Timestamp.now();
    const reservedUntil = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + ACCOUNT_HANDLE_RESERVATION_MS,
    );
    tx.set(previousHandleRef, {
      uid: auth.uid,
      handle: previousHandle,
      status: "reserved",
      redirectTo: nextHandle,
      reservedUntil,
      createdAt: previousSnap.data()?.createdAt || now,
      updatedAt: now,
    });
    tx.set(nextHandleRef, {
      uid: auth.uid,
      handle: nextHandle,
      status: "active",
      redirectTo: "",
      reservedUntil: "",
      createdAt: nextOwnerUid === auth.uid ? nextData.createdAt || now : now,
      updatedAt: now,
    });
    tx.set(userRef, {
      accountHandle: nextHandle,
      accountHandleNormalized: nextHandle,
      accountHandleChangedAt: now,
      updatedAt: now,
    }, {merge: true});
    if (directoryRef) {
      tx.set(directoryRef, {
        uid: auth.uid,
        email: auth.token?.email || emailLower,
        emailLower,
        accountHandle: nextHandle,
        updatedAt: now,
      }, {merge: true});
    }
    tx.create(historyRef, {
      uid: auth.uid,
      previousHandle,
      newHandle: nextHandle,
      changedAt: now,
      reservedUntil,
    });
  });

  return {ok: true, handle: nextHandle};
});

