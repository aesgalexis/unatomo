import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getFirebaseCliAccessToken,
  getFirebaseProjectId,
  getProjectRoot,
  getSafeErrorMessage,
  getTimestampSlug,
  toProjectRelativePath,
  writeBackupStatusPatch,
} from "./firebase-admin-local.mjs";

const EXPORTED_USER_KEYS = [
  "localId",
  "email",
  "emailVerified",
  "passwordHash",
  "salt",
  "displayName",
  "photoUrl",
  "lastLoginAt",
  "createdAt",
  "phoneNumber",
  "disabled",
  "customAttributes",
];

const EXPORTED_PROVIDER_KEYS = [
  "providerId",
  "rawId",
  "email",
  "displayName",
  "photoUrl",
];

const SUPPORTED_PROVIDERS = new Set([
  "google.com",
  "facebook.com",
  "twitter.com",
  "github.com",
  "apple.com",
  "microsoft.com",
  "gc.apple.com",
  "playgames.google.com",
  "linkedin.com",
  "yahoo.com",
]);

const pick = (source, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );

const toNormalBase64 = (value) =>
  (value || "").replace(/_/g, "/").replace(/-/g, "+");

const normalizeUser = (user) => {
  const source = { ...user };
  if (source.passwordHash && source.version !== 0) {
    delete source.passwordHash;
    delete source.salt;
  }
  const exported = pick(source, EXPORTED_USER_KEYS);
  if (exported.lastLoginAt !== undefined) {
    exported.lastSignedInAt = exported.lastLoginAt;
    delete exported.lastLoginAt;
  }
  if (exported.passwordHash) exported.passwordHash = toNormalBase64(exported.passwordHash);
  if (exported.salt) exported.salt = toNormalBase64(exported.salt);
  if (Array.isArray(source.providerUserInfo)) {
    exported.providerUserInfo = source.providerUserInfo
      .filter((provider) => SUPPORTED_PROVIDERS.has(provider.providerId))
      .map((provider) => pick(provider, EXPORTED_PROVIDER_KEYS));
  }
  return exported;
};

const fetchAuthUsers = async (projectId, accessToken) => {
  const users = [];
  let nextPageToken = "";
  do {
    const url = new URL(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`,
    );
    url.searchParams.set("maxResults", "1000");
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firebase Auth API ${response.status}: ${body.slice(0, 500)}`);
    }
    const payload = await response.json();
    users.push(...(payload.users || []).map(normalizeUser));
    nextPageToken = payload.nextPageToken || "";
  } while (nextPageToken);
  return users;
};

const backupAuth = async () => {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase project id not found in env or .firebaserc");
  }
  const startedAt = new Date().toISOString();
  const accessToken = await getFirebaseCliAccessToken();
  const backupDir = path.join(getProjectRoot(), ".backups");
  mkdirSync(backupDir, { recursive: true });
  const filePath = path.join(backupDir, `${getTimestampSlug()}-nfc-auth.json`);
  const users = await fetchAuthUsers(projectId, accessToken);
  writeFileSync(filePath, `${JSON.stringify({ users }, null, 2)}\n`, "utf8");
  const userCount = users.length;
  const completedAt = new Date().toISOString();
  writeBackupStatusPatch({
    auth: {
      status: "ok",
      startedAt,
      completedAt,
      file: toProjectRelativePath(filePath),
      projectId,
      userCount,
      size: statSync(filePath).size,
    },
  });
  console.log(`Firebase Auth backup written: ${filePath}`);
};

backupAuth().catch((error) => {
  const message = getSafeErrorMessage(error);
  writeBackupStatusPatch({
    auth: {
      status: "error",
      attemptedAt: new Date().toISOString(),
      error: message,
    },
  });
  console.error(message);
  process.exitCode = 1;
});
