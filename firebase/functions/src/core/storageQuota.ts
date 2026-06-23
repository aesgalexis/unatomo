import {HttpsError} from "firebase-functions/v2/https";
import {machinesCol, storageBucket} from "./firebase";

const ACCOUNT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const QR_FALLBACK_BYTES = 4 * 1024;

export const toSafeStorageSize = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const getMachineDocumentsStorageBytes = (
  machine: FirebaseFirestore.DocumentData,
) => {
  const documents = machine.documents;
  if (!documents || typeof documents !== "object" || Array.isArray(documents)) {
    return 0;
  }
  return Object.values(documents as Record<string, unknown>).reduce(
    (total: number, docData: unknown) => {
      if (Array.isArray(docData)) {
        return docData.reduce(
          (sum: number, item: unknown) =>
            sum + toSafeStorageSize((item as {size?: unknown})?.size),
          total,
        );
      }
      return total + toSafeStorageSize(
        (docData as {size?: unknown})?.size,
      );
    },
    0,
  );
};

export const getStorageObjectSize = async (path: string) => {
  const safePath = (path || "").toString().trim();
  if (!safePath) return 0;
  try {
    const [metadata] = await storageBucket.file(safePath).getMetadata();
    return toSafeStorageSize(metadata.size);
  } catch {
    return 0;
  }
};

export const getMachineQrStorageBytes = async (
  machine: FirebaseFirestore.DocumentData,
) => {
  const storedSize = toSafeStorageSize(machine.tagQrSize || machine.qrSize);
  if (storedSize) return storedSize;
  const qrPath = (machine.tagQrPath || machine.qrPath || "").toString().trim();
  const pathSize = await getStorageObjectSize(qrPath);
  if (pathSize) return pathSize;
  const hasQr = !!(
    (machine.tagQrUrl || machine.qrUrl || qrPath || "").toString().trim()
  );
  return hasQr ? QR_FALLBACK_BYTES : 0;
};

export const getAccountStorageUsageBytes = async (ownerUid: string) => {
  const safeOwnerUid = (ownerUid || "").toString().trim();
  if (!safeOwnerUid) return 0;
  const snap = await machinesCol().where("ownerUid", "==", safeOwnerUid).get();
  const sizes: number[] = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const machine = (docSnap.data() || {}) as FirebaseFirestore.DocumentData;
      return (
        getMachineDocumentsStorageBytes(machine) +
        (await getMachineQrStorageBytes(machine))
      );
    }),
  );
  return sizes.reduce((total: number, size: number) => total + size, 0);
};

export const assertAccountStorageAvailable = async (
  ownerUid: string,
  additionalBytes = 0,
) => {
  const usageBytes = await getAccountStorageUsageBytes(ownerUid);
  const requestedBytes = Math.max(0, toSafeStorageSize(additionalBytes));
  if (usageBytes + requestedBytes >= ACCOUNT_STORAGE_LIMIT_BYTES) {
    throw new HttpsError("resource-exhausted", "storage-full");
  }
  return usageBytes;
};

