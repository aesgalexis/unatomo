import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  generateRegistrationCode,
  normalizeRegistrationCode,
} from "../core/codes";
import {assertControlPanelAccess} from "../core/auth";
import {db, registrationCodesCol} from "../core/firebase";

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

  const batch = db.batch();
  refs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  return {ok: true, code};
});

export const cleanupControlPanelLegacyRegistrationCodeLinks = onCall(
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "auth-required");
    assertControlPanelAccess(auth);

    const usersSnap = await db.collection("users").get();
    const legacyUsers = usersSnap.docs.filter(
      (docSnap) => docSnap.data()?.regCode !== undefined,
    );

    for (let offset = 0; offset < legacyUsers.length; offset += 450) {
      const batch = db.batch();
      legacyUsers.slice(offset, offset + 450).forEach((docSnap) => {
        batch.update(docSnap.ref, {
          regCode: admin.firestore.FieldValue.delete(),
        });
      });
      await batch.commit();
    }

    return {ok: true, cleaned: legacyUsers.length};
  },
);
