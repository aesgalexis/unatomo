import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDocs,
  getDoc,
  writeBatch,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { auth, db, isAdminUser, storage } from "./firebase-config.js";

const MACHINES_COLLECTION = "agregador_maquinaria_LS";
const COUNTERS_COLLECTION = "maquinaria_counters";
const PREFIX_ORDER = ["P", "T", "L", "S", "C", "R", "M"];
let bootstrapAttempted = false;
let bootstrapPromise = null;

const INITIAL_MACHINES = [
  {
    id: "P001",
    categoria: "Plegadora",
    marca: "Jensen",
    modelo: "Butterfly",
    anio: 2007,
    estado: "Bueno",
    ubicacion: "Mallorca",
    precioAmount: 18000,
    precioTexto: "18.000 €",
    envioIncluido: true,
    puestaEnMarchaIncluida: true,
    garantiaTexto: "",
    garantiaPiezasAnos: null,
    imagenes: [
      { name: "IMG_2946.JPG", path: "", url: "/laundryservices/ls_maquinaria/imagenes/P001/IMG_2946.JPG" },
      { name: "IMG_2947.JPG", path: "", url: "/laundryservices/ls_maquinaria/imagenes/P001/IMG_2947.JPG" },
    ],
  },
  {
    id: "L001",
    categoria: "Lavadora",
    marca: "Tolkar",
    modelo: "55kg",
    anio: 2022,
    estado: "Excelente",
    ubicacion: "Barcelona",
    precioAmount: 17000,
    precioTexto: "17.000 €",
    envioIncluido: true,
    puestaEnMarchaIncluida: true,
    garantiaTexto: "1 año de garantía de piezas",
    garantiaPiezasAnos: 1,
    imagenes: [
      { name: "unnamed.jpg", path: "", url: "/laundryservices/ls_maquinaria/imagenes/L001/unnamed.jpg" },
    ],
  },
  {
    id: "L002",
    categoria: "Lavadora",
    marca: "Unimac",
    modelo: "110 kg",
    anio: 2001,
    estado: "Bueno",
    ubicacion: "Mallorca",
    precioAmount: 12500,
    precioTexto: "12.500 €",
    envioIncluido: false,
    puestaEnMarchaIncluida: false,
    garantiaTexto: "",
    garantiaPiezasAnos: null,
    imagenes: [],
  },
  {
    id: "L003",
    categoria: "Lavadora",
    marca: "Tecnitramo",
    modelo: "57kg",
    anio: 2017,
    estado: "Repasada",
    ubicacion: "Barcelona",
    precioAmount: 14500,
    precioTexto: "14.500 €",
    envioIncluido: true,
    puestaEnMarchaIncluida: true,
    garantiaTexto: "1 año de garantía de piezas",
    garantiaPiezasAnos: 1,
    imagenes: [
      { name: "fd5fc6cb-3c21-4191-8bc1-eef1c099eb0a.JPG", path: "", url: "/laundryservices/ls_maquinaria/imagenes/L003/fd5fc6cb-3c21-4191-8bc1-eef1c099eb0a.JPG" },
    ],
  },
];

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

const getPrefixRank = (id) => {
  const prefix = String(id || "").trim().charAt(0).toUpperCase();
  const rank = PREFIX_ORDER.indexOf(prefix);
  return rank === -1 ? PREFIX_ORDER.length : rank;
};

export const sortMachines = (machines) =>
  [...machines].sort((a, b) => {
    const rankDiff = getPrefixRank(a.id) - getPrefixRank(b.id);
    if (rankDiff !== 0) return rankDiff;
    return extractSequence(a.id) - extractSequence(b.id);
  });

export const observeMachineAdmin = (callback) => onAuthStateChanged(auth, callback);
export const ensureInitialMachinesBootstrapped = () => seedInitialMachines();

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

