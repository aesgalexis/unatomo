import { db } from "/static/js/firebase/firebaseApp.js";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { validateLaundryCatalog } from "/laundryservices/recambios/catalog-schema.js";

const CATALOG_COLLECTION = "laundry_public_catalog";

const isCatalog = (value) =>
  value &&
  Number.isInteger(value.version) &&
  Array.isArray(value.categories) &&
  Array.isArray(value.manufacturers) &&
  Array.isArray(value.models) &&
  Array.isArray(value.spareParts);

const catalogDocuments = (catalog, user) => {
  const publication = {
    publishedAt: serverTimestamp(),
    publishedBy: user.uid,
  };
  return [
    {
      id: "meta",
      data: {
        type: "meta",
        version: catalog.version,
        updatedAt: catalog.updatedAt,
        activeManufacturerIds: catalog.manufacturers.map(({ id }) => id),
        ...publication,
      },
    },
    {
      id: "categories",
      data: { type: "categories", items: catalog.categories, ...publication },
    },
    ...catalog.manufacturers.map((manufacturer) => ({
      id: `manufacturer_${manufacturer.id}`,
      data: {
        type: "manufacturer",
        manufacturer,
        modelGroups: catalog.models.filter(
          ({ manufacturerId }) => manufacturerId === manufacturer.id
        ),
        spareParts: catalog.spareParts.filter(
          ({ manufacturerId }) => manufacturerId === manufacturer.id
        ),
        ...publication,
      },
    })),
  ];
};

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

export async function publishLaundryCatalog(catalog, user, expectedVersion) {
  if (!user?.uid) throw new Error("laundry-catalog-auth-required");
  const validation = validateLaundryCatalog(catalog);
  if (!validation.valid) throw new Error("laundry-catalog-invalid");
  await runTransaction(db, async (transaction) => {
    const metaRef = doc(db, CATALOG_COLLECTION, "meta");
    const metaSnapshot = await transaction.get(metaRef);
    if (!metaSnapshot.exists() || metaSnapshot.data()?.version !== expectedVersion) {
      throw new Error("laundry-catalog-stale");
    }
    catalogDocuments(catalog, user).forEach(({ id, data }) => {
      transaction.set(doc(db, CATALOG_COLLECTION, id), data);
    });
  });
}
