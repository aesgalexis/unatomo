import {createHash} from "crypto";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {
  adminInviteEmailBatchesCol,
  db,
  emailOutboxCol,
  invitesCol,
} from "../core/firebase";
import {buildEmailOutbox} from "../email/outbox";
import {dashboardUrl} from "../email/recipients";
import {EmailLanguage} from "../email/templates";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_BATCHES_PER_RUN = 100;

type QueueAdminInviteEmailInput = {
  ownerUid: string;
  actorName: string;
  recipientEmail: string;
  recipientLanguage: EmailLanguage;
  recipientDisplayName: string;
  machineId: string;
  machineName: string;
  inviteId: string;
};

const batchIdFor = (ownerUid: string, recipientEmail: string) =>
  createHash("sha256")
    .update(`${ownerUid}\n${recipientEmail.toLowerCase()}`)
    .digest("hex");

export const queueAdminInviteEmail = async (
  input: QueueAdminInviteEmailInput,
) => {
  const batchRef = adminInviteEmailBatchesCol().doc(
    batchIdFor(input.ownerUid, input.recipientEmail),
  );

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(batchRef);
    const previous = snapshot.data() || {};
    const collecting = previous.status === "collecting";
    const generation = collecting ?
      Number(previous.generation || 1) : Number(previous.generation || 0) + 1;
    const machines = collecting && Array.isArray(previous.machines) ?
      previous.machines.filter((machine: {id?: string}) =>
        machine?.id !== input.machineId) : [];
    machines.push({
      id: input.machineId,
      name: input.machineName,
      inviteId: input.inviteId,
    });

    transaction.set(batchRef, {
      ownerUid: input.ownerUid,
      actorName: input.actorName,
      recipientEmail: input.recipientEmail,
      recipientLanguage: input.recipientLanguage,
      recipientDisplayName: input.recipientDisplayName,
      machines,
      generation,
      status: "collecting",
      sendAfter: admin.firestore.Timestamp.fromMillis(Date.now() + WINDOW_MS),
      createdAt: collecting && previous.createdAt ?
        previous.createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

export const flushAdminInviteEmailBatches = onSchedule(
  {schedule: "every 1 minutes", timeZone: "Europe/Madrid"},
  async () => {
    const due = await adminInviteEmailBatchesCol()
      .where("status", "==", "collecting")
      .where("sendAfter", "<=", admin.firestore.Timestamp.now())
      .limit(MAX_BATCHES_PER_RUN)
      .get();

    await Promise.all(due.docs.map(async (batchSnapshot) => {
      await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(batchSnapshot.ref);
        const current = currentSnapshot.data() || {};
        const sendAfter = current.sendAfter as admin.firestore.Timestamp;
        if (
          current.status !== "collecting" ||
          !sendAfter ||
          sendAfter.toMillis() > Date.now()
        ) return;

        const queuedMachines = Array.isArray(current.machines) ?
          current.machines : [];
        if (!queuedMachines.length || !current.recipientEmail) return;
        const machines = [];
        for (const machine of queuedMachines) {
          const inviteId = (machine?.inviteId || "").toString();
          if (!inviteId) continue;
          const invite = await transaction.get(invitesCol().doc(inviteId));
          if (invite.data()?.status === "pending") machines.push(machine);
        }
        if (!machines.length) {
          transaction.update(batchSnapshot.ref, {
            status: "discarded",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }
        const generation = Number(current.generation || 1);
        const outboxId = `admin_invite_batch_${batchSnapshot.id}_${generation}`;
        const names = machines
          .map((machine: {name?: string}) => (machine?.name || "").trim())
          .filter(Boolean);

        transaction.create(emailOutboxCol().doc(outboxId), buildEmailOutbox({
          type: "admin_invite",
          to: current.recipientEmail,
          language: current.recipientLanguage === "en" ? "en" : "es",
          data: {
            displayName: current.recipientDisplayName || "",
            actorName: current.actorName || "",
            machineName: names[0] || "",
            machineCount: machines.length,
            machineNames: names.slice(0, 5),
            actionUrl: dashboardUrl(
              current.recipientLanguage === "en" ? "en" : "es",
            ),
          },
          idempotencyKey:
            `admin-invite-batch/${batchSnapshot.id}/${generation}`,
        }));
        transaction.update(batchSnapshot.ref, {
          status: "queued",
          outboxId,
          queuedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }));
  },
);
