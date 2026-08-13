import {HttpsError, onCall} from "firebase-functions/v2/https";
import {
  admin,
  db,
  linksCol,
  machineAccessCol,
  machineDomainEventsCol,
  machinesCol,
} from "../core/firebase";
import {
  buildMachineStatusTransition,
  MachineStatus,
  normalizeMachineStatus,
} from "./statusTransitions";

const ALLOWED_STATUSES = new Set([
  "operativa",
  "fuera_de_servicio",
  "desconectada",
]);

const clean = (value: unknown, max: number) =>
  (value || "").toString().trim().slice(0, max);

const cleanOperationId = (value: unknown) => {
  const operationId = clean(value, 120);
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(operationId)) {
    throw new HttpsError("invalid-argument", "operationId-invalid");
  }
  return operationId;
};

const statusResult = (
  machineId: string,
  machine: FirebaseFirestore.DocumentData,
  operationId: string,
) => ({
  ok: true,
  operationId,
  machineId,
  status: normalizeMachineStatus(machine.status),
  tasks: Array.isArray(machine.tasks) ? machine.tasks : [],
  logs: Array.isArray(machine.logs) ? machine.logs : [],
  activeStatusCycleId: clean(machine.activeStatusCycleId, 200),
  restoreTaskId: clean(machine.lastStatusRestoreTaskId, 160),
  eventId: clean(machine.lastStatusEventId, 220),
});

export const transitionMachineStatus = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "auth-required");
  const machineId = clean(request.data?.machineId, 160);
  const targetStatus = clean(request.data?.targetStatus, 40);
  const operationId = cleanOperationId(request.data?.operationId);
  if (!machineId || !ALLOWED_STATUSES.has(targetStatus)) {
    throw new HttpsError("invalid-argument", "status-transition-invalid");
  }
  const actor = clean(
    request.data?.actor || auth.token.name || auth.token.email,
    160,
  ) || "Administrador";
  const occurredAt = new Date().toISOString();
  const machineRef = machinesCol().doc(machineId);

  return db.runTransaction(async (transaction) => {
    const machineSnap = await transaction.get(machineRef);
    if (!machineSnap.exists) {
      throw new HttpsError("not-found", "machine-not-found");
    }
    const machine = machineSnap.data() || {};
    const ownerUid = clean(machine.ownerUid || machine.tenantId, 128);
    if (ownerUid !== auth.uid) {
      const linkRef = linksCol().doc(`${machineId}_${auth.uid}`);
      const linkSnap = await transaction.get(linkRef);
      const link = linkSnap.data() || {};
      if (
        !linkSnap.exists ||
        clean(link.adminUid, 128) !== auth.uid ||
        clean(link.ownerUid, 128) !== ownerUid ||
        clean(link.status, 40) !== "accepted"
      ) {
        throw new HttpsError("permission-denied", "not-machine-manager");
      }
    }

    if (clean(machine.lastStatusOperationId, 120) === operationId) {
      return statusResult(machineId, machine, operationId);
    }

    const result = buildMachineStatusTransition({
      machineId,
      machine,
      targetStatus: targetStatus as MachineStatus,
      actor,
      operationId,
      occurredAt,
      language: request.data?.language === "en" ? "en" : "es",
      restoreTaskId: clean(request.data?.restoreTaskId, 160),
      restoreTitle: clean(request.data?.restoreTitle, 64),
      restoreDescription: clean(request.data?.restoreDescription, 1024),
      note: clean(request.data?.note, 512),
      attachments: Array.isArray(request.data?.attachments) ?
        request.data.attachments.slice(0, 10).map((raw: unknown) => {
          const attachment = raw && typeof raw === "object" ?
            raw as Record<string, unknown> : {};
          return {
            id: clean(attachment.id, 200),
            documentId: clean(attachment.documentId, 200),
            name: clean(attachment.name || attachment.displayName, 120),
            url: clean(attachment.url, 2000),
            storagePath: clean(attachment.storagePath, 1000),
            contentType: clean(attachment.contentType, 160),
            uploadedAt: clean(attachment.uploadedAt, 40),
            uploadedBy: actor,
          };
        }).filter((attachment: {url: string}) => !!attachment.url) : [],
    });
    if (!result.changed) return statusResult(machineId, machine, operationId);

    const eventId = result.eventType ?
      `machine-status-${machineId}-${operationId}` : "";
    const nextMachine = {
      ...machine,
      ...result.patch,
      lastStatusOperationId: operationId,
      lastStatusRestoreTaskId: result.restoreTaskId,
      lastStatusEventId: eventId,
    };
    transaction.update(machineRef, {
      ...result.patch,
      lastStatusOperationId: operationId,
      lastStatusRestoreTaskId: result.restoreTaskId,
      lastStatusEventId: eventId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    });
    const tagId = clean(machine.tagId, 80);
    if (tagId) {
      transaction.set(machineAccessCol().doc(tagId), {
        ...result.patch,
        lastStatusOperationId: operationId,
        lastStatusRestoreTaskId: result.restoreTaskId,
        lastStatusEventId: eventId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
      }, {merge: true});
    }

    if (result.eventType) {
      transaction.create(machineDomainEventsCol().doc(eventId), {
        id: eventId,
        type: result.eventType,
        machineId,
        ownerUid,
        actor: {
          uid: auth.uid,
          label: actor,
          source: "dashboard",
        },
        occurredAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        schemaVersion: 1,
        data: {
          previousStatus: result.previousStatus,
          currentStatus: result.currentStatus,
          statusCycleId: result.statusCycleId,
          restoreTaskId: result.restoreTaskId,
        },
      });
    }
    return statusResult(machineId, nextMachine, operationId);
  });
});
