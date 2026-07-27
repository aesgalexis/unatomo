import {HttpsError, onCall} from "firebase-functions/v2/https";
import {admin, db, linksCol, machinesCol} from "../core/firebase";
import {
  ACCESS_CAPABILITIES,
  getAccessRolePermissions,
  normalizeAccessRole,
} from "./accessRoles";

const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const CALLABLE_OPTIONS = {enforceAppCheck: APP_CHECK_ENFORCED};
const MAX_CONTEXT_MACHINES = 450;

const normalizeUsername = (value: unknown) =>
  (value || "").toString().trim().replace(/\s+/g, " ").toLowerCase();

const cleanString = (value: unknown, maxLength = 500) =>
  (value || "").toString().trim().slice(0, maxLength);

const getContext = async (
  authUid: string,
  ownerUid: string,
  machineIdsValue: unknown,
) => {
  const machineIds = Array.from(new Set(
    (Array.isArray(machineIdsValue) ? machineIdsValue : [])
      .map((value) => cleanString(value, 160))
      .filter(Boolean),
  ));
  if (
    !ownerUid ||
    !machineIds.length ||
    machineIds.length > MAX_CONTEXT_MACHINES
  ) {
    throw new HttpsError("invalid-argument", "invalid-machine-scope");
  }
  const machineRefs = machineIds.map((machineId) =>
    machinesCol().doc(machineId),
  );
  const machineSnaps = await db.getAll(...machineRefs);
  const machines = machineSnaps.map((snap, index) => {
    if (!snap.exists) throw new HttpsError("not-found", "machine-not-found");
    const machine = snap.data() || {};
    const actualOwnerUid = cleanString(
      machine.ownerUid || machine.tenantId,
      160,
    );
    if (actualOwnerUid !== ownerUid) {
      throw new HttpsError("permission-denied", "machine-owner-mismatch");
    }
    return {id: machineIds[index], ref: snap.ref, data: machine};
  });
  if (authUid !== ownerUid) {
    const linkRefs = machineIds.map((machineId) =>
      linksCol().doc(`${machineId}_${authUid}`),
    );
    const linkSnaps = await db.getAll(...linkRefs);
    linkSnaps.forEach((snap, index) => {
      const link = snap.exists ? snap.data() || {} : {};
      if (
        cleanString(link.adminUid, 160) !== authUid ||
        cleanString(link.ownerUid, 160) !== ownerUid ||
        cleanString(link.status, 40) !== "accepted"
      ) {
        throw new HttpsError(
          "permission-denied",
          `not-machine-manager:${machineIds[index]}`,
        );
      }
    });
  }
  return {machineIds, machines};
};

export const saveGlobalLocalUserAccess = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "auth-required");
    }
    const ownerUid = cleanString(request.data?.ownerUid, 160);
    const {machineIds, machines} = await getContext(
      request.auth.uid,
      ownerUid,
      request.data?.machineIds,
    );
    const assignedMachineIds = new Set(
      (Array.isArray(request.data?.assignedMachineIds) ?
        request.data.assignedMachineIds :
        [])
        .map((value: unknown) => cleanString(value, 160))
        .filter((machineId: string) => machineIds.includes(machineId)),
    );
    if (!assignedMachineIds.size) {
      throw new HttpsError("invalid-argument", "assignment-required");
    }
    const rawUser = request.data?.user || {};
    const username = cleanString(rawUser.username, 60).replace(/\s+/g, " ");
    const normalized = normalizeUsername(username);
    const saltBase64 = cleanString(rawUser.saltBase64, 256);
    const passwordHashBase64 = cleanString(rawUser.passwordHashBase64, 256);
    if (!normalized || !saltBase64 || !passwordHashBase64) {
      throw new HttpsError("invalid-argument", "invalid-global-user");
    }
    const registryRef = db.collection("usernames")
      .doc(`${ownerUid}_${normalized}`);
    const registrySnap = await registryRef.get();
    if (rawUser.isNew === true && registrySnap.exists) {
      throw new HttpsError("already-exists", "duplicate-user");
    }
    const role = normalizeAccessRole(rawUser.role);
    const accessScope =
      assignedMachineIds.size === machineIds.length ? "all" : "selected";
    const user = {
      id: cleanString(rawUser.id, 160) ||
        `u_${normalized.replace(/[^a-z0-9_-]/g, "_")}`,
      username,
      role,
      createdAt: cleanString(rawUser.createdAt, 80) || new Date().toISOString(),
      saltBase64,
      passwordHashBase64,
      accessScope,
    };
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    machines.forEach((machine) => {
      const currentUsers = Array.isArray(machine.data.users) ?
        machine.data.users :
        [];
      const withoutUser = currentUsers.filter(
        (item: Record<string, unknown>) =>
          normalizeUsername(item?.username) !== normalized,
      );
      batch.set(machine.ref, {
        users: assignedMachineIds.has(machine.id) ?
          [...withoutUser, user] :
          withoutUser,
        updatedAt: timestamp,
        updatedBy: request.auth?.uid,
      }, {merge: true});
    });
    const referenceMachineId =
      machineIds.find((machineId) => assignedMachineIds.has(machineId)) ||
      machineIds[0];
    batch.set(registryRef, {
      username,
      saltBase64,
      passwordHashBase64,
      role,
      ownerUid,
      machineId: referenceMachineId,
      scope: accessScope,
      machineIds: machineIds.filter((machineId) =>
        assignedMachineIds.has(machineId),
      ),
      updatedAt: timestamp,
      updatedBy: request.auth.uid,
    }, {merge: true});
    await batch.commit();
    return {ok: true};
  },
);

