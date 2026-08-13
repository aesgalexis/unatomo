import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {isControlPanelAuth} from "../core/auth";
import {db, machinesCol} from "../core/firebase";
import {canCreateOwnedMachines} from "./machinePolicy";

const cleanText = (value: unknown, maxLength: number) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, maxLength);

const safeArray = (value: unknown) => Array.isArray(value) ? value : [];
const safeObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const createOwnedMachine = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const input = safeObject(request.data?.machine) as Record<string, unknown>;
  const tagLanguage = request.data?.language === "en" ? "en" : "es";
  const requestedId = cleanText(request.data?.machineId || input.id, 128);
  if (!requestedId || !/^[A-Za-z0-9_-]+$/.test(requestedId)) {
    throw new HttpsError("invalid-argument", "machine-id-invalid");
  }

  const machineRef = machinesCol().doc(requestedId);
  const ownerQuery = machinesCol().where("ownerUid", "==", auth.uid);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const result = await db.runTransaction(async (transaction) => {
    const [existingSnap, ownedSnap] = await Promise.all([
      transaction.get(machineRef),
      transaction.get(ownerQuery),
    ]);
    if (existingSnap.exists) {
      const existingOwner = (existingSnap.data()?.ownerUid || "").toString();
      if (existingOwner !== auth.uid) {
        throw new HttpsError("permission-denied", "machine-owned-by-other");
      }
      return {alreadyExists: true};
    }
    if (!canCreateOwnedMachines(ownedSnap.size, 1, isControlPanelAuth(auth))) {
      throw new HttpsError("resource-exhausted", "owned-machine-limit");
    }

    transaction.create(machineRef, {
      id: requestedId,
      ownerUid: auth.uid,
      tenantId: auth.uid,
      ownerEmail: cleanText(auth.token.email, 320),
      title: cleanText(input.title, 120) || "Equipo",
      brand: cleanText(input.brand, 120),
      model: cleanText(input.model, 120),
      serial: cleanText(input.serial, 120),
      year: Number.isInteger(input.year) ? input.year : null,
      location: cleanText(input.location, 160),
      status: ["operativa", "fuera_de_servicio", "desconectada"]
        .includes((input.status || "").toString()) ? input.status : "operativa",
      tagId: null,
      tagUrl: "",
      tagQrUrl: "",
      tagQrPath: "",
      tagQrSize: 0,
      tagLanguage,
      documents: {},
      logs: safeArray(input.logs),
      tasks: safeArray(input.tasks),
      order: Number.isFinite(input.order) ? input.order : 0,
      users: safeArray(input.users),
      accessRolePermissions: safeObject(input.accessRolePermissions),
      adminEmail: "",
      adminName: "",
      adminStatus: "",
      ownershipTransferEmail: "",
      ownershipTransferStatus: "",
      activeStatusCycleId: "",
      createdAt: now,
      updatedAt: now,
      updatedBy: auth.uid,
    });
    return {alreadyExists: false};
  });

  return {ok: true, machineId: requestedId, ...result};
});
