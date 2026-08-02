import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "static", "data", "nfc-backup-status.json");
const OUTPUT = path.join(
  ROOT,
  "static",
  "data",
  "nfc-backup-status-public.json",
);

const readStatus = async () => {
  try {
    return JSON.parse(await readFile(SOURCE, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
};

const safeComponent = (item = {}, fields = {}) => ({
  status: item.status || "pending",
  ...(item.completedAt ? { completedAt: item.completedAt } : {}),
  ...fields,
});

const count = (value) => (Array.isArray(value) ? value.length : 0);

const createPublicStatus = (status = {}) => ({
  kind: "unatomo-nfc-backup-status",
  overall: {
    status: status.overall?.status || "pending",
    ...(status.overall?.completedAt
      ? { completedAt: status.overall.completedAt }
      : {}),
    firestoreCollectionCount: count(status.overall?.firestoreCollections),
    storagePrefixCount: count(status.overall?.storagePrefixes),
    firebaseAuth: status.overall?.firebaseAuth === true,
  },
  firestore: safeComponent(status.firestore, {
    ...(Number.isFinite(Number(status.firestore?.collectionCount))
      ? { collectionCount: Number(status.firestore.collectionCount) }
      : {}),
    ...(Number.isFinite(Number(status.firestore?.documentCount))
      ? { documentCount: Number(status.firestore.documentCount) }
      : {}),
  }),
  storage: safeComponent(status.storage, {
    ...(Number.isFinite(Number(status.storage?.fileCount))
      ? { fileCount: Number(status.storage.fileCount) }
      : {}),
    ...(Number.isFinite(Number(status.storage?.totalBytes))
      ? { totalBytes: Number(status.storage.totalBytes) }
      : {}),
  }),
  auth: safeComponent(status.auth, {
    ...(Number.isFinite(Number(status.auth?.userCount))
      ? { userCount: Number(status.auth.userCount) }
      : {}),
    ...(Number.isFinite(Number(status.auth?.size))
      ? { size: Number(status.auth.size) }
      : {}),
  }),
});

const status = await readStatus();
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify(createPublicStatus(status), null, 2)}\n`,
  "utf8",
);
console.log("static/data/nfc-backup-status-public.json actualizado.");
