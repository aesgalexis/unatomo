import { isEn } from "../../i18n.js";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const normalizeText = (value = "") =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase(isEn ? "en" : "es");

const getExtension = (doc = {}) => {
  const fromName = (doc.name || doc.displayName || doc.storagePath || doc.url || "")
    .toString()
    .split("?")[0]
    .split("#")[0]
    .split(".")
    .pop();
  return normalizeText(fromName);
};

const getMediaType = (doc = {}) => {
  const contentType = (doc.contentType || "").toString().toLowerCase();
  const extension = getExtension(doc);
  if (contentType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image";
  if (contentType === "application/pdf" || extension === "pdf") return "pdf";
  return "document";
};

const kindLabels = {
  plate: { es: "Placa", en: "Plate" },
  manual: { es: "Manual", en: "Manual" },
  other: { es: "Documentaci\u00f3n", en: "Documentation" }
};

const kindAliases = {
  plate: ["placa", "plate", "serial", "nameplate", "foto", "photo", "imagen", "image"],
  manual: ["manual", "pdf", "documento", "document"],
  other: ["otra", "other", "documentacion", "documentation", "documento", "document"]
};

const mediaAliases = {
  image: ["imagen", "image", "foto", "photo", "jpg", "jpeg", "png", "webp"],
  pdf: ["pdf", "manual", "documento", "document"],
  document: ["documento", "document", "archivo", "file"]
};

const typeFilters = [
  { field: "kind", value: "plate", aliases: ["placa", "plate", "matricula", "nameplate"] },
  { field: "kind", value: "manual", aliases: ["manual"] },
  { field: "kind", value: "other", aliases: ["otra", "other", "documentacion", "documentation"] },
  { field: "mediaType", value: "pdf", aliases: ["pdf"] },
  { field: "mediaType", value: "image", aliases: ["imagen", "image", "foto", "photo", "jpg", "jpeg", "png", "webp"] },
  { field: "mediaType", value: "document", aliases: ["documento", "document", "archivo", "file"] }
];

const getDisplayName = (doc = {}, fallback = "") =>
  (doc.displayName || doc.name || fallback || "").toString().trim();

const phraseOrTermsMatch = (haystack = "", needle = "") => {
  const cleanNeedle = normalizeText(needle);
  if (!cleanNeedle) return true;
  if (haystack.includes(cleanNeedle)) return true;
  return cleanNeedle
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
};

const parseGalleryQuery = (query = "") => {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  const filters = [];
  const remaining = [];
  tokens.forEach((token) => {
    const filter = typeFilters.find((item) => item.aliases.includes(token));
    if (filter) {
      filters.push({ field: filter.field, value: filter.value });
    } else {
      remaining.push(token);
    }
  });
  return {
    filters,
    text: remaining.join(" ")
  };
};

const createGalleryEntry = ({ machine, doc, kind, index = 0 }) => {
  if (!doc || typeof doc !== "object") return null;
  const url = (doc.url || doc.downloadUrl || "").toString().trim();
  if (!url) return null;
  const mediaType = getMediaType(doc);
  const extension = getExtension(doc);
  const machineTitle = (machine.title || machine.nombre || machine.id || "").toString().trim();
  const kindLabel = kindLabels[kind]?.[isEn ? "en" : "es"] || kind;
  const name = getDisplayName(doc, kindLabel);
  const taskContext = [
    doc.context,
    doc.linkedTaskId,
    doc.linkedStatusCycleId
  ].filter(Boolean).join(" ");
  const machineSearchText = normalizeText([
    machineTitle,
    machine.id,
    machine.location,
    machine.brand,
    machine.model,
    machine.serial,
    machine.adminEmail,
    machine.ownerEmail
  ].filter(Boolean).join(" "));
  const documentSearchText = normalizeText([
    name,
    doc.name,
    doc.displayName,
    doc.storagePath,
    doc.contentType,
    extension,
    taskContext
  ].filter(Boolean).join(" "));
  const typeSearchText = normalizeText([
    mediaType,
    kind,
    kindLabel,
    ...(kindAliases[kind] || []),
    ...(mediaAliases[mediaType] || [])
  ].filter(Boolean).join(" "));
  const searchText = [machineSearchText, documentSearchText, typeSearchText].join(" ");

  return {
    id: `${machine.id || "machine"}-${kind}-${doc.id || doc.storagePath || index}`,
    url,
    name,
    storagePath: (doc.storagePath || "").toString().trim(),
    machineId: machine.id || "",
    machineTitle,
    kind,
    kindLabel,
    mediaType,
    extension,
    contentType: doc.contentType || "",
    uploadedAt: doc.uploadedAt || "",
    machineSearchText,
    documentSearchText,
    typeSearchText,
    searchText
  };
};

export const buildGalleryEntries = (machines = []) => {
  const entries = [];
  (Array.isArray(machines) ? machines : []).forEach((machine) => {
    const documents = machine?.documents && typeof machine.documents === "object"
      ? machine.documents
      : {};
    const plate = createGalleryEntry({ machine, doc: documents.plate, kind: "plate" });
    const manual = createGalleryEntry({ machine, doc: documents.manual, kind: "manual" });
    if (plate) entries.push(plate);
    if (manual) entries.push(manual);
    (Array.isArray(documents.other) ? documents.other : []).forEach((doc, index) => {
      const entry = createGalleryEntry({ machine, doc, kind: "other", index });
      if (entry) entries.push(entry);
    });
  });
  return entries.sort((a, b) => {
    const machineOrder = a.machineTitle.localeCompare(
      b.machineTitle,
      isEn ? "en" : "es",
      { sensitivity: "base" }
    );
    if (machineOrder) return machineOrder;
    const kindOrder = ["plate", "manual", "other"].indexOf(a.kind) -
      ["plate", "manual", "other"].indexOf(b.kind);
    if (kindOrder) return kindOrder;
    return a.name.localeCompare(b.name, isEn ? "en" : "es", { sensitivity: "base" });
  });
};

export const filterGalleryEntries = (entries = [], query = "") => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return entries;
  const parsed = parseGalleryQuery(query);
  return entries.filter((entry) => {
    const matchesType = parsed.filters.every((filter) =>
      entry[filter.field] === filter.value
    );
    if (!matchesType) return false;
    if (!parsed.text) return true;
    return (
      phraseOrTermsMatch(entry.machineSearchText, parsed.text) ||
      phraseOrTermsMatch(entry.documentSearchText, parsed.text)
    );
  });
};
