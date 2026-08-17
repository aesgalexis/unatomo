import * as admin from "firebase-admin";
import {userNotificationsCol} from "../core/firebase";

export type UserNotificationType =
  | "admin_invite_accepted"
  | "admin_invite_rejected"
  | "admin_access_removed"
  | "admin_left_machine"
  | "transfer_accepted"
  | "transfer_rejected"
  | "transfer_canceled"
  | "task_assigned";

type NotificationInput = {
  recipientUid: string;
  type: UserNotificationType;
  machineId?: string;
  machineTitle?: string;
  actorUid?: string;
  actorLabel?: string;
  taskId?: string;
  taskTitle?: string;
  actionUrl?: string;
  dedupeKey: string;
};

export const writeUserNotification = async (input: NotificationInput) => {
  const recipientUid = (input.recipientUid || "").trim();
  if (!recipientUid) return;
  const id = `${recipientUid}_${input.dedupeKey}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 1400);
  await userNotificationsCol().doc(id).set({
    recipientUid,
    type: input.type,
    machineId: input.machineId || "",
    machineTitle: input.machineTitle || "",
    actorUid: input.actorUid || "",
    actorLabel: input.actorLabel || "",
    taskId: input.taskId || "",
    taskTitle: input.taskTitle || "",
    actionUrl: input.actionUrl || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    readAt: null,
    schemaVersion: 1,
  }, {merge: true});
};
