import {HttpsError, onCall} from "firebase-functions/v2/https";
import {assertControlPanelAccess} from "../core/auth";
import {admin, emailOutboxCol} from "../core/firebase";

const DELIVERY_STATUSES = ["pending", "sent", "failed"] as const;
type DeliveryStatus = typeof DELIVERY_STATUSES[number];

const cleanString = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

const toIsoString = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value &&
      typeof (value as {toDate?: unknown}).toDate === "function") {
    return (value as {toDate: () => Date}).toDate().toISOString();
  }
  return "";
};

const maskEmail = (value: unknown) => {
  const email = cleanString(value, 320);
  const separator = email.lastIndexOf("@");
  if (separator < 1) return "";
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  return `${local.slice(0, 2)}${local.length > 2 ? "***" : "*"}@${domain}`;
};

export const listControlPanelEmailDeliveries = onCall(async (request) => {
  assertControlPanelAccess(request.auth);
  const requestedStatus = cleanString(request.data?.status, 20);
  const status = DELIVERY_STATUSES.includes(requestedStatus as DeliveryStatus) ?
    requestedStatus as DeliveryStatus : "";
  const requestedType = cleanString(request.data?.type, 80);

  const [pending, sent, failed, recent] = await Promise.all([
    emailOutboxCol().where("status", "==", "pending").count().get(),
    emailOutboxCol().where("status", "==", "sent").count().get(),
    emailOutboxCol().where("status", "==", "failed").count().get(),
    emailOutboxCol().orderBy("createdAt", "desc").limit(100).get(),
  ]);

  const items = recent.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    } as {id: string} & Record<string, unknown>))
    .filter((item) => !status || item.status === status)
    .filter((item) => !requestedType || item.type === requestedType)
    .slice(0, 50)
    .map((item) => ({
      id: item.id,
      type: cleanString(item.type, 80),
      recipient: maskEmail(item.to),
      language: item.language === "en" ? "en" : "es",
      status: DELIVERY_STATUSES.includes(item.status as DeliveryStatus) ?
        item.status : "pending",
      attemptCount: Number.isInteger(item.attemptCount) ? item.attemptCount : 0,
      createdAt: toIsoString(item.createdAt),
      sentAt: toIsoString(item.sentAt),
      lastAttemptAt: toIsoString(item.lastAttemptAt),
      lastError: cleanString(item.lastError, 300),
      retryOf: cleanString(item.retryOf, 200),
    }));

  return {
    totals: {
      all: pending.data().count + sent.data().count + failed.data().count,
      pending: pending.data().count,
      sent: sent.data().count,
      failed: failed.data().count,
    },
    items,
  };
});

export const retryControlPanelEmailDelivery = onCall(async (request) => {
  const auth = request.auth;
  assertControlPanelAccess(auth);
  const messageId = cleanString(request.data?.messageId, 200);
  if (!messageId || messageId.includes("/")) {
    throw new HttpsError("invalid-argument", "invalid-message-id");
  }

  const sourceRef = emailOutboxCol().doc(messageId);
  const retryRef = emailOutboxCol().doc();
  await admin.firestore().runTransaction(async (transaction) => {
    const source = await transaction.get(sourceRef);
    if (!source.exists) throw new HttpsError("not-found", "message-not-found");
    const message = source.data() || {};
    if (message.status !== "failed") {
      throw new HttpsError("failed-precondition", "message-not-failed");
    }
    if (message.retryMessageId) {
      throw new HttpsError("already-exists", "message-already-retried");
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    transaction.create(retryRef, {
      type: message.type,
      to: message.to,
      language: message.language === "en" ? "en" : "es",
      data: message.data || {},
      status: "pending",
      attemptCount: 0,
      idempotencyKey: message.idempotencyKey,
      retryOf: messageId,
      retryRequestedBy: auth?.uid || "superadmin",
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(sourceRef, {
      retryMessageId: retryRef.id,
      retriedAt: now,
      updatedAt: now,
    });
  });

  return {ok: true, messageId: retryRef.id};
});
