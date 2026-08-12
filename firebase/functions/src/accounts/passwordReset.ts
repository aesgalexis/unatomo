import {createHash} from "node:crypto";
import {onCall} from "firebase-functions/v2/https";
import {admin, db, emailOutboxCol} from "../core/firebase";
import {normalizeEmail} from "../core/auth";
import {buildEmailOutbox} from "../email/outbox";
import {getEmailRecipient} from "../email/recipients";

const RESET_COOLDOWN_MS = 60_000;

export const requestAccountPasswordReset = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email || "");
  const language = request.data?.language === "en" ? "en" : "es";
  if (!email || email.length > 320) return {ok: true};

  const emailHash = createHash("sha256").update(email).digest("hex");
  const throttleRef = db.collection("email_request_limits")
    .doc(`password_reset_${emailHash}`);
  const allowed = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(throttleRef);
    const lastRequestAt = snap.data()?.lastRequestAt?.toMillis?.() || 0;
    if (Date.now() - lastRequestAt < RESET_COOLDOWN_MS) return false;
    transaction.set(throttleRef, {
      type: "password_reset",
      lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return true;
  });
  if (!allowed) return {ok: true};

  try {
    const user = await admin.auth().getUserByEmail(email);
    const actionUrl = await admin.auth().generatePasswordResetLink(email);
    const recipient = await getEmailRecipient(email, user.uid);
    const resolvedLanguage = recipient.language || language;
    const notificationId = Date.now().toString(36);
    await emailOutboxCol().doc(`password_reset_${emailHash}_${notificationId}`)
      .set(buildEmailOutbox({
        type: "password_reset",
        to: email,
        language: resolvedLanguage,
        data: {
          displayName: recipient.displayName || user.displayName || "",
          actionUrl,
          expiresText: resolvedLanguage === "en" ? "1 hour" : "1 hora",
        },
        idempotencyKey: `password-reset/${emailHash}/${notificationId}`,
      }));
  } catch {
    // Always return the same response to avoid account enumeration.
  }
  return {ok: true};
});
