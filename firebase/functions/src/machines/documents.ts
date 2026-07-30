import {randomBytes} from "node:crypto";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  linksCol,
  machineAccessCol,
  machinesCol,
  storageBucket,
} from "../core/firebase";
import {
  ACCOUNT_STORAGE_LIMIT_BYTES,
  assertAccountStorageAvailable,
  getMachineDocumentsStorageBytes,
  QR_FALLBACK_BYTES,
  toSafeStorageSize,
} from "../core/storageQuota";
import {
  getValidMachineSession,
  normalizeMachineUsername,
} from "./access";
import {getAccessRolePermissions} from "./accessRoles";
import {canMachineUserSeeTask} from "./taskVisibility";

const DOWNLOAD_TOKEN_TTL_MS = 2 * 60 * 1000;
const DOWNLOAD_TOKEN_COLLECTION = "machine_document_download_tokens";
const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const MAX_PLATE_BYTES = 12 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const OTHER_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  "application/pdf",
]);

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

const getHeader = (
  request: {get: (name: string) => string | undefined},
  name: string,
) => (request.get(name) || "").toString().trim();

const decodeHeader = (value: string, fallback = "") => {
  try {
    return decodeURIComponent(value || "").trim();
  } catch {
    return fallback;
  }
};

const parseDocumentMetadata = (
  value: string,
): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const source = parsed as Record<string, unknown>;
    const context = (source.context || "").toString().trim().slice(0, 40);
    const linkedTaskId = (source.linkedTaskId || "")
      .toString().trim().slice(0, 160);
    if (context !== "task-attachment") return {};
    return {
      context,
      ...(linkedTaskId ? {linkedTaskId} : {}),
    };
  } catch {
    throw new HttpsError("invalid-argument", "invalid-document-metadata");
  }
};

const assertUploadTypeAndSize = (
  kind: string,
  contentType: string,
  size: number,
) => {
  const validKind = kind === "plate" || kind === "manual" || kind === "other";
  if (!validKind) throw new HttpsError("invalid-argument", "invalid-kind");
  if (!size) throw new HttpsError("invalid-argument", "file-missing");
  if (kind === "plate") {
    if (!IMAGE_CONTENT_TYPES.has(contentType)) {
      throw new HttpsError("invalid-argument", "file-type");
    }
    if (size > MAX_PLATE_BYTES) {
      throw new HttpsError("invalid-argument", "file-too-large");
    }
    return;
  }
  if (kind === "manual") {
    if (contentType !== "application/pdf") {
      throw new HttpsError("invalid-argument", "file-type");
    }
  } else if (!OTHER_CONTENT_TYPES.has(contentType)) {
    throw new HttpsError("invalid-argument", "file-type");
  }
  if (size > MAX_DOCUMENT_BYTES) {
    throw new HttpsError("invalid-argument", "file-too-large");
  }
};

const assertFileSignature = (
  body: Buffer,
  contentType: string,
) => {
  const isJpeg =
    body.length >= 3 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff;
  const isPng =
    body.length >= 8 &&
    body.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  const isWebp =
    body.length >= 12 &&
    body.subarray(0, 4).toString("ascii") === "RIFF" &&
    body.subarray(8, 12).toString("ascii") === "WEBP";
  const isPdf =
    body.length >= 5 &&
    body.subarray(0, 5).toString("ascii") === "%PDF-";
  const valid =
    (contentType === "image/jpeg" && isJpeg) ||
    (contentType === "image/png" && isPng) ||
    (contentType === "image/webp" && isWebp) ||
    (contentType === "application/pdf" && isPdf);
  if (!valid) throw new HttpsError("invalid-argument", "file-signature");
};

const extensionForContentType = (contentType: string) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return "jpg";
};

