import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {
  admin,
  db,
  emailOutboxCol,
  linksCol,
  machineDomainEventsCol,
} from "../core/firebase";
import {buildEmailOutbox} from "../email/outbox";
import {getEmailRecipient, dashboardUrl} from "../email/recipients";
import {EmailTemplateId} from "../email/templates";
import {
  MachineEventPreference,
  normalizeMachineNotificationPreferences,
  shouldNotifyAdministrator,
  shouldNotifyOwner,
} from "./machineStatusRecipients";

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

type AdminLinkRecord = {
  adminUid?: unknown;
  ownerUid?: unknown;
  status?: unknown;
};

const cleanText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().slice(0, maxLength);

const notificationForEvent = (type: string): {
  preference: MachineEventPreference;
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

    const linkSnapshot = await linksCol()
      .where("machineId", "==", machineId)
      .get();
    const administratorUids = [...new Set(linkSnapshot.docs
      .map((snapshot) => snapshot.data() as AdminLinkRecord)
      .filter((link) =>
        cleanText(link.ownerUid, 128) === ownerUid &&
        cleanText(link.status, 24) === "accepted",
      )
      .map((link) => cleanText(link.adminUid, 128))
      .filter((uid) => uid && uid !== ownerUid))];
    const preferenceUids = [ownerUid, ...administratorUids];
    const preferenceSnapshots = await db.getAll(...preferenceUids.map((uid) =>
      db.collection("user_notification_preferences").doc(uid),
    ));
    const preferences = new Map(preferenceSnapshots.map((snapshot, index) => [
      preferenceUids[index],
      normalizeMachineNotificationPreferences(snapshot.data()),
    ]));
    const ownerPreferences = preferences.get(ownerUid);
    if (!ownerPreferences) return;

    const recipientUids = administratorUids.filter((uid) => {
      const administratorPreferences = preferences.get(uid);
      return administratorPreferences ? shouldNotifyAdministrator(
        ownerPreferences,
        administratorPreferences,
        notification.preference,
      ) : false;
    });
    if (shouldNotifyOwner(ownerPreferences, notification.preference)) {
      recipientUids.unshift(ownerUid);
    }

    await Promise.all(recipientUids.map(async (recipientUid) => {
      let email = recipientUid === ownerUid ?
        cleanText(after?.ownerEmail, 320) : "";
      if (!email) {
        email = cleanText(
          (await admin.auth().getUser(recipientUid)).email,
          320,
        );
      }
      if (!email) return;
      const recipient = await getEmailRecipient(email, recipientUid);
      const outboxRef = emailOutboxCol()
        .doc(`machine-status-${eventId}-${recipientUid}`);
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
          idempotencyKey: `machine-status/${eventId}/${recipientUid}`,
        }));
      } catch (error) {
        const code = (error as {code?: unknown})?.code;
        if (code !== 6) throw error;
      }
    }));
  },
);
