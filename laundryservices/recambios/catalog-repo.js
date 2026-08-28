import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const CATALOG_COLLECTION = "laundry_public_catalog";

const isCatalog = (value) =>
  value &&
  Number.isInteger(value.version) &&
  Array.isArray(value.categories) &&
  Array.isArray(value.manufacturers) &&
  Array.isArray(value.models) &&
  Array.isArray(value.spareParts);

export async function loadLaundryCatalog() {
  const snapshot = await getDocs(collection(db, CATALOG_COLLECTION));
  const documents = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
  const meta = documents.get("meta");
  const categories = documents.get("categories")?.items;
  if (!meta || !Array.isArray(meta.activeManufacturerIds) || !Array.isArray(categories)) {
    throw new Error("laundry-catalog-not-published");
  }

  const manufacturerDocuments = meta.activeManufacturerIds.map((id) => documents.get(`manufacturer_${id}`));
  if (manufacturerDocuments.some((value) => !value)) throw new Error("laundry-catalog-incomplete");
  const catalog = {
    version: meta.version,
    updatedAt: meta.updatedAt,
    categories,
    manufacturers: manufacturerDocuments.map(({ manufacturer }) => manufacturer),
    models: manufacturerDocuments.flatMap(({ modelGroups }) => modelGroups),
    spareParts: manufacturerDocuments.flatMap(({ spareParts }) => spareParts),
  };
  if (!isCatalog(catalog)) throw new Error("laundry-catalog-invalid");
  return catalog;
}