const buildFirebaseDownloadUrl = (
  storagePath: string,
  token: string,
) =>
  `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}` +
  `/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

const assertLocalUploadAllowed = (
  machine: FirebaseFirestore.DocumentData,
  username: string,
  metadata: Record<string, unknown>,
  kind: string,
  contentType: string,
) => {
  const user = (Array.isArray(machine.users) ? machine.users : []).find(
    (item) =>
      normalizeMachineUsername(item?.username) ===
      normalizeMachineUsername(username),
  );
  if (!user) throw new HttpsError("permission-denied", "user-not-assigned");
  const permissions = getAccessRolePermissions(
    user.role,
    machine.accessRolePermissions,
  );
  const isTaskAttachment = metadata.context === "task-attachment";
  if (isTaskAttachment) {
    if (
      kind !== "other" ||
      !IMAGE_CONTENT_TYPES.has(contentType) ||
      !permissions.uploadImages
    ) {
      throw new HttpsError("permission-denied", "image-upload-not-allowed");
    }
  } else if (!permissions.uploadDocuments) {
    throw new HttpsError("permission-denied", "document-upload-not-allowed");
  }
  return user;
};

const statusForError = (error: unknown) => {
  const code = error instanceof HttpsError ? error.code : "internal";
  if (code === "invalid-argument") return 400;
  if (code === "unauthenticated") return 401;
  if (code === "permission-denied") return 403;
  if (code === "not-found") return 404;
  if (code === "failed-precondition") return 409;
  if (code === "resource-exhausted") return 429;
  return 500;
};

export const uploadMachineAccessDocument = onRequest(
  {cors: true},
  async (request, response) => {
    let uploadedPath = "";
    try {
      if (request.method !== "POST") {
        response.status(405).json({error: "method-not-allowed"});
        return;
      }
      if (APP_CHECK_ENFORCED) {
        const appCheckToken = getHeader(request, "X-Firebase-AppCheck");
        if (!appCheckToken) {
          throw new HttpsError("unauthenticated", "app-check-required");
        }
        await admin.appCheck().verifyToken(appCheckToken);
      }

      const tagId = getHeader(request, "X-Unatomo-Tag-Id");
      const sessionId = getHeader(request, "X-Unatomo-Session-Id");
      const sessionToken = getHeader(request, "X-Unatomo-Session-Token");
      const kind = getHeader(request, "X-Unatomo-Document-Kind");
      const contentType = getHeader(request, "Content-Type").toLowerCase();
      const fileName = sanitizeFileName(
        decodeHeader(
          getHeader(request, "X-Unatomo-File-Name"),
          kind === "manual" ? "manual.pdf" : "document",
        ),
      );
      const originalSize = Number(
        getHeader(request, "X-Unatomo-Original-Size") || 0,
      );
      const documentMetadata = parseDocumentMetadata(
        getHeader(request, "X-Unatomo-Document-Metadata"),
      );
      const body = request.rawBody;
      if (!tagId || !sessionId || !sessionToken) {
        throw new HttpsError("unauthenticated", "machine-session-required");
      }
      if (
        tagId.length > 80 ||
        sessionId.length > 80 ||
        sessionToken.length > 120
      ) {
        throw new HttpsError("invalid-argument", "machine-session-invalid");
      }
      assertUploadTypeAndSize(kind, contentType, body.length);
      assertFileSignature(body, contentType);

      const session = await getValidMachineSession(
        tagId,
        sessionId,
        sessionToken,
      );
      if (!session) {
        throw new HttpsError("unauthenticated", "machine-session-invalid");
      }
      const machineId = (session.machineId || "").toString().trim();
      const ownerUid = (session.tenantId || "").toString().trim();
      const username = (session.username || "").toString().trim();
      if (!machineId || !ownerUid || !username) {
        throw new HttpsError("unauthenticated", "machine-session-incomplete");
      }

      const machineRef = machinesCol().doc(machineId);
      const machineSnap = await machineRef.get();
      if (!machineSnap.exists) {
        throw new HttpsError("not-found", "machine-not-found");
      }
      const machine = machineSnap.data() || {};
      if (
        (machine.ownerUid || machine.tenantId || "").toString() !== ownerUid ||
        (machine.tagId || "").toString() !== tagId
      ) {
        throw new HttpsError("permission-denied", "tag-machine-mismatch");
      }
      assertLocalUploadAllowed(
        machine,
        username,
        documentMetadata,
        kind,
        contentType,
      );

      const previousSize = kind === "other" ?
        0 :
        Number(machine.documents?.[kind]?.size || 0);
      await assertAccountStorageAvailable(
        ownerUid,
        Math.max(0, body.length - previousSize),
      );
      const documentId = randomBytes(16).toString("base64url");
      const extension = extensionForContentType(contentType);
      const storedName = kind === "manual" ?
        `${documentId}-manual.pdf` :
        kind === "plate" ?
          `${documentId}-plate.${extension}` :
          `${documentId}-${fileName}`;
      uploadedPath =
        `machine-docs/${ownerUid}/${machineId}/${kind}/${storedName}`;
      const downloadToken = randomBytes(24).toString("base64url");
      await storageBucket.file(uploadedPath).save(body, {
        resumable: false,
        contentType,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            kind,
            ownerUid,
            machineId,
            uploadedBy: username,
            originalName: fileName,
          },
        },
      });
      const uploadedAt = new Date().toISOString();
      const safeOriginalSize =
        kind === "plate" &&
        Number.isFinite(originalSize) &&
        originalSize > 0 &&
        originalSize <= MAX_PLATE_BYTES ?
          originalSize :
          body.length;
      const uploadedDocument: Record<string, unknown> = {
        ...(kind === "other" ? {id: documentId} : {}),
        kind,
        name: fileName,
        contentType,
        size: body.length,
        originalSize: safeOriginalSize,
        storagePath: uploadedPath,
        url: buildFirebaseDownloadUrl(uploadedPath, downloadToken),
        uploadedAt,
        uploadedBy: username,
        ...documentMetadata,
      };
      let previousPath = "";
      let operationalPatch: Record<string, unknown> | null = null;
      await db.runTransaction(async (transaction) => {
        const ownerMachinesQuery = machinesCol()
          .where("ownerUid", "==", ownerUid);
        const ownerMachinesSnap = await transaction.get(ownerMachinesQuery);
        const currentSnap = ownerMachinesSnap.docs.find(
          (docSnap) => docSnap.id === machineId,
        );
        const accessRef = machineAccessCol().doc(tagId);
        const accessSnap = documentMetadata.context === "task-attachment" ?
          await transaction.get(accessRef) :
          null;
        if (!currentSnap?.exists) {
          throw new HttpsError("not-found", "machine-not-found");
        }
        const current = currentSnap.data() || {};
        const currentOwnerUid = (
          current.ownerUid ||
          current.tenantId ||
          ""
        ).toString();
        if (
          currentOwnerUid !== ownerUid ||
          (current.tagId || "").toString() !== tagId
        ) {
          throw new HttpsError("permission-denied", "tag-machine-mismatch");
        }
        const currentUser = assertLocalUploadAllowed(
          current,
          username,
          documentMetadata,
          kind,
          contentType,
        );
        const totalStorageBytes = ownerMachinesSnap.docs.reduce(
          (total, docSnap) => {
            const ownerMachine = docSnap.data() || {};
            const qrSize = toSafeStorageSize(
              ownerMachine.tagQrSize || ownerMachine.qrSize,
            ) || (
              ownerMachine.tagQrUrl ||
              ownerMachine.qrUrl ||
              ownerMachine.tagQrPath ||
              ownerMachine.qrPath ?
                QR_FALLBACK_BYTES :
                0
            );
            return (
              total +
              getMachineDocumentsStorageBytes(ownerMachine) +
              qrSize
            );
          },
          0,
        );
        const currentPreviousSize = kind === "other" ?
          0 :
          toSafeStorageSize(current.documents?.[kind]?.size);
        const additionalBytes = Math.max(
          0,
          body.length - currentPreviousSize,
        );
        if (
          totalStorageBytes + additionalBytes >=
          ACCOUNT_STORAGE_LIMIT_BYTES
        ) {
          throw new HttpsError("resource-exhausted", "storage-full");
        }
        if (documentMetadata.context === "task-attachment") {
          const linkedTaskId = (documentMetadata.linkedTaskId || "").toString();
          const access = accessSnap?.exists ? accessSnap.data() || {} : {};
          if (
            (access.machineId || "").toString() !== machineId ||
            (access.tenantId || access.ownerUid || "").toString() !== ownerUid
          ) {
            throw new HttpsError(
              "permission-denied",
              "machine-access-mismatch",
            );
          }
          const tasks = Array.isArray(access.tasks) ? access.tasks : [];
          const linkedTask = tasks.find(
            (task) => (task?.id || "").toString() === linkedTaskId,
          );
          if (!linkedTaskId || !linkedTask) {
            throw new HttpsError("failed-precondition", "task-not-found");
          }
          if (!canMachineUserSeeTask(linkedTask, currentUser)) {
            throw new HttpsError("permission-denied", "task-not-visible");
          }
          const linkedStatusCycleId = (
            linkedTask.statusCycleId ||
            access.activeStatusCycleId ||
            ""
          ).toString();
          if (linkedStatusCycleId) {
            uploadedDocument.linkedStatusCycleId = linkedStatusCycleId;
          }
          const attachment = {
            ...uploadedDocument,
            documentId: (uploadedDocument.id || "").toString(),
          };
          const nextTasks = tasks.map((task) =>
            (task?.id || "").toString() === linkedTaskId ?
              {
                ...task,
                attachments: [
                  ...(Array.isArray(task.attachments) ?
                    task.attachments :
                    []),
                  attachment,
                ],
              } :
              task,
          );
          const nextLogs = [
            ...(Array.isArray(access.logs) ? access.logs : []),
            {
              ts: uploadedAt,
              type: "task_attachment_added",
              taskId: linkedTaskId,
              title: (linkedTask.title || "Tarea").toString(),
              attachmentId: (uploadedDocument.id || "").toString(),
              documentId: (uploadedDocument.id || "").toString(),
              attachmentName: (uploadedDocument.name || "Imagen").toString(),
              attachmentUrl: (uploadedDocument.url || "").toString(),
              contentType,
              storagePath: uploadedPath,
              user: username,
              assignedTo: linkedTask.assignedTo || null,
              source: (linkedTask.source || "").toString(),
              statusCycleId: linkedStatusCycleId,
            },
          ];
          operationalPatch = {tasks: nextTasks, logs: nextLogs};
          transaction.update(accessRef, {
            tasks: nextTasks,
            logs: nextLogs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: username,
          });
        }
        const documents = {
          ...(current.documents && typeof current.documents === "object" ?
            current.documents :
            {}),
        };
        if (kind === "other") {
          documents.other = [
            ...(Array.isArray(documents.other) ? documents.other : []),
            uploadedDocument,
          ];
        } else {
          previousPath = (documents[kind]?.storagePath || "").toString();
          documents[kind] = uploadedDocument;
        }
        transaction.update(machineRef, {documents});
      });

      if (previousPath && previousPath !== uploadedPath) {
        await storageBucket.file(previousPath).delete({ignoreNotFound: true})
          .catch(() => undefined);
      }
      uploadedPath = "";
      response.status(200).json({
        document: uploadedDocument,
        operationalPatch,
      });
    } catch (error) {
      if (uploadedPath) {
        await storageBucket.file(uploadedPath).delete({ignoreNotFound: true})
          .catch(() => undefined);
      }
      const code = error instanceof HttpsError ? error.code : "internal";
      const message = error instanceof HttpsError ?
        error.message :
        "document-upload-failed";
      response.status(statusForError(error)).json({error: message, code});
    }
  },
);

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