const seedInitialMachines = async () => {
  if (!isAdminUser(auth.currentUser)) {
    return;
  }
  if (bootstrapAttempted) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const snapshot = await getDocs(collection(db, MACHINES_COLLECTION));
    const existingIds = new Set(snapshot.docs.map((item) => item.id));
    const missingMachines = INITIAL_MACHINES.filter((machine) => !existingIds.has(machine.id));

    const counterState = {};
    INITIAL_MACHINES.forEach((machine) => {
      const prefix = String(machine.id || "").charAt(0).toUpperCase() || "M";
      const sequence = extractSequence(machine.id);
      counterState[prefix] = Math.max(counterState[prefix] || 0, sequence);
    });

    if (!missingMachines.length && snapshot.docs.length >= INITIAL_MACHINES.length) {
      bootstrapAttempted = true;
      return;
    }

    const batch = writeBatch(db);

    missingMachines.forEach((machine) => {
      batch.set(doc(db, MACHINES_COLLECTION, machine.id), {
        ...machine,
        categoriaKey: normalizeTypeKey(machine.categoria),
        visible: true,
        createdBy: "bootstrap",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    Object.entries(counterState).forEach(([prefix, lastSeq]) => {
      batch.set(
        doc(db, COUNTERS_COLLECTION, prefix),
        {
          prefix,
          lastSeq,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    bootstrapAttempted = true;
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
};

export const subscribeMachines = (onData, onError) =>
  onSnapshot(
    query(collection(db, MACHINES_COLLECTION)),
    async (snapshot) => {
      if (snapshot.empty || snapshot.docs.length < INITIAL_MACHINES.length) {
        try {
          await seedInitialMachines();
        } catch {}
      }
      const machines = snapshot.docs
        .map((item) => {
          const data = item.data() || {};
          return {
            docId: item.id,
            id: data.id || item.id,
            categoria: data.categoria || "",
            marca: data.marca || "",
            modelo: data.modelo || "",
            capacidad: data.capacidad || "",
            anio: data.anio ?? null,
            estado: data.estado || "",
            ubicacion: data.ubicacion || "",
            precioAmount: data.precioAmount ?? null,
            precioTexto: data.precioTexto || "",
            envioIncluido: data.envioIncluido !== false,
            puestaEnMarchaIncluida: data.puestaEnMarchaIncluida !== false,
            garantiaTexto: data.garantiaTexto || "",
            garantiaPiezasAnos: data.garantiaPiezasAnos ?? null,
            garantiaTipo: data.garantiaTipo || "",
            comentarios: data.comentarios || "",
            calefaccion: data.calefaccion || "",
            imagenes: Array.isArray(data.imagenes)
              ? data.imagenes.map((image) => (typeof image === "string" ? { url: image, path: "", name: "" } : image))
              : [],
            visible: data.visible !== false,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
            createdBy: data.createdBy || "",
          };
        })
        .filter((item) =>
          item.visible !== false &&
          item.id &&
          item.categoria &&
          item.marca &&
          (item.anio !== null && item.anio !== undefined) &&
          item.estado &&
          item.ubicacion
        );
      onData(sortMachines(machines));
    },
    onError
  );

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

const buildWarrantyData = (type, detail) => {
  const warrantyType = String(type || "").trim();
  if (!warrantyType) {
    return {
      garantiaTexto: "",
      garantiaPiezasAnos: null,
      garantiaTipo: "",
    };
  }

  let warrantyText = String(detail || "").trim();
  if (!warrantyText && warrantyType === "total") {
    warrantyText = "1 año de garantía";
  }
  if (!warrantyText && warrantyType === "piezas") {
    warrantyText = "1 año de garantía de piezas";
  }
  const yearsMatch = warrantyText.match(/(\d+)/);
  return {
    garantiaTexto: warrantyText,
    garantiaPiezasAnos: yearsMatch ? Number.parseInt(yearsMatch[1], 10) || null : null,
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

  const machineId = await reserveNextMachineId(categoria);
  const images = await uploadMachineImages(machineId, files);
  const priceFields = buildPriceFields(draft?.precio);
  const warranty = buildWarrantyData(draft?.garantiaTipo, draft?.garantiaDetalle);

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
    garantiaTipo: warranty.garantiaTipo,
    comentarios: String(draft?.comentarios || "").trim(),
    calefaccion: String(draft?.calefaccion || "").trim(),
    imagenes: images,
    visible: true,
    createdBy: user.email || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, MACHINES_COLLECTION, machineId), payload);
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

  const existingData = currentMachine || existingSnap.data() || {};
  const newImages = await uploadMachineImages(normalizedId, files);
  const existingImages = Array.isArray(existingData.imagenes) ? existingData.imagenes : [];
  const warranty = buildWarrantyData(draft?.garantiaTipo, draft?.garantiaDetalle);
  const priceFields = buildPriceFields(draft?.precio);

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
    garantiaTipo: warranty.garantiaTipo,
    comentarios: String(draft?.comentarios || "").trim(),
    calefaccion: String(draft?.calefaccion || "").trim(),
    imagenes: [...existingImages, ...newImages],
    visible: true,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
  return {
    ...existingData,
    ...payload,
  };
};
