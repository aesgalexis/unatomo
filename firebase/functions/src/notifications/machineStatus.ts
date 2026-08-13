import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {admin, db, emailOutboxCol} from "../core/firebase";
import {buildEmailOutbox} from "../email/outbox";
import {getEmailRecipient, dashboardUrl} from "../email/recipients";

const OUT_OF_SERVICE = "fuera_de_servicio";
const OPERATIONAL = "operativa";

type MachineRecord = {
  ownerUid?: unknown;
  ownerEmail?: unknown;
  title?: unknown;
  status?: unknown;
};

const cleanText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

const eventForStatusTransition = (before: string, after: string) => {
  if (before === OPERATIONAL && after === OUT_OF_SERVICE) {
    return {
      preference: "machineOutOfService",
      type: "machine_out_of_service" as const,
    };
  }
  if (before === OUT_OF_SERVICE && after === OPERATIONAL) {
    return {
      preference: "machineOperationalAgain",
      type: "machine_operational_again" as const,
    };
  }
  return null;
};

export const notifyMachineStatusTransition = onDocumentUpdated(
  "machines/{machineId}",
  async (event) => {
    const before = event.data?.before.data() as MachineRecord | undefined;
    const after = event.data?.after.data() as MachineRecord | undefined;
    const transition = eventForStatusTransition(
      cleanText(before?.status, 40),
      cleanText(after?.status, 40),
    );
    if (!transition) return;

    const ownerUid = cleanText(after?.ownerUid, 128);
    if (!ownerUid) return;
    const preferences = (await db.collection("user_notification_preferences")
      .doc(ownerUid).get()).data();
    if (
      preferences?.email?.enabled !== true ||
      preferences?.email?.events?.[transition.preference] !== true
    ) return;

    let ownerEmail = cleanText(after?.ownerEmail, 320);
    if (!ownerEmail) {
      ownerEmail = cleanText((await admin.auth().getUser(ownerUid)).email, 320);
    }
    if (!ownerEmail) return;

    const recipient = await getEmailRecipient(ownerEmail, ownerUid);
    const outboxRef = emailOutboxCol().doc(`machine-status-${event.id}`);
    try {
      await outboxRef.create(buildEmailOutbox({
        type: transition.type,
        to: recipient.email,
        language: recipient.language,
        data: {
          displayName: recipient.displayName,
          machineName: cleanText(after?.title, 120),
          actionUrl: dashboardUrl(recipient.language),
        },
        idempotencyKey: `machine-status/${event.id}`,
      }));
    } catch (error) {
      const code = (error as {code?: unknown})?.code;
      if (code !== 6) throw error;
    }
  },
);
