import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getFirebaseProjectId,
  getProjectRoot,
  getTimestampSlug,
  readBackupStatus,
  toProjectRelativePath,
  writeBackupStatusPatch,
} from "./firebase-admin-local.mjs";
import {
  NFC_BACKUP_PENDING_SCOPES,
  NFC_FIRESTORE_COLLECTIONS,
  NFC_STORAGE_PREFIXES,
} from "./nfc-backup-config.mjs";

const rootDir = getProjectRoot();
const startedAt = new Date().toISOString();
const projectId = getFirebaseProjectId();

const runScript = (scriptName) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(rootDir, "scripts", scriptName)], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", (error) => resolve({ code: 1, error: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, error: "" }));
  });

const isCurrentSuccess = (item, result) =>
  result.code === 0 &&
  item?.status === "ok" &&
  Date.parse(item.completedAt || "") >= Date.parse(startedAt);

const hashBackupFile = (relativePath) => {
  const absolutePath = path.resolve(rootDir, relativePath || "");
  const backupRoot = `${path.resolve(rootDir, ".backups")}${path.sep}`;
  if (!absolutePath.startsWith(backupRoot) || !existsSync(absolutePath)) return "";
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
};

const run = async () => {
  if (!projectId) throw new Error("Firebase project id not found");
  writeBackupStatusPatch({
    overall: {
      status: "running",
      startedAt,
      projectId,
      pendingScopes: NFC_BACKUP_PENDING_SCOPES,
    },
  });

  const firestoreResult = await runScript("backup-firestore-nfc.mjs");
  const storageResult = await runScript("backup-storage-inventory-nfc.mjs");
  const componentStatus = readBackupStatus();
  const firestoreOk = isCurrentSuccess(componentStatus.firestore, firestoreResult);
  const storageOk = isCurrentSuccess(componentStatus.storage, storageResult);
  const successfulComponents = Number(firestoreOk) + Number(storageOk);
  const status = successfulComponents === 2
    ? "ok"
    : successfulComponents === 1
      ? "partial"
      : "error";
  const completedAt = new Date().toISOString();
  const manifest = {
    kind: "unatomo-nfc-backup-manifest",
    projectId,
    status,
    startedAt,
    completedAt,
    coverage: {
      firestoreCollections: NFC_FIRESTORE_COLLECTIONS,
      storagePrefixes: NFC_STORAGE_PREFIXES,
      pendingScopes: NFC_BACKUP_PENDING_SCOPES,
    },
    components: {
      firestore: {
        status: firestoreOk ? "ok" : "error",
        file: componentStatus.firestore?.file || "",
        sha256: hashBackupFile(componentStatus.firestore?.file),
        collectionCount: componentStatus.firestore?.collectionCount || 0,
        documentCount: componentStatus.firestore?.documentCount || 0,
      },
      storage: {
        status: storageOk ? "ok" : "error",
        file: componentStatus.storage?.file || "",
        sha256: hashBackupFile(componentStatus.storage?.file),
        fileCount: componentStatus.storage?.fileCount || 0,
        downloadedCount: componentStatus.storage?.downloadedCount || 0,
        totalBytes: componentStatus.storage?.totalBytes || 0,
      },
    },
  };
  const backupDir = path.join(rootDir, ".backups");
  mkdirSync(backupDir, { recursive: true });
  const manifestPath = path.join(
    backupDir,
    `${getTimestampSlug()}-nfc-backup-manifest.json`,
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeBackupStatusPatch({
    overall: {
      status,
      startedAt,
      completedAt,
      projectId,
      manifestFile: toProjectRelativePath(manifestPath),
      firestoreCollections: NFC_FIRESTORE_COLLECTIONS,
      storagePrefixes: NFC_STORAGE_PREFIXES,
      pendingScopes: NFC_BACKUP_PENDING_SCOPES,
    },
  });

  if (status !== "ok") {
    process.exitCode = 1;
    console.error(`NFC backup finished with status: ${status}`);
    return;
  }
  console.log(`NFC backup completed: ${manifestPath}`);
};

run().catch((error) => {
  writeBackupStatusPatch({
    overall: {
      status: "error",
      startedAt,
      attemptedAt: new Date().toISOString(),
      projectId,
      error: (error?.message || error).toString(),
      pendingScopes: NFC_BACKUP_PENDING_SCOPES,
    },
  });
  console.error(error?.message || error);
  process.exitCode = 1;
});
