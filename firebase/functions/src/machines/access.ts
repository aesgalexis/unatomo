import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  admin,
  db,
  linksCol,
  machineAccessCol,
  machinesCol,
} from "../core/firebase";
import {
  AccessPermissions,
  getAccessRolePermissions,
  normalizeAccessRole,
} from "./accessRoles";

const MACHINE_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MACHINE_SESSION_CLEANUP_LIMIT = 400;
const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const CALLABLE_OPTIONS = {enforceAppCheck: APP_CHECK_ENFORCED};

export const normalizeMachineUsername = (value: unknown) =>
  (value || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const hashPassword = (password: string, saltBase64: string) =>
  pbkdf2Sync(
    Buffer.from(password, "utf8"),
    Buffer.from(saltBase64, "base64"),
    100000,
    32,
    "sha256",
  ).toString("base64");

const safeEqualBase64 = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "base64");
  const rightBuffer = Buffer.from(right, "base64");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const hashSessionToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("base64");

const getSessionExpiry = (value: unknown) => {
  if (value && typeof (value as {toDate?: unknown}).toDate === "function") {
    return (value as {toDate: () => Date}).toDate().getTime();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
};

const sanitizeDocumentMetadata = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const document = value as Record<string, unknown>;
  return {
    id: (document.id || "").toString(),
    kind: (document.kind || "").toString(),
    name: (document.name || "").toString(),
    displayName: (document.displayName || "").toString(),
    contentType: (document.contentType || "").toString(),
    size: Number(document.size || 0),
    url: (document.url || "").toString(),
    uploadedAt: (document.uploadedAt || "").toString(),
  };
};

const sanitizeDocuments = (value: unknown) => {
  const documents = value && typeof value === "object" ?
    value as Record<string, unknown> :
    {};
  const plate = sanitizeDocumentMetadata(documents.plate);
  const manual = sanitizeDocumentMetadata(documents.manual);
  const other = Array.isArray(documents.other) ?
    documents.other.map(sanitizeDocumentMetadata).filter(Boolean) :
    [];
  return {
    ...(plate ? {plate} : {}),
    ...(manual ? {manual} : {}),
    ...(other.length ? {other} : {}),
  };
};

const sanitizeMachineAccess = (
  data: FirebaseFirestore.DocumentData,
  machine: FirebaseFirestore.DocumentData,
  permissions?: AccessPermissions,
) => ({
  tenantId: (data.tenantId || "").toString(),
  ownerUid: (data.ownerUid || data.tenantId || "").toString(),
  machineId: (data.machineId || "").toString(),
  title: (data.title || "").toString(),
  brand: permissions?.viewMachine ? (data.brand || "").toString() : "",
  model: permissions?.viewMachine ? (data.model || "").toString() : "",
  serial: permissions?.viewMachine ? (data.serial || "").toString() : "",
  year: permissions?.viewMachine ? data.year ?? null : null,
  location: permissions?.viewMachine ? (data.location || "").toString() : "",
  status: (data.status || "operativa").toString(),
  documents: permissions?.viewDocuments ?
    sanitizeDocuments(machine.documents) :
    permissions?.viewPlate && machine.documents?.plate ?
      {plate: sanitizeDocumentMetadata(machine.documents.plate)} :
      {},
  logs: permissions?.viewHistory && Array.isArray(data.logs) ? data.logs : [],
  tasks: permissions?.viewTasks && Array.isArray(data.tasks) ? data.tasks : [],
  accessRolePermissions: machine.accessRolePermissions || {},
});

const sanitizePublicMachine = (
  tagId: string,
  access: FirebaseFirestore.DocumentData,
  machine: FirebaseFirestore.DocumentData,
) => {
  const permissions = getAccessRolePermissions(
    "public",
    machine.accessRolePermissions,
  );
  const documents = permissions.viewDocuments ?
    sanitizeDocuments(machine.documents) :
    permissions.viewPlate && machine.documents?.plate ?
      {plate: sanitizeDocumentMetadata(machine.documents.plate)} :
      {};
  return {
    id: tagId,
    title: (access.title || machine.title || "").toString(),
    brand: permissions.viewMachine ?
      (access.brand || machine.brand || "").toString() :
      "",
    model: permissions.viewMachine ?
      (access.model || machine.model || "").toString() :
      "",
    serial: permissions.viewMachine ? (access.serial || "").toString() : "",
    year: permissions.viewMachine ? access.year ?? null : null,
    location: permissions.viewMachine ? (access.location || "").toString() : "",
    status: (access.status || "operativa").toString(),
    documents,
    logs: permissions.viewHistory && Array.isArray(access.logs) ?
      access.logs :
      [],
    tasks: permissions.viewTasks && Array.isArray(access.tasks) ?
      access.tasks :
      [],
    permissions,
    publicAccess: true,
  };
};

