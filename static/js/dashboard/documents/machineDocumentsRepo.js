import { storage } from "/static/js/firebase/firebaseApp.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;
const MAX_MANUAL_BYTES = 25 * 1024 * 1024;
const MAX_OTHER_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1800;
const JPEG_QUALITY = 0.82;
const ALLOWED_PLATE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_OTHER_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const extensionForType = (type) => {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  return "jpg";
};

const createDocumentId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizeFileName = (name = "document") =>
  (name || "document")
    .toString()
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "document";

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    img.src = url;
  });

const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("image-compress-failed"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });

const compressPlateImage = async (file) => {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas);
};

export const validatePlateImage = (file) => {
  if (!file) throw new Error("file-missing");
  if (!ALLOWED_PLATE_TYPES.has(file.type)) throw new Error("file-type");
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error("file-too-large");
};

export const validateManualPdf = (file) => {
  if (!file) throw new Error("file-missing");
  if (file.type !== "application/pdf") throw new Error("file-type");
  if (file.size > MAX_MANUAL_BYTES) throw new Error("file-too-large");
};

export const validateOtherDocument = (file) => {
  if (!file) throw new Error("file-missing");
  if (!ALLOWED_OTHER_TYPES.has(file.type)) throw new Error("file-type");
  if (file.size > MAX_OTHER_BYTES) throw new Error("file-too-large");
};

export const uploadPlateDocument = async ({ machine, file, uploadedBy }) => {
  validatePlateImage(file);
  const ownerUid = (machine.tenantId || machine.ownerUid || "").trim();
  const machineId = (machine.id || "").trim();
  if (!ownerUid || !machineId || !uploadedBy) throw new Error("missing-context");

  const compressed = await compressPlateImage(file);
  const ext = extensionForType(compressed.type || "image/jpeg");
  const storagePath = `machine-docs/${ownerUid}/${machineId}/plate/plate.${ext}`;
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: compressed.type || "image/jpeg",
    customMetadata: {
      kind: "plate",
      ownerUid,
      machineId,
      uploadedBy,
      originalName: file.name || "plate"
    }
  };

  await uploadBytes(storageRef, compressed, metadata);
  const url = await getDownloadURL(storageRef);
  const previousPath = machine.documents?.plate?.storagePath || "";
  if (previousPath && previousPath !== storagePath) {
    await deleteObject(ref(storage, previousPath)).catch(() => {});
  }

  return {
    kind: "plate",
    name: file.name || "plate.jpg",
    contentType: metadata.contentType,
    size: compressed.size,
    originalSize: file.size,
    storagePath,
    url,
    uploadedAt: new Date().toISOString(),
    uploadedBy
  };
};

export const uploadManualDocument = async ({ machine, file, uploadedBy }) => {
  validateManualPdf(file);
  const ownerUid = (machine.tenantId || machine.ownerUid || "").trim();
  const machineId = (machine.id || "").trim();
  if (!ownerUid || !machineId || !uploadedBy) throw new Error("missing-context");

  const storagePath = `machine-docs/${ownerUid}/${machineId}/manual/manual.pdf`;
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: "application/pdf",
    customMetadata: {
      kind: "manual",
      ownerUid,
      machineId,
      uploadedBy,
      originalName: file.name || "manual.pdf"
    }
  };

  await uploadBytes(storageRef, file, metadata);
  const url = await getDownloadURL(storageRef);
  const previousPath = machine.documents?.manual?.storagePath || "";
  if (previousPath && previousPath !== storagePath) {
    await deleteObject(ref(storage, previousPath)).catch(() => {});
  }

  return {
    kind: "manual",
    name: file.name || "manual.pdf",
    contentType: metadata.contentType,
    size: file.size,
    originalSize: file.size,
    storagePath,
    url,
    uploadedAt: new Date().toISOString(),
    uploadedBy
  };
};

export const uploadOtherDocument = async ({ machine, file, uploadedBy }) => {
  validateOtherDocument(file);
  const ownerUid = (machine.tenantId || machine.ownerUid || "").trim();
  const machineId = (machine.id || "").trim();
  if (!ownerUid || !machineId || !uploadedBy) throw new Error("missing-context");

  const docId = createDocumentId();
  const ext = extensionForType(file.type);
  const baseName = sanitizeFileName(file.name || `document.${ext}`);
  const storagePath = `machine-docs/${ownerUid}/${machineId}/other/${docId}-${baseName}`;
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      kind: "other",
      ownerUid,
      machineId,
      uploadedBy,
      originalName: file.name || baseName
    }
  };

  await uploadBytes(storageRef, file, metadata);
  const url = await getDownloadURL(storageRef);

  return {
    id: docId,
    kind: "other",
    name: file.name || baseName,
    contentType: metadata.contentType,
    size: file.size,
    originalSize: file.size,
    storagePath,
    url,
    uploadedAt: new Date().toISOString(),
    uploadedBy
  };
};

export const deleteMachineDocumentFile = async (storagePath) => {
  const safePath = (storagePath || "").toString().trim();
  if (!safePath) return;
  await deleteObject(ref(storage, safePath));
};
