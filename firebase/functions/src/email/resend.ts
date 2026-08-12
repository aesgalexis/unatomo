import {defineSecret} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {admin} from "../core/firebase";
import {EmailLanguage, renderWelcomeEmail} from "./templates";

export const resendApiKey = defineSecret("RESEND_API_KEY");

type OutboxMessage = {
  type?: unknown;
  to?: unknown;
  language?: unknown;
  data?: {displayName?: unknown};
  status?: unknown;
  attemptCount?: unknown;
  idempotencyKey?: unknown;
};

const cleanString = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

const renderMessage = (message: OutboxMessage) => {
  if (message.type !== "account_welcome") {
    throw new Error("unsupported-email-type");
  }
  const displayName = cleanString(message.data?.displayName, 120);
  if (!displayName) throw new Error("missing-display-name");
  const language: EmailLanguage = message.language === "en" ? "en" : "es";
  return renderWelcomeEmail({displayName, language});
};

export const deliverEmailOutbox = onDocumentCreated({
  document: "email_outbox/{messageId}",
  secrets: [resendApiKey],
  retry: true,
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const message = snapshot.data() as OutboxMessage;
  if (message.status === "sent" || message.status === "failed") return;

  const to = cleanString(message.to, 320);
  const idempotencyKey = cleanString(message.idempotencyKey, 256);
  const attemptCount = Number.isInteger(message.attemptCount) ?
    Number(message.attemptCount) + 1 :
    1;
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!to || !idempotencyKey) {
    await snapshot.ref.update({
      status: "failed",
      attemptCount,
      lastError: "invalid-outbox-message",
      updatedAt: now,
    });
    return;
  }

  let rendered;
  try {
    rendered = renderMessage(message);
  } catch (error) {
    await snapshot.ref.update({
      status: "failed",
      attemptCount,
      lastError: error instanceof Error ? error.message : "render-failed",
      updatedAt: now,
    });
    return;
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey.value()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "Unatomo <cuenta@correo.unatomo.com>",
        reply_to: "info@unatomo.com",
        to: [to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [{name: "category", value: "account_welcome"}],
      }),
    });
  } catch (error) {
    await snapshot.ref.update({
      attemptCount,
      lastError: error instanceof Error ? error.message : "network-error",
      lastAttemptAt: now,
      updatedAt: now,
    });
    throw error;
  }

  const body = await response.json().catch(() => ({})) as {
    id?: unknown;
    message?: unknown;
  };
  if (response.ok) {
    await snapshot.ref.update({
      status: "sent",
      attemptCount,
      provider: "resend",
      providerMessageId: cleanString(body.id, 200),
      sentAt: now,
      updatedAt: now,
      lastError: admin.firestore.FieldValue.delete(),
    });
    return;
  }

  const providerError = cleanString(body.message, 500) ||
    `resend-http-${response.status}`;
  if (response.status === 429 || response.status >= 500) {
    await snapshot.ref.update({
      attemptCount,
      lastError: providerError,
      lastAttemptAt: now,
      updatedAt: now,
    });
    throw new Error(providerError);
  }

  await snapshot.ref.update({
    status: "failed",
    attemptCount,
    lastError: providerError,
    lastAttemptAt: now,
    updatedAt: now,
  });
});
