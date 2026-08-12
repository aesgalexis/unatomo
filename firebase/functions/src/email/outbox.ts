import {admin} from "../core/firebase";
import {EmailLanguage} from "./templates";

export const welcomeEmailOutboxId = (uid: string) => `welcome_${uid}`;

export const buildWelcomeEmailOutbox = ({
  uid,
  email,
  displayName,
  language,
}: {
  uid: string;
  email: string;
  displayName: string;
  language: EmailLanguage;
}) => ({
  type: "account_welcome",
  to: email,
  language,
  data: {displayName},
  status: "pending",
  attemptCount: 0,
  idempotencyKey: `account-welcome/${uid}`,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
