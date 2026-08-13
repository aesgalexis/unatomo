import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {
  admin,
  db,
  emailOutboxCol,
  machineDomainEventsCol,
} from "../core/firebase";
import {buildEmailOutbox} from "../email/outbox";
import {getEmailRecipient, dashboardUrl} from "../email/recipients";
import {EmailTemplateId} from "../email/templates";

type MachineRecord = {
  lastStatusEventId?: unknown;
  ownerUid?: unknown;
  ownerEmail?: unknown;
  title?: unknown;
};

type MachineEventRecord = {
  type?: unknown;
  machineId?: unknown;
  ownerUid?: unknown;
};

const cleanText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

const notificationForEvent = (type: string): {
  preference: string;
  type: EmailTemplateId;
} | null => {
  if (type === "machine_out_of_service") {
    return {preference: "machineOutOfService", type};
  }
  if (type === "machine_operational_again") {
    return {preference: "machineOperationalAgain", type};
  }
  return null;
};

// Keep the existing deployed machines/{machineId} update trigger identity.
// The marker only addresses the canonical event; lifecycle meaning lives in
// machine_domain_events and is never inferred here from status fields.
export const notifyMachineStatusTransition = onDocumentUpdated(
  "machines/{machineId}",
  async (event) => {
    const before = event.data?.before.data() as MachineRecord | undefined;
    const after = event.data?.after.data() as MachineRecord | undefined;
    const eventId = cleanText(after?.lastStatusEventId, 220);
    if (
      !eventId ||
      eventId === cleanText(before?.lastStatusEventId, 220)
    ) return;

    const eventSnap = await machineDomainEventsCol().doc(eventId).get();
    const domainEvent = eventSnap.data() as MachineEventRecord | undefined;
    const machineId = cleanText(event.params.machineId, 160);
    const ownerUid = cleanText(after?.ownerUid, 128);
    if (
      !eventSnap.exists ||
      cleanText(domainEvent?.machineId, 160) !== machineId ||
      cleanText(domainEvent?.ownerUid, 128) !== ownerUid
    ) return;
    const notification = notificationForEvent(
      cleanText(domainEvent?.type, 80),
    );
    if (!notification) return;

    const preferences = (await db.collection("user_notification_preferences")
      .doc(ownerUid).get()).data();
    if (
      preferences?.email?.enabled !== true ||
      preferences?.email?.events?.[notification.preference] !== true
    ) return;

    let ownerEmail = cleanText(after?.ownerEmail, 320);
    if (!ownerEmail) {
      ownerEmail = cleanText((await admin.auth().getUser(ownerUid)).email, 320);
    }
    if (!ownerEmail) return;

    const recipient = await getEmailRecipient(ownerEmail, ownerUid);
    const outboxRef = emailOutboxCol().doc(`machine-status-${eventId}`);
    try {
      await outboxRef.create(buildEmailOutbox({
        type: notification.type,
        to: recipient.email,
        language: recipient.language,
        data: {
          displayName: recipient.displayName,
          machineName: cleanText(after?.title, 120),
          actionUrl: dashboardUrl(recipient.language),
        },
        idempotencyKey: `machine-status/${eventId}`,
      }));
    } catch (error) {
      const code = (error as {code?: unknown})?.code;
      if (code !== 6) throw error;
    }
  },
);
