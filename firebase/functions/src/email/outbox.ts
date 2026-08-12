import {admin} from "../core/firebase";
import {
  EmailLanguage,
  EmailTemplateId,
  EmailTemplateInput,
} from "./templates";

export const welcomeEmailOutboxId = (uid: string) => `welcome_${uid}`;

export const buildWelcomeEmailOutbox = ({
  uid,
  email,
  displayName,
  language,
  verificationUrl,
}: {
  uid: string;
  email: string;
  displayName: string;
  language: EmailLanguage;
  verificationUrl?: string;
}) => ({
  type: "account_welcome",
  to: email,
  language,
  data: {displayName, actionUrl: verificationUrl || ""},
  status: "pending",
  attemptCount: 0,
  idempotencyKey: `account-welcome/${uid}`,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

export const buildEmailOutbox = ({
  type,
  to,
  language,
  data,
  idempotencyKey,
}: {
  type: EmailTemplateId;
  to: string;
  language: EmailLanguage;
  data: EmailTemplateInput;
  idempotencyKey: string;
}) => ({
  type,
  to,
  language,
  data,
  status: "pending",
  attemptCount: 0,
  idempotencyKey,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
