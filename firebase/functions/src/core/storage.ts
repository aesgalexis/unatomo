import {randomUUID} from "node:crypto";
import {storageBucket} from "./firebase";

export const buildStorageDownloadUrl = (path: string, token: string) => {
  const encodedPath = encodeURIComponent(path);
  return (
    `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}/o/` +
    `${encodedPath}?alt=media&token=${token}`
  );
};

export const getFirebaseDownloadToken = (
  metadata: {metadata?: Record<string, unknown>} | undefined,
) => {
  const token = (metadata?.metadata?.firebaseStorageDownloadTokens || "")
    .toString()
    .split(",")[0]
    .trim();
  return token || randomUUID();
};

export const copyStorageFileWithToken = async (
  oldPath: string,
  oldPrefix: string,
  newPrefix: string,
) => {
  const safeOldPath = (oldPath || "").toString().trim();
  if (!safeOldPath || !safeOldPath.startsWith(oldPrefix)) {
    return {path: safeOldPath, url: "", copied: false};
  }

  const newPath = `${newPrefix}${safeOldPath.slice(oldPrefix.length)}`;
  if (newPath === safeOldPath) {
    return {path: safeOldPath, url: "", copied: false};
  }

  const source = storageBucket.file(safeOldPath);
  const destination = storageBucket.file(newPath);
  const [metadata] = await source.getMetadata();
  const token = getFirebaseDownloadToken(metadata);
  await source.copy(destination);
  await destination.setMetadata({
    metadata: {
      ...(metadata.metadata || {}),
      firebaseStorageDownloadTokens: token,
    },
  });

  return {
    path: newPath,
    url: buildStorageDownloadUrl(newPath, token),
    copied: true,
    oldPath: safeOldPath,
  };
};

export const rewriteMachineDocumentStorageRefs = async (
  value: unknown,
  oldPrefix: string,
  newPrefix: string,
  copiedPaths: Set<string>,
): Promise<unknown> => {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        rewriteMachineDocumentStorageRefs(
          item,
          oldPrefix,
          newPrefix,
          copiedPaths,
        ),
      ),
    );
  }

  if (!value || typeof value !== "object") return value;

  const current = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(current)) {
    next[key] = await rewriteMachineDocumentStorageRefs(
      item,
      oldPrefix,
      newPrefix,
      copiedPaths,
    );
  }

  const storagePath = (current.storagePath || "").toString().trim();
  if (storagePath && storagePath.startsWith(oldPrefix)) {
    const copied = await copyStorageFileWithToken(
      storagePath,
      oldPrefix,
      newPrefix,
    );
    if (copied.copied && copied.oldPath) copiedPaths.add(copied.oldPath);
    next.storagePath = copied.path;
    if (copied.url && typeof current.url === "string") {
      next.url = copied.url;
    }
    if (copied.url && typeof current.downloadUrl === "string") {
      next.downloadUrl = copied.url;
    }
  }

  return next;
};

export const deleteStorageFileIfExists = async (path: string) => {
  const safePath = (path || "").toString().trim();
  if (!safePath) return;
  try {
    await storageBucket.file(safePath).delete({ignoreNotFound: true});
  } catch {
    // ignore storage cleanup failures
  }
};

export const collectUniqueDocRefs = (
  target: Map<string, FirebaseFirestore.DocumentReference>,
  refs: Array<FirebaseFirestore.DocumentReference | null | undefined>,
) => {
  refs.forEach((ref) => {
    if (!ref) return;
    target.set(ref.path, ref);
  });
};

export const deleteCollectedDocRefs = async (
  refs: Map<string, FirebaseFirestore.DocumentReference>,
) => {
  await Promise.allSettled(
    Array.from(refs.values()).map((ref) => ref.delete()),
  );
};

