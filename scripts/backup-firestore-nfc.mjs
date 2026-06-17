import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getFirebaseCliAccessToken,
  getFirebaseProjectId,
  getSafeErrorMessage,
  getProjectRoot,
  getTimestampSlug,
  parseCsvArg,
  toProjectRelativePath,
  writeBackupStatusPatch,
} from "./firebase-admin-local.mjs";

const DEFAULT_COLLECTIONS = [
  "machines",
  "dashboard_layout",
  "machine_access",
  "tags",
  "admin_machine_links",
  "admin_machine_invites",
  "machine_transfer_invites",
  "users",
  "account_directory",
  "dashboard_suggestions",
  "registration_codes",
];

const fetchJson = async (url, accessToken) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
};

const getDocumentPath = (name) => {
  const marker = "/documents/";
  const index = name.indexOf(marker);
  return index >= 0 ? name.slice(index + marker.length) : name;
};

const listCollectionDocuments = async (projectId, accessToken, collectionName) => {
  const docs = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await fetchJson(url, accessToken);
    docs.push(...(Array.isArray(payload.documents) ? payload.documents : []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return docs;
};

const backupFirestore = async () => {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase project id not found in env or .firebaserc");
  }
  const accessToken = await getFirebaseCliAccessToken();
  const collections = parseCsvArg("collections", DEFAULT_COLLECTIONS);
  const startedAt = new Date().toISOString();
  const output = {
    kind: "unatomo-nfc-firestore-backup",
    projectId,
    source: "firestore-rest",
    startedAt,
    completedAt: "",
    collections: {},
  };
  let documentCount = 0;

  for (const collectionName of collections) {
    const docs = await listCollectionDocuments(
      projectId,
      accessToken,
      collectionName,
    );
    documentCount += docs.length;
    output.collections[collectionName] = {
      count: docs.length,
      docs: docs.map((doc) => ({
        id: decodeURIComponent((doc.name || "").split("/").pop() || ""),
        path: getDocumentPath(doc.name || ""),
        name: doc.name || "",
        createTime: doc.createTime || "",
        updateTime: doc.updateTime || "",
        fields: doc.fields || {},
      })),
    };
  }

  output.completedAt = new Date().toISOString();
  const backupDir = path.join(getProjectRoot(), ".backups");
  mkdirSync(backupDir, { recursive: true });
  const filePath = path.join(
    backupDir,
    `${getTimestampSlug()}-nfc-firestore.json`,
  );
  writeFileSync(filePath, JSON.stringify(output, null, 2), "utf8");
  writeBackupStatusPatch({
    firestore: {
      status: "ok",
      completedAt: output.completedAt,
      file: toProjectRelativePath(filePath),
      projectId,
      collectionCount: collections.length,
      documentCount,
      collections: Object.fromEntries(
        Object.entries(output.collections).map(([name, value]) => [
          name,
          value.count,
        ]),
      ),
    },
  });
  console.log(`Firestore NFC backup written: ${filePath}`);
};

backupFirestore().catch((error) => {
  const message = getSafeErrorMessage(error);
  writeBackupStatusPatch({
    firestore: {
      status: "error",
      attemptedAt: new Date().toISOString(),
      error: message,
    },
  });
  console.error(message);
  process.exitCode = 1;
});
