import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getFirebaseCliAccessToken,
  getFirebaseProjectId,
  getFirebaseStorageBucket,
  getSafeErrorMessage,
  getProjectRoot,
  getTimestampSlug,
  parseCsvArg,
  toProjectRelativePath,
  writeBackupStatusPatch,
} from "./firebase-admin-local.mjs";

const DEFAULT_PREFIXES = ["machine-docs/", "tag-qrs/"];

const toSafeMetadata = (metadata = {}) => ({
  name: metadata.name || "",
  bucket: metadata.bucket || "",
  generation: metadata.generation || "",
  metageneration: metadata.metageneration || "",
  contentType: metadata.contentType || "",
  size: Number(metadata.size || 0),
  md5Hash: metadata.md5Hash || "",
  crc32c: metadata.crc32c || "",
  timeCreated: metadata.timeCreated || "",
  updated: metadata.updated || "",
  storageClass: metadata.storageClass || "",
  customMetadata: metadata.metadata || {},
});

const fetchJson = async (url, accessToken) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Storage API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
};

const fetchBytes = async (url, accessToken) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Storage API ${response.status}: ${body.slice(0, 500)}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

const listPrefix = async (bucketName, accessToken, prefix) => {
  const items = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://storage.googleapis.com/storage/v1/b/${bucketName}/o`,
    );
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("maxResults", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await fetchJson(url, accessToken);
    items.push(...(Array.isArray(payload.items) ? payload.items : []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return items.sort((a, b) => a.name.localeCompare(b.name, "en"));
};

const toSafeObjectPath = (name) =>
  name
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"\\|?*\x00-\x1F]/g, "_"));

const downloadStorageFile = async (bucketName, accessToken, file, filesDir) => {
  if (!file.name) return false;
  const safeParts = toSafeObjectPath(file.name);
  if (!safeParts.length) return false;
  const outputPath = path.join(filesDir, ...safeParts);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const url = new URL(
    `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(file.name)}`,
  );
  url.searchParams.set("alt", "media");
  writeFileSync(outputPath, await fetchBytes(url, accessToken));
  return true;
};

const backupStorageInventory = async () => {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase project id not found in env or .firebaserc");
  }
  const accessToken = await getFirebaseCliAccessToken();
  const bucketName = getFirebaseStorageBucket(projectId);
  const prefixes = parseCsvArg("prefixes", DEFAULT_PREFIXES);
  const backupSlug = getTimestampSlug();
  const startedAt = new Date().toISOString();
  const output = {
    kind: "unatomo-nfc-storage-inventory",
    projectId,
    source: "storage-rest",
    bucket: bucketName,
    startedAt,
    completedAt: "",
    prefixes: {},
  };
  let fileCount = 0;
  let totalBytes = 0;
  let downloadedCount = 0;
  const backupDir = path.join(getProjectRoot(), ".backups");
  const filesDir = path.join(backupDir, `${backupSlug}-nfc-storage-files`);

  for (const prefix of prefixes) {
    const files = (await listPrefix(bucketName, accessToken, prefix)).map(
      toSafeMetadata,
    );
    const prefixBytes = files.reduce(
      (total, file) => total + Number(file.size || 0),
      0,
    );
    fileCount += files.length;
    totalBytes += prefixBytes;
    output.prefixes[prefix] = {
      count: files.length,
      totalBytes: prefixBytes,
      files,
    };
    for (const file of files) {
      if (await downloadStorageFile(bucketName, accessToken, file, filesDir)) {
        downloadedCount += 1;
      }
    }
  }

  output.completedAt = new Date().toISOString();
  mkdirSync(backupDir, { recursive: true });
  const filePath = path.join(
    backupDir,
    `${backupSlug}-nfc-storage-inventory.json`,
  );
  writeFileSync(filePath, JSON.stringify(output, null, 2), "utf8");
  writeBackupStatusPatch({
    storage: {
      status: "ok",
      completedAt: output.completedAt,
      file: toProjectRelativePath(filePath),
      projectId,
      bucket: bucketName,
      prefixCount: prefixes.length,
      fileCount,
      downloadedCount,
      totalBytes,
      downloadDir: toProjectRelativePath(filesDir),
      prefixes: Object.fromEntries(
        Object.entries(output.prefixes).map(([name, value]) => [
          name,
          {
            count: value.count,
            totalBytes: value.totalBytes,
          },
        ]),
      ),
    },
  });
  console.log(`Storage NFC inventory written: ${filePath}`);
};

backupStorageInventory().catch((error) => {
  const message = getSafeErrorMessage(error);
  writeBackupStatusPatch({
    storage: {
      status: "error",
      attemptedAt: new Date().toISOString(),
      error: message,
    },
  });
  console.error(message);
  process.exitCode = 1;
});
