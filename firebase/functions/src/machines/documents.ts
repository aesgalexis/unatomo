import {randomBytes} from "node:crypto";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  linksCol,
  machinesCol,
  storageBucket,
} from "../core/firebase";

const DOWNLOAD_TOKEN_TTL_MS = 2 * 60 * 1000;
const DOWNLOAD_TOKEN_COLLECTION = "machine_document_download_tokens";

const collectStoragePaths = (value: unknown, paths: Set<string>) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStoragePaths(item, paths));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (key === "storagePath" && typeof item === "string") {
      const path = item.trim();
      if (path) paths.add(path);
      return;
    }
    collectStoragePaths(item, paths);
  });
};

const sanitizeFileName = (value = "document") =>
  (value || "document")
    .toString()
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "document";

const hasMachineAccess = async (
  uid: string,
  machineId: string,
  ownerUid: string,
) => {
  if (uid === ownerUid) return true;
  const linkSnap = await linksCol().doc(`${machineId}_${uid}`).get();
  const link = linkSnap.data() || {};
  return linkSnap.exists &&
    link.adminUid === uid &&
    link.machineId === machineId &&
    link.ownerUid === ownerUid &&
    link.status === "accepted";
};

const getDownloadBaseUrl = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) throw new HttpsError("internal", "project-id-missing");
  return `https://us-central1-${projectId}.cloudfunctions.net/downloadMachineDocument`;
};

export const createMachineDocumentDownloadUrl = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const machineId = (request.data?.machineId || "").toString().trim();
  const storagePath = (request.data?.storagePath || "").toString().trim();
  const fileName = sanitizeFileName(request.data?.fileName || "document");
  if (!machineId || !storagePath) {
    throw new HttpsError("invalid-argument", "machineId/storagePath required");
  }

  const machineSnap = await machinesCol().doc(machineId).get();
  if (!machineSnap.exists) {
    throw new HttpsError("not-found", "machine-not-found");
  }
  const machine = machineSnap.data() || {};
  const ownerUid = (machine.ownerUid || "").toString().trim();
  const expectedPrefix = `machine-docs/${ownerUid}/${machineId}/`;
  if (!ownerUid || !storagePath.startsWith(expectedPrefix)) {
    throw new HttpsError("permission-denied", "invalid-document-path");
  }

  const allowedPaths = new Set<string>();
  collectStoragePaths(machine.documents, allowedPaths);
  if (!allowedPaths.has(storagePath)) {
    throw new HttpsError("permission-denied", "document-not-linked");
  }

  const allowed = await hasMachineAccess(auth.uid, machineId, ownerUid);
  if (!allowed) {
    throw new HttpsError("permission-denied", "machine-access-required");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + DOWNLOAD_TOKEN_TTL_MS,
  );
  await db.collection(DOWNLOAD_TOKEN_COLLECTION).doc(token).set({
    uid: auth.uid,
    machineId,
    storagePath,
    fileName,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const url = new URL(getDownloadBaseUrl());
  url.searchParams.set("token", token);
  return {url: url.toString()};
});

export const downloadMachineDocument = onRequest(async (request, response) => {
  if (request.method !== "GET") {
    response.status(405).send("Method not allowed");
    return;
  }

  const token = (request.query.token || "").toString().trim();
  if (!token) {
    response.status(400).send("Missing token");
    return;
  }

  const tokenRef = db.collection(DOWNLOAD_TOKEN_COLLECTION).doc(token);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) {
    response.status(404).send("Download expired");
    return;
  }

  const data = tokenSnap.data() || {};
  const expiresAt = data.expiresAt as admin.firestore.Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    await tokenRef.delete().catch(() => undefined);
    response.status(410).send("Download expired");
    return;
  }

  const storagePath = (data.storagePath || "").toString().trim();
  const fileName = sanitizeFileName(data.fileName || "document");
  if (!storagePath) {
    await tokenRef.delete().catch(() => undefined);
    response.status(400).send("Invalid token");
    return;
  }

  const file = storageBucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    await tokenRef.delete().catch(() => undefined);
    response.status(404).send("File not found");
    return;
  }

  const [metadata] = await file.getMetadata();
  const contentType = (metadata.contentType || "application/octet-stream")
    .toString();
  response.setHeader("Content-Type", contentType);
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName.replace(/"/g, "")}"`,
  );
  response.setHeader("Cache-Control", "private, max-age=0, no-store");

  await tokenRef.delete().catch(() => undefined);
  file.createReadStream()
    .on("error", () => {
      if (!response.headersSent) response.status(500);
      response.end();
    })
    .pipe(response);
});
