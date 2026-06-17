import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const readJsonIfExists = (filePath) => {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
};

export const getProjectRoot = () => rootDir;

export const getBackupStatusPath = () =>
  path.join(rootDir, "static", "data", "nfc-backup-status.json");

export const toProjectRelativePath = (filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join("/");

export const readBackupStatus = () => {
  const statusPath = getBackupStatusPath();
  const current = readJsonIfExists(statusPath);
  return {
    kind: "unatomo-nfc-backup-status",
    firestore: { status: "pending" },
    storage: { status: "pending" },
    ...(current || {}),
  };
};

export const writeBackupStatusPatch = (patch) => {
  const statusPath = getBackupStatusPath();
  const next = {
    ...readBackupStatus(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  mkdirSync(path.dirname(statusPath), { recursive: true });
  writeFileSync(statusPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
};

export const getSafeErrorMessage = (error) =>
  (error?.message || error || "Unknown error").toString();

export const getTimestampSlug = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

export const getFirebaseProjectId = () => {
  const envProject =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;
  if (envProject) return envProject.trim();

  const firebaseRc = readJsonIfExists(path.join(rootDir, ".firebaserc"));
  return (firebaseRc?.projects?.default || "").toString().trim();
};

export const getFirebaseStorageBucket = (projectId) =>
  (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.GCLOUD_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`
  )
    .toString()
    .trim();

export const getFirebaseAdmin = () => {
  const functionsPackage = path.join(
    rootDir,
    "firebase",
    "functions",
    "package.json",
  );
  if (!existsSync(functionsPackage)) {
    throw new Error("firebase/functions/package.json not found");
  }
  const functionsRequire = createRequire(functionsPackage);
  return functionsRequire("firebase-admin");
};

const requireFirstAvailable = (requests) => {
  for (const request of requests) {
    try {
      return request();
    } catch {
      // Keep trying optional credential sources.
    }
  }
  return null;
};

const getFirebaseCliAuth = () => {
  const projectRequire = createRequire(path.join(rootDir, "package.json"));
  const functionsRequire = createRequire(
    path.join(rootDir, "firebase", "functions", "package.json"),
  );
  const appDataFirebaseTools = process.env.APPDATA
    ? path.join(
        process.env.APPDATA,
        "npm",
        "node_modules",
        "firebase-tools",
        "lib",
        "auth",
      )
    : "";
  const candidates = [
    () => projectRequire("firebase-tools/lib/auth"),
    () => functionsRequire("firebase-tools/lib/auth"),
  ];
  if (appDataFirebaseTools) {
    candidates.push(() => projectRequire(appDataFirebaseTools));
  }
  return requireFirstAvailable(candidates);
};

export const getFirebaseCliAccessToken = async () => {
  const auth = getFirebaseCliAuth();
  if (!auth) {
    throw new Error(
      "Firebase CLI auth not found. Run firebase login or configure ADC.",
    );
  }
  const account =
    auth.getProjectDefaultAccount?.(rootDir) || auth.getGlobalDefaultAccount?.();
  const refreshToken = account?.tokens?.refresh_token;
  if (!refreshToken || typeof auth.getAccessToken !== "function") {
    throw new Error("Firebase CLI login not found. Run firebase login.");
  }

  const scopes = [
    "email",
    "openid",
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase",
  ];

  const token = await auth.getAccessToken(refreshToken, scopes);
  if (!token?.access_token) {
    throw new Error("Firebase CLI could not provide an access token.");
  }
  return token.access_token;
};

export const initFirebaseAdmin = () => {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase project id not found in env or .firebaserc");
  }

  const admin = getFirebaseAdmin();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
      storageBucket: getFirebaseStorageBucket(projectId),
    });
  }

  return {
    admin,
    projectId,
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
  };
};

export const parseCsvArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  return raw
    .slice(prefix.length)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};
