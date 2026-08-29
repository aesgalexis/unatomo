import {
  getDocs,
  getDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import { db, isAdminUser, storage } from "./firebase-config.js";

const MACHINES_COLLECTION = "agregador_maquinaria_LS";
const COUNTERS_COLLECTION = "maquinaria_counters";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const normalizeTypeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toSlug = (value) =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const parseInteger = (value) => {
  const numeric = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const parsePriceAmount = (value) => {
  const raw = String(value || "")
    .trim()
    .replace(/[€$£\s]/g, "")
    .replace(/eur/gi, "");
  if (!raw) return null;
  if (raw.includes(".") && raw.includes(",")) {
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (raw.includes(",")) {
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }
  const normalized = raw.replace(/\./g, "");
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const buildPriceFields = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { precioAmount: null, precioTexto: "" };
  }

  if (raw.toLowerCase() === "consultar") {
    return { precioAmount: null, precioTexto: "Consultar" };
  }

  const precioAmount = parsePriceAmount(raw);
  if (precioAmount === null) {
    throw new Error("El precio debe ser numerico o 'Consultar'.");
  }

  return {
    precioAmount,
    precioTexto: "",
  };
};

const getMachineIdHelper = () => window.lsMachineId || null;

const extractSequence = (id) => {
  const match = String(id || "").toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) return 0;
  return Number.parseInt(match[2], 10) || 0;
};

const getNextSequenceForPrefix = async (prefix) => {
  const snapshot = await getDocs(collection(db, MACHINES_COLLECTION));
  let maxFromDocs = 0;
  snapshot.docs.forEach((item) => {
    const machineId = String(item.data()?.id || item.id || "").toUpperCase();
    if (!machineId.startsWith(prefix)) return;
    maxFromDocs = Math.max(maxFromDocs, extractSequence(machineId));
  });

  const counterSnap = await getDoc(doc(db, COUNTERS_COLLECTION, prefix));
  const maxFromCounter = counterSnap.exists() ? Number(counterSnap.data()?.lastSeq) || 0 : 0;
  return Math.max(maxFromDocs, maxFromCounter) + 1;
};

export const getSuggestedMachineId = async (categoria) => {
  const helper = getMachineIdHelper();
  if (!helper || typeof helper.getTypePrefix !== "function" || typeof helper.buildMachineId !== "function") {
    return "M001";
  }
  const prefix = helper.getTypePrefix(categoria);
  const nextSequence = await getNextSequenceForPrefix(prefix);
  return helper.buildMachineId(categoria, nextSequence);
};

const reserveNextMachineId = async (categoria) => {
  const helper = getMachineIdHelper();
  if (!helper || typeof helper.getTypePrefix !== "function" || typeof helper.buildMachineId !== "function") {
    throw new Error("Machine ID helper unavailable");
  }

  const prefix = helper.getTypePrefix(categoria);
  const counterRef = doc(db, COUNTERS_COLLECTION, prefix);
  const nextFromData = await getNextSequenceForPrefix(prefix);

  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const lastSeq = counterSnap.exists() ? Number(counterSnap.data()?.lastSeq) || 0 : 0;
    const nextSeq = Math.max(lastSeq + 1, nextFromData);
    const id = helper.buildMachineId(categoria, nextSeq);
    transaction.set(
      counterRef,
      {
        prefix,
        lastSeq: nextSeq,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return id;
  });
};

const uploadMachineImages = async (machineId, files) => {
  const selected = Array.from(files || []);
  if (!selected.length) return [];

  if (selected.some((file) =>
    !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES)) {
    throw new Error("Solo se admiten imágenes JPG, PNG o WEBP de hasta 12 MB.");
  }

  const uploaded = [];
  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index];
    const safeName = toSlug(file.name) || `imagen-${index + 1}`;
    const storageRef = ref(storage, `maquinaria/${machineId}/${Date.now()}-${safeName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    uploaded.push({
      name: file.name,
      path: storageRef.fullPath,
      url,
    });
  }
  return uploaded;
};

const cleanupImages = async (images) => {
  const paths = images.map((image) => image?.path).filter(Boolean);
  const results = await Promise.allSettled(paths.map((path) => deleteObject(ref(storage, path))));
  return results.filter(({ status }) => status === "rejected").length;
};

const buildWarrantyData = (type, detail) => {
  const warrantyType = String(type || "").trim();
  if (!warrantyType) {
    return {
      garantiaTexto: "",
      garantiaPiezasAnos: null,
      garantiaMeses: null,
      garantiaTipo: "",
    };
  }

  const months = Number.parseInt(detail, 10);
  const safeMonths = Number.isFinite(months) && months > 0 ? months : null;
  if (!safeMonths) {
    return {
      garantiaTexto: "",
      garantiaPiezasAnos: null,
      garantiaMeses: null,
      garantiaTipo: "",
    };
  }
  const suffix = warrantyType === "total" ? "garantía" : "garantía de piezas";
  const warrantyText = `${safeMonths} meses de ${suffix}`;
  const years = safeMonths % 12 === 0 ? safeMonths / 12 : null;
  return {
    garantiaTexto: warrantyText,
    garantiaPiezasAnos: years,
    garantiaMeses: safeMonths,
    garantiaTipo: warrantyType,
  };
};

export const createMachine = async (draft, files, user) => {
  if (!isAdminUser(user)) {
    throw new Error("Admin only");
  }

  const categoria = String(draft?.categoria || "").trim();
  const marca = String(draft?.marca || "").trim();
  const modelo = String(draft?.modelo || "").trim();
  const capacidad = String(draft?.capacidad || "").trim();
  const ubicacion = String(draft?.ubicacion || "").trim();
  const estado = String(draft?.estado || "").trim();

  if (!categoria || !marca || !ubicacion || !estado) {
    throw new Error("Missing required machine fields");
  }

  const priceFields = buildPriceFields(draft?.precio);
  const warranty = buildWarrantyData(draft?.garantiaTipo, draft?.garantiaDetalle);
  const machineId = await reserveNextMachineId(categoria);
  const images = await uploadMachineImages(machineId, files);

  const payload = {
    id: machineId,
    categoria,
    categoriaKey: normalizeTypeKey(categoria),
    marca,
    modelo,
    capacidad,
    anio: parseInteger(draft?.anio),
    estado,
    ubicacion,
    precioAmount: priceFields.precioAmount,
    precioTexto: priceFields.precioTexto,
    envioIncluido: Boolean(draft?.envioIncluido),
    puestaEnMarchaIncluida: Boolean(draft?.puestaEnMarchaIncluida),
    garantiaTexto: warranty.garantiaTexto,
    garantiaPiezasAnos: warranty.garantiaPiezasAnos,
    garantiaMeses: warranty.garantiaMeses,
    garantiaTipo: warranty.garantiaTipo,
    comentarios: String(draft?.comentarios || "").trim(),
    calefaccion: String(draft?.calefaccion || "").trim(),
    imagenes: images,
    visible: draft?.visible !== false,
    createdBy: user.email || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, MACHINES_COLLECTION, machineId), payload);
  } catch (error) {
    await cleanupImages(images);
    throw error;
  }
  return payload;
};

export const updateMachine = async (machineId, draft, files, user, currentMachine = null) => {
  if (!isAdminUser(user)) {
    throw new Error("Admin only");
  }

  const normalizedId = String(machineId || "").trim().toUpperCase();
  if (!normalizedId) {
    throw new Error("Missing machine ID");
  }

  const categoria = String(draft?.categoria || "").trim();
  const marca = String(draft?.marca || "").trim();
  const modelo = String(draft?.modelo || "").trim();
  const capacidad = String(draft?.capacidad || "").trim();
  const ubicacion = String(draft?.ubicacion || "").trim();
  const estado = String(draft?.estado || "").trim();

  if (!categoria || !marca || !ubicacion || !estado) {
    throw new Error("Missing required machine fields");
  }

  const docRef = doc(db, MACHINES_COLLECTION, normalizedId);
  const existingSnap = await getDoc(docRef);
  if (!existingSnap.exists()) {
    throw new Error("Machine not found");
  }

  const existingData = existingSnap.data() || currentMachine || {};
  const existingImages = Array.isArray(existingData.imagenes) ? existingData.imagenes : [];
  const keptPaths = new Set(Array.isArray(draft?.keptImagePaths) ? draft.keptImagePaths : []);
  const keptImages = existingImages.filter((image) =>
    image?.path ? keptPaths.has(image.path) : keptPaths.has(image?.url));
  const removedImages = existingImages.filter((image) => !keptImages.includes(image));
  const warranty = buildWarrantyData(draft?.garantiaTipo, draft?.garantiaDetalle);
  const priceFields = buildPriceFields(draft?.precio);
  const newImages = await uploadMachineImages(normalizedId, files);

  const payload = {
    id: normalizedId,
    categoria,
    categoriaKey: normalizeTypeKey(categoria),
    marca,
    modelo,
    capacidad,
    anio: parseInteger(draft?.anio),
    estado,
    ubicacion,
    precioAmount: priceFields.precioAmount,
    precioTexto: priceFields.precioTexto,
    envioIncluido: Boolean(draft?.envioIncluido),
    puestaEnMarchaIncluida: Boolean(draft?.puestaEnMarchaIncluida),
    garantiaTexto: warranty.garantiaTexto,
    garantiaPiezasAnos: warranty.garantiaPiezasAnos,
    garantiaMeses: warranty.garantiaMeses,
    garantiaTipo: warranty.garantiaTipo,
    comentarios: String(draft?.comentarios || "").trim(),
    calefaccion: String(draft?.calefaccion || "").trim(),
    imagenes: [...keptImages, ...newImages],
    visible: draft?.visible !== false,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    await cleanupImages(newImages);
    throw error;
  }
  const cleanupFailed = await cleanupImages(removedImages);
  return {
    ...existingData,
    ...payload,
    cleanupFailed,
  };
};
