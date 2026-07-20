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

const MACHINE_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MACHINE_SESSION_CLEANUP_LIMIT = 400;
const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const CALLABLE_OPTIONS = {enforceAppCheck: APP_CHECK_ENFORCED};

const normalizeMachineUsername = (value: unknown) =>
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

const sanitizeMachineAccess = (data: FirebaseFirestore.DocumentData) => ({
  tenantId: (data.tenantId || "").toString(),
  ownerUid: (data.ownerUid || data.tenantId || "").toString(),
  machineId: (data.machineId || "").toString(),
  title: (data.title || "").toString(),
  brand: (data.brand || "").toString(),
  model: (data.model || "").toString(),
  serial: (data.serial || "").toString(),
  year: data.year ?? null,
  location: (data.location || "").toString(),
  status: (data.status || "operativa").toString(),
  logs: Array.isArray(data.logs) ? data.logs : [],
  tasks: Array.isArray(data.tasks) ? data.tasks : [],
});

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
    return {
      ok: true,
      machine: {
        id: accessSnap.id,
        ...sanitizeMachineAccess(accessSnap.data() || {}),
      },
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

    const sessionId = randomBytes(16).toString("base64url");
    const sessionToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + MACHINE_SESSION_TTL_MS);
    await db.collection("machine_access_sessions").doc(sessionId).set({
      tagId,
      machineId,
      tenantId,
      username: (user.username || username).toString(),
      role: (user.role || "usuario").toString(),
      tokenHash: hashSessionToken(sessionToken),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    return {
      ok: true,
      user: {
        username: (user.username || username).toString(),
        role: (user.role || "usuario").toString(),
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

    await machineAccessCol().doc(tagId).update({
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