export const getValidMachineSession = async (
  tagId: string,
  sessionId: string,
  sessionToken: string,
) => {
  if (!sessionId || !sessionToken) return null;
  const sessionRef = db.collection("machine_access_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return null;
  const session = sessionSnap.data() || {};
  const expectedHash = (session.tokenHash || "").toString();
  const actualHash = hashSessionToken(sessionToken);
  if (
    (session.tagId || "").toString() !== tagId ||
    getSessionExpiry(session.expiresAt) <= Date.now() ||
    !safeEqualBase64(actualHash, expectedHash)
  ) {
    return null;
  }
  return session;
};

const sameJson = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const assertOperationalPatchAllowed = (
  current: FirebaseFirestore.DocumentData,
  nextStatus: string,
  nextLogs: unknown[],
  nextTasks: Array<Record<string, unknown>>,
  permissions: AccessPermissions,
) => {
  const currentStatus = (current.status || "operativa").toString();
  const currentLogs = Array.isArray(current.logs) ? current.logs : [];
  const currentTasks = Array.isArray(current.tasks) ?
    current.tasks as Array<Record<string, unknown>> :
    [];
  const statusChanged = currentStatus !== nextStatus;
  if (statusChanged && !permissions.changeStatus) {
    throw new HttpsError("permission-denied", "status-change-not-allowed");
  }
  if (
    nextLogs.length < currentLogs.length ||
    !sameJson(nextLogs.slice(0, currentLogs.length), currentLogs)
  ) {
    throw new HttpsError("permission-denied", "history-rewrite-not-allowed");
  }

  const currentById = new Map(
    currentTasks.map((task) => [(task.id || "").toString(), task]),
  );
  const nextById = new Map(
    nextTasks.map((task) => [(task.id || "").toString(), task]),
  );
  const added = nextTasks.filter((task) =>
    !currentById.has((task.id || "").toString()),
  );
  const removed = currentTasks.filter((task) =>
    !nextById.has((task.id || "").toString()),
  );
  const onlyStatusRestoreTasks = added.every(
    (task) => task.source === "status-out-of-service",
  );
  if (added.length && !permissions.createTasks &&
    !(statusChanged && permissions.changeStatus && onlyStatusRestoreTasks)) {
    throw new HttpsError("permission-denied", "task-create-not-allowed");
  }
  if (removed.length && !permissions.deleteTasks &&
    !(statusChanged && permissions.changeStatus &&
      removed.every((task) => task.source === "status-out-of-service"))) {
    throw new HttpsError("permission-denied", "task-delete-not-allowed");
  }

  nextTasks.forEach((nextTask) => {
    const taskId = (nextTask.id || "").toString();
    const before = currentById.get(taskId);
    if (!before || sameJson(before, nextTask)) return;
    const definitionChanged = [
      "title",
      "description",
      "frequency",
      "customDueAmount",
      "customDueUnit",
    ].some((key) => !sameJson(before[key], nextTask[key]));
    if (definitionChanged && !permissions.editTasks) {
      throw new HttpsError("permission-denied", "task-edit-not-allowed");
    }
    const notesChanged = !sameJson(before.notes || [], nextTask.notes || []);
    if (notesChanged && !permissions.addTaskNotes) {
      throw new HttpsError("permission-denied", "task-note-not-allowed");
    }
    const attachmentsChanged = !sameJson(
      before.attachments || [],
      nextTask.attachments || [],
    );
    if (attachmentsChanged && !permissions.uploadImages) {
      throw new HttpsError("permission-denied", "task-image-not-allowed");
    }
    const operationalChanged = !sameJson(
      {
        completed: before.completed,
        completedAt: before.completedAt,
        completedBy: before.completedBy,
        dueAt: before.dueAt,
      },
      {
        completed: nextTask.completed,
        completedAt: nextTask.completedAt,
        completedBy: nextTask.completedBy,
        dueAt: nextTask.dueAt,
      },
    );
    if (operationalChanged && !permissions.completeTasks) {
      throw new HttpsError("permission-denied", "task-complete-not-allowed");
    }
  });
};

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

export const getMachineAccessPublic = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    const tagId = (request.data?.tagId || "").toString().trim();
    if (!tagId || tagId.length > 80) {
      throw new HttpsError("invalid-argument", "tagId-required");
    }
    const accessSnap = await machineAccessCol().doc(tagId).get();
    if (!accessSnap.exists) {
      throw new HttpsError("not-found", "tag-not-found");
    }
    const access = accessSnap.data() || {};
    const machineId = (access.machineId || "").toString().trim();
    const machineSnap = machineId ?
      await machinesCol().doc(machineId).get() :
      null;
    if (!machineSnap?.exists) {
      throw new HttpsError("not-found", "machine-not-found");
    }
    const machine = machineSnap.data() || {};
    const ownerUid = (machine.ownerUid || machine.tenantId || "").toString();
    const accountAllowed = !!request.auth?.uid && (
      request.auth.uid === ownerUid ||
      await isAcceptedAdminOfMachine(request.auth.uid, ownerUid, machineId)
    );
    if (accountAllowed) {
      return {
        ok: true,
        machine: {
          id: accessSnap.id,
          ...sanitizeMachineAccess(
            access,
            machine,
            Object.fromEntries([
              "viewMachine",
              "viewPlate",
              "viewTasks",
              "viewHistory",
              "viewDocuments",
            ].map((key) => [key, true])) as AccessPermissions,
          ),
        },
      };
    }
    const session = await getValidMachineSession(
      tagId,
      (request.data?.sessionId || "").toString().trim(),
      (request.data?.sessionToken || "").toString(),
    );
    if (
      session &&
      (session.machineId || "").toString() === machineId &&
      (session.tenantId || "").toString() === ownerUid
    ) {
      const currentUser = (Array.isArray(machine.users) ? machine.users : [])
        .find((item) =>
          normalizeMachineUsername(item?.username) ===
          normalizeMachineUsername(session.username),
        );
      if (!currentUser) {
        return {
          ok: true,
          machine: sanitizePublicMachine(accessSnap.id, access, machine),
        };
      }
      const permissions = getAccessRolePermissions(
        currentUser.role,
        machine.accessRolePermissions,
      );
      return {
        ok: true,
        machine: {
          id: accessSnap.id,
          ...sanitizeMachineAccess(access, machine, permissions),
        },
        permissions,
        role: normalizeAccessRole(currentUser.role),
      };
    }
    return {
      ok: true,
      machine: sanitizePublicMachine(accessSnap.id, access, machine),
    };
  },
);

