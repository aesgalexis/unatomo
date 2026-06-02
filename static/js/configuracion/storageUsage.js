import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

const QR_FALLBACK_BYTES = 4 * 1024;
const QR_SIZE_TIMEOUT_MS = 3500;

const toSafeBytes = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const mergeMachines = (...lists) => {
  const map = new Map();
  lists.flat().forEach((machine) => {
    if (!machine?.id) return;
    map.set(machine.id, { ...map.get(machine.id), ...machine });
  });
  return Array.from(map.values());
};

const fetchOwnerMachines = async (uid) => {
  if (!uid) return [];
  const rootQuery = query(collection(db, "machines"), where("ownerUid", "==", uid));
  const [rootSnap, legacySnap] = await Promise.allSettled([
    getDocs(rootQuery),
    getDocs(collection(db, `tenants/${uid}/machines`))
  ]);
  const rootMachines =
    rootSnap.status === "fulfilled"
      ? rootSnap.value.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      : [];
  const legacyMachines =
    legacySnap.status === "fulfilled"
      ? legacySnap.value.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      : [];
  return mergeMachines(rootMachines, legacyMachines);
};

const getDocumentUsage = (machine) => {
  const documents = machine?.documents && typeof machine.documents === "object"
    ? machine.documents
    : {};
  return Object.values(documents).reduce((total, doc) => total + toSafeBytes(doc?.size), 0);
};

const fetchQrSizeFromUrl = async (url) => {
  const safeUrl = (url || "").toString().trim();
  if (!safeUrl || typeof fetch !== "function") return 0;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), QR_SIZE_TIMEOUT_MS);
  try {
    try {
      const head = await fetch(safeUrl, {
        method: "HEAD",
        signal: controller.signal,
        cache: "force-cache"
      });
      const contentLength = toSafeBytes(head.headers.get("content-length"));
      if (contentLength) return contentLength;
    } catch {
      // Some Firebase Storage URLs may not expose HEAD/CORS metadata.
    }

    try {
      const response = await fetch(safeUrl, {
        method: "GET",
        signal: controller.signal,
        cache: "force-cache"
      });
      const blob = await response.blob();
      return toSafeBytes(blob.size);
    } catch {
      return 0;
    }
  } finally {
    window.clearTimeout(timeout);
  }
};

const getQrUsage = async (machine) => {
  const storedSize = toSafeBytes(machine?.tagQrSize || machine?.qrSize);
  if (storedSize) return { bytes: storedSize, estimated: false };
  const hasQr = !!((machine?.tagQrUrl || machine?.qrUrl || machine?.tagQrPath || machine?.qrPath || "").toString().trim());
  if (!hasQr) return { bytes: 0, estimated: false };
  const fetchedSize = await fetchQrSizeFromUrl(machine.tagQrUrl || machine.qrUrl || "");
  if (fetchedSize) return { bytes: fetchedSize, estimated: false };
  return { bytes: QR_FALLBACK_BYTES, estimated: true };
};

export const calculateStorageUsage = async (uid) => {
  const machines = await fetchOwnerMachines(uid);
  const documentsBytes = machines.reduce((total, machine) => total + getDocumentUsage(machine), 0);
  const qrResults = await Promise.all(machines.map(getQrUsage));
  const qrBytes = qrResults.reduce((total, result) => total + result.bytes, 0);
  const estimated = qrResults.some((result) => result.estimated);
  const totalBytes = documentsBytes + qrBytes;
  return {
    totalBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    documentsBytes,
    qrBytes,
    estimated,
    machineCount: machines.length,
    percent: Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100)
  };
};

export const formatBytes = (bytes) => {
  const safeBytes = toSafeBytes(bytes);
  if (safeBytes >= 1024 * 1024 * 1024) return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (safeBytes >= 1024 * 1024) return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
  if (safeBytes >= 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
  return `${Math.round(safeBytes)} B`;
};
