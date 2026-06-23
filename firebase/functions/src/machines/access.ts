import {HttpsError} from "firebase-functions/v2/https";
import {
  db,
  linksCol,
  machinesCol,
} from "../core/firebase";

export const assertRegisteredAccount = async (
  auth: {uid?: string | null} | null | undefined,
) => {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "auth-required");
  const userSnap = await db.collection("users").doc(auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "account-not-registered");
  }
};

export const isAcceptedAdminOfMachine = async (
  uid: string,
  ownerUid: string,
  machineId: string,
) => {
  const linkSnap = await linksCol().doc(`${machineId}_${uid}`).get();
  if (!linkSnap.exists) return false;
  const link = linkSnap.data() || {};
  return (
    (link.adminUid || "").toString() === uid &&
    (link.ownerUid || "").toString() === ownerUid &&
    (link.status || "").toString() === "accepted"
  );
};

export const getManagedMachineForAuth = async (
  auth: {uid?: string | null} | null | undefined,
  machineId: string,
) => {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "auth-required");
  const safeMachineId = (machineId || "").toString().trim();
  if (!safeMachineId) {
    throw new HttpsError("invalid-argument", "machineId-required");
  }
  const machineRef = machinesCol().doc(safeMachineId);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  const ownerUid = (machine.ownerUid || machine.tenantId || "")
    .toString()
    .trim();
  if (
    ownerUid !== auth.uid &&
    !(await isAcceptedAdminOfMachine(auth.uid, ownerUid, safeMachineId))
  ) {
    throw new HttpsError("permission-denied", "not-machine-manager");
  }
  return {machineRef, machine, ownerUid};
};