export const verifyMachineAccessUser = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    const tagId = (request.data?.tagId || "").toString().trim();
    const username = (request.data?.username || "").toString().trim();
    const password = (request.data?.password || "").toString();
    if (!tagId || !username || !password) {
      throw new HttpsError("invalid-argument", "credentials-required");
    }
    if (tagId.length > 80 || username.length > 80 || password.length > 200) {
      throw new HttpsError("invalid-argument", "credentials-invalid");
    }

    const accessSnap = await machineAccessCol().doc(tagId).get();
    if (!accessSnap.exists) {
      throw new HttpsError("not-found", "tag-not-found");
    }
    const access = accessSnap.data() || {};
    const machineId = (access.machineId || "").toString().trim();
    const tenantId = (access.tenantId || access.ownerUid || "")
      .toString()
      .trim();
    if (!machineId || !tenantId) {
      throw new HttpsError("failed-precondition", "machine-access-incomplete");
    }

    const machineSnap = await machinesCol().doc(machineId).get();
    if (!machineSnap.exists) {
      throw new HttpsError("not-found", "machine-not-found");
    }
    const machine = machineSnap.data() || {};
    const ownerUid = (machine.ownerUid || machine.tenantId || "")
      .toString()
      .trim();
    const machineTagId = (machine.tagId || "").toString().trim();
    if (ownerUid !== tenantId || machineTagId !== tagId) {
      throw new HttpsError("permission-denied", "tag-machine-mismatch");
    }

    const normalizedUsername = normalizeMachineUsername(username);
    const user = (Array.isArray(machine.users) ? machine.users : []).find(
      (item) => normalizeMachineUsername(item?.username) === normalizedUsername,
    );
    const expected = (user?.passwordHashBase64 || "").toString();
    const salt = (user?.saltBase64 || "").toString();
    if (!user || !expected || !salt) {
      throw new HttpsError("permission-denied", "invalid-credentials");
    }

    const actual = hashPassword(password, salt);
    if (!safeEqualBase64(actual, expected)) {
      throw new HttpsError("permission-denied", "invalid-credentials");
    }

    const role = normalizeAccessRole(user.role);
    const permissions = getAccessRolePermissions(
      role,
      machine.accessRolePermissions,
    );
    const sessionId = randomBytes(16).toString("base64url");
    const sessionToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + MACHINE_SESSION_TTL_MS);
    await db.collection("machine_access_sessions").doc(sessionId).set({
      tagId,
      machineId,
      tenantId,
      username: (user.username || username).toString(),
      role,
      permissions,
      tokenHash: hashSessionToken(sessionToken),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    return {
      ok: true,
      user: {
        username: (user.username || username).toString(),
        role,
      },
      permissions,
      machine: {
        id: accessSnap.id,
        ...sanitizeMachineAccess(access, machine, permissions),
      },
      session: {
        id: sessionId,
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
      },
    };
  },
);

