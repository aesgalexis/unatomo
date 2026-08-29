import {
  collection,
  onSnapshot,
  query,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebasePublicDb.js";

const MACHINES_COLLECTION = "agregador_maquinaria_LS";
const PREFIX_ORDER = ["P", "T", "L", "S", "C", "R", "M"];

const extractSequence = (id) => {
  const match = String(id || "").toUpperCase().match(/^([A-Z])(\d+)$/);
  return match ? Number.parseInt(match[2], 10) || 0 : 0;
};

const getPrefixRank = (id) => {
  const rank = PREFIX_ORDER.indexOf(String(id || "").trim().charAt(0).toUpperCase());
  return rank === -1 ? PREFIX_ORDER.length : rank;
};

export const sortMachines = (machines) =>
  [...machines].sort((a, b) => {
    const rankDiff = getPrefixRank(a.id) - getPrefixRank(b.id);
    return rankDiff || extractSequence(a.id) - extractSequence(b.id);
  });

const mapMachine = (item) => {
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
    garantiaMeses: data.garantiaMeses ?? null,
    garantiaTipo: data.garantiaTipo || "",
    comentarios: data.comentarios || "",
    calefaccion: data.calefaccion || "",
    imagenes: Array.isArray(data.imagenes)
      ? data.imagenes.map((image) =>
        typeof image === "string" ? { url: image, path: "", name: "" } : image)
      : [],
    visible: data.visible !== false,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    createdBy: data.createdBy || "",
  };
};

export const subscribeMachines = (onData, onError) =>
  onSnapshot(
    query(collection(db, MACHINES_COLLECTION)),
    (snapshot) => {
      const machines = snapshot.docs
        .map(mapMachine)
        .filter((item) =>
          item.id && item.categoria && item.marca && item.estado && item.ubicacion);
      onData(sortMachines(machines));
    },
    onError
  );