export const deleteGlobalLocalUserAccess = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "auth-required");
    }
    const ownerUid = cleanString(request.data?.ownerUid, 160);
    const normalized = normalizeUsername(request.data?.username);
    if (!normalized) {
      throw new HttpsError("invalid-argument", "username-required");
    }
    const {machineIds, machines} = await getContext(
      request.auth.uid,
      ownerUid,
      request.data?.machineIds,
    );
    const registryRef = db.collection("usernames")
      .doc(`${ownerUid}_${normalized}`);
    const registrySnap = await registryRef.get();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    machines.forEach((machine) => {
      const users = (Array.isArray(machine.data.users) ?
        machine.data.users :
        [])
        .filter((item: Record<string, unknown>) =>
          normalizeUsername(item?.username) !== normalized,
        );
      batch.set(machine.ref, {
        users,
        updatedAt: timestamp,
        updatedBy: request.auth?.uid,
      }, {merge: true});
    });
    if (registrySnap.exists) {
      const registry = registrySnap.data() || {};
      const remainingMachineIds = (Array.isArray(registry.machineIds) ?
        registry.machineIds :
        [])
        .map((value: unknown) => cleanString(value, 160))
        .filter((machineId: string) => !machineIds.includes(machineId));
      if (request.auth.uid === ownerUid || !remainingMachineIds.length) {
        batch.delete(registryRef);
      } else {
        batch.set(registryRef, {
          machineIds: remainingMachineIds,
          machineId: remainingMachineIds[0],
          scope: "selected",
          updatedAt: timestamp,
          updatedBy: request.auth.uid,
        }, {merge: true});
      }
    }
    await batch.commit();
    return {ok: true};
  },
);

export const saveMachineAccessRolePermissionsAccess = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "auth-required");
    }
    const ownerUid = cleanString(request.data?.ownerUid, 160);
    const {machines} = await getContext(
      request.auth.uid,
      ownerUid,
      request.data?.machineIds,
    );
    const configured = request.data?.accessRolePermissions;
    const publicPermissions = getAccessRolePermissions("public", configured);
    ACCESS_CAPABILITIES.forEach((key) => {
      if (!key.startsWith("view")) publicPermissions[key] = false;
    });
    const accessRolePermissions = {
      operator: getAccessRolePermissions("operator", configured),
      technician: getAccessRolePermissions("technician", configured),
      public: publicPermissions,
    };
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    machines.forEach((machine) => {
      batch.set(machine.ref, {
        accessRolePermissions,
        updatedAt: timestamp,
        updatedBy: request.auth?.uid,
      }, {merge: true});
    });
    await batch.commit();
    return {ok: true};
  },
);