export const updateMachineAccessOperational = onCall(
  CALLABLE_OPTIONS,
  async (request) => {
    const tagId = (request.data?.tagId || "").toString().trim();
    const sessionId = (request.data?.sessionId || "").toString().trim();
    const sessionToken = (request.data?.sessionToken || "").toString();
    const patch = request.data?.patch || {};
    if (!tagId || !sessionId || !sessionToken) {
      throw new HttpsError("invalid-argument", "session-required");
    }
    if (
      tagId.length > 80 ||
      sessionId.length > 80 ||
      sessionToken.length > 120
    ) {
      throw new HttpsError("invalid-argument", "session-invalid");
    }

    const sessionRef = db.collection("machine_access_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      throw new HttpsError("permission-denied", "session-invalid");
    }
    const session = sessionSnap.data() || {};
    const expectedHash = (session.tokenHash || "").toString();
    const actualHash = hashSessionToken(sessionToken);
    const expired = getSessionExpiry(session.expiresAt) <= Date.now();
    if (
      (session.tagId || "").toString() !== tagId ||
      !safeEqualBase64(actualHash, expectedHash)
    ) {
      throw new HttpsError("permission-denied", "session-invalid");
    }
    if (expired) {
      await sessionRef.delete();
      throw new HttpsError("permission-denied", "session-invalid");
    }

    const status = (patch.status || "operativa").toString();
    const logs = Array.isArray(patch.logs) ? patch.logs : null;
    const tasks = Array.isArray(patch.tasks) ? patch.tasks : null;
    if (
      !["operativa", "fuera_de_servicio", "desconectada"].includes(status) ||
      !logs ||
      !tasks
    ) {
      throw new HttpsError("invalid-argument", "patch-invalid");
    }

    const accessRef = machineAccessCol().doc(tagId);
    const accessSnap = await accessRef.get();
    if (!accessSnap.exists) {
      throw new HttpsError("not-found", "tag-not-found");
    }
    const access = accessSnap.data() || {};
    const machineId = (access.machineId || "").toString().trim();
    const machineSnap = machineId ?
      await machinesCol().doc(machineId).get() :
      null;
    if (!machineSnap?.exists) {
      throw new HttpsError("not-found", "machine-not-found");
    }
    const machine = machineSnap.data() || {};
    const ownerUid = (machine.ownerUid || machine.tenantId || "").toString();
    if (
      (session.machineId || "").toString() !== machineId ||
      (session.tenantId || "").toString() !== ownerUid
    ) {
      throw new HttpsError("permission-denied", "session-invalid");
    }
    const currentUser = (Array.isArray(machine.users) ? machine.users : [])
      .find((item) =>
        normalizeMachineUsername(item?.username) ===
        normalizeMachineUsername(session.username),
      );
    if (!currentUser) {
      throw new HttpsError("permission-denied", "machine-access-revoked");
    }
    const permissions = getAccessRolePermissions(
      currentUser.role,
      machine.accessRolePermissions,
    );
    assertOperationalPatchAllowed(access, status, logs, tasks, permissions);

    await accessRef.update({
      status,
      logs,
      tasks,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: (session.username || "machine").toString(),
    });

    return {ok: true};
  },
);

export const cleanupMachineAccessSessions = onSchedule(
  "every 24 hours",
  async () => {
    const snap = await db
      .collection("machine_access_sessions")
      .where("expiresAt", "<=", new Date())
      .limit(MACHINE_SESSION_CLEANUP_LIMIT)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
);
