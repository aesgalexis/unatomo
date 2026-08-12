import {HttpsError, onCall} from "firebase-functions/v2/https";
import {assertVerifiedEmail, normalizeEmail} from "../core/auth";
import {admin, accountDirectoryCol, db, emailOutboxCol} from "../core/firebase";
import {buildEmailOutbox} from "../email/outbox";
import {getEmailRecipient} from "../email/recipients";
import {EmailLanguage} from "../email/templates";

const RECENT_AUTH_SECONDS = 5 * 60;
const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

const requireRecentAccountAuth = (request: {auth?: {
  uid: string;
  token: Record<string, unknown>;
} | null}) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const authTime = Number(auth.token.auth_time || 0);
  if (!authTime || Date.now() / 1000 - authTime > RECENT_AUTH_SECONDS) {
    throw new HttpsError("failed-precondition", "recent-login-required");
  }
  return auth;
};

const formatOccurredAt = (language: EmailLanguage) =>
  new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es-ES", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
  }).format(new Date());

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${local.length > 2 ? "***" : "*"}@${domain}`;
};

export const resendAccountEmailVerification = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const user = await admin.auth().getUser(auth.uid);
  if (user.emailVerified) return {ok: true, alreadyVerified: true};
  const email = normalizeEmail(user.email || "");
  if (!email) throw new HttpsError("failed-precondition", "email-required");
  const recipient = await getEmailRecipient(email, auth.uid);
  const language = recipient.language;
  const stateRef = db.collection("email_verification_requests").doc(auth.uid);
  const stateSnap = await stateRef.get();
  const lastSentAt = stateSnap.data()?.lastSentAt?.toMillis?.() || 0;
  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    return {ok: true, throttled: true};
  }
  const generatedActionUrl = await admin.auth()
    .generateEmailVerificationLink(email);
  const localizedActionUrl = new URL(generatedActionUrl);
  localizedActionUrl.searchParams.set("lang", language);
  const eventId = Date.now().toString(36);
  const batch = db.batch();
  batch.set(stateRef, {
    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
  batch.set(emailOutboxCol().doc(
    `email_verification_${auth.uid}_${eventId}`,
  ), buildEmailOutbox({
    type: "email_verification",
    to: email,
    language,
    data: {
      displayName: recipient.displayName || user.displayName || "",
      actionUrl: localizedActionUrl.toString(),
      expiresText: language === "en" ? "24 hours" : "24 horas",
    },
    idempotencyKey: `email-verification/${auth.uid}/${eventId}`,
  }));
  await batch.commit();
  return {ok: true, sent: true};
});

export const changeAccountPassword = onCall(async (request) => {
  const auth = requireRecentAccountAuth(request);
  assertVerifiedEmail(auth);
  const password = (request.data?.password || "").toString();
  if (password.length < 8 || password.length > 128) {
    throw new HttpsError("invalid-argument", "invalid-password");
  }
  const user = await admin.auth().getUser(auth.uid);
  const email = normalizeEmail(user.email || "");
  if (!email) throw new HttpsError("failed-precondition", "email-required");
  const recipient = await getEmailRecipient(email, auth.uid);
  await admin.auth().updateUser(auth.uid, {password});
  const eventId = Date.now().toString(36);
  const notificationQueued = await emailOutboxCol()
    .doc(`password_changed_${auth.uid}_${eventId}`).set(
      buildEmailOutbox({
        type: "password_changed", to: email, language: recipient.language,
        data: {
          displayName: recipient.displayName || user.displayName || "",
          occurredAt: formatOccurredAt(recipient.language),
        },
        idempotencyKey: `password-changed/${auth.uid}/${eventId}`,
      }),
    ).then(() => true).catch(() => false);
  return {ok: true, notificationQueued};
});

export const requestAccountEmailChange = onCall(async (request) => {
  const auth = requireRecentAccountAuth(request);
  assertVerifiedEmail(auth);
  const newEmail = normalizeEmail(request.data?.newEmail || "");
  if (!newEmail || newEmail.length > 320 || !newEmail.includes("@")) {
    throw new HttpsError("invalid-argument", "invalid-email");
  }
  const user = await admin.auth().getUser(auth.uid);
  const oldEmail = normalizeEmail(user.email || "");
  if (!oldEmail || oldEmail === newEmail) {
    throw new HttpsError("invalid-argument", "email-unchanged");
  }
  const existing = await admin.auth().getUserByEmail(newEmail)
    .catch(() => null);
  if (existing && existing.uid !== auth.uid) {
    throw new HttpsError("already-exists", "email-already-in-use");
  }
  const recipient = await getEmailRecipient(oldEmail, auth.uid);
  const language = recipient.language;
  const actionUrl = await admin.auth().generateVerifyAndChangeEmailLink(
    oldEmail, newEmail,
    {url: `https://unatomo.com/nfc/${language}/configuracion.html?emailChange=1`},
  );
  const eventId = Date.now().toString(36);
  const batch = db.batch();
  batch.set(db.collection("account_email_changes").doc(auth.uid), {
    uid: auth.uid, oldEmail, newEmail,
    displayName: recipient.displayName || user.displayName || "",
    language, status: "pending",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(
      Date.now() + EMAIL_CHANGE_TTL_MS,
    ),
  });
  batch.set(emailOutboxCol().doc(`email_change_new_${auth.uid}_${eventId}`),
    buildEmailOutbox({
      type: "email_change_new", to: newEmail, language,
      data: {
        displayName: recipient.displayName || user.displayName || "",
        newEmail, actionUrl,
        expiresText: language === "en" ? "1 hour" : "1 hora",
      },
      idempotencyKey: `email-change-new/${auth.uid}/${eventId}`,
    }));
  await batch.commit();
  return {ok: true};
});

export const finalizeAccountEmailChange = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const pendingRef = db.collection("account_email_changes").doc(auth.uid);
  const [pendingSnap, user] = await Promise.all([
    pendingRef.get(), admin.auth().getUser(auth.uid),
  ]);
  if (!pendingSnap.exists) return {ok: true, completed: false};
  const pending = pendingSnap.data() || {};
  const oldEmail = normalizeEmail(pending.oldEmail || "");
  const newEmail = normalizeEmail(pending.newEmail || "");
  if (pending.status !== "pending" ||
      normalizeEmail(user.email || "") !== newEmail) {
    return {ok: true, completed: false};
  }
  const language: EmailLanguage = pending.language === "en" ? "en" : "es";
  const eventId = Date.now().toString(36);
  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(pendingRef);
    if (fresh.data()?.status !== "pending") return;
    const oldDirectoryRef = accountDirectoryCol().doc(oldEmail);
    const newDirectoryRef = accountDirectoryCol().doc(newEmail);
    const oldDirectory = (await transaction.get(oldDirectoryRef)).data() || {};
    transaction.set(newDirectoryRef, {
      ...oldDirectory, uid: auth.uid, email: newEmail, emailLower: newEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.delete(oldDirectoryRef);
    transaction.set(db.collection("users").doc(auth.uid), {
      email: newEmail, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    const noticeRef = emailOutboxCol()
      .doc(`email_change_old_${auth.uid}_${eventId}`);
    transaction.set(noticeRef,
      buildEmailOutbox({
        type: "email_change_old", to: oldEmail, language,
        data: {
          displayName: (pending.displayName || user.displayName || "")
            .toString(),
          newEmail: maskEmail(newEmail), occurredAt: formatOccurredAt(language),
        },
        idempotencyKey: `email-change-old/${auth.uid}/${eventId}`,
      }));
    transaction.update(pendingRef, {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  return {ok: true, completed: true, email: newEmail};
});
