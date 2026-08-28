const fs = require("node:fs");
const path = require("node:path");
const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const sourcePath = path.resolve(__dirname, "..", "..", "catalog", "laundry-public-catalog.json");
const projectConfigPath = path.resolve(__dirname, "..", "..", "..", ".firebaserc");
const apply = process.argv.includes("--apply");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const catalog = readJson(sourcePath);
const projectId = process.env.GOOGLE_CLOUD_PROJECT || readJson(projectConfigPath)?.projects?.default;

const requiredArrays = ["categories", "manufacturers", "models", "spareParts"];
if (!Number.isInteger(catalog.version) || typeof catalog.updatedAt !== "string") {
  throw new Error("Catalogue version and updatedAt are required.");
}
requiredArrays.forEach((field) => {
  if (!Array.isArray(catalog[field])) throw new Error(`Catalogue ${field} must be an array.`);
});

const manufacturerIds = new Set(catalog.manufacturers.map(({ id }) => id));
const categoryIds = new Set(catalog.categories.map(({ id }) => id));
catalog.models.forEach((group, index) => {
  if (!manufacturerIds.has(group.manufacturerId)) {
    throw new Error(`Unknown manufacturer in models[${index}]: ${group.manufacturerId}`);
  }
  if (!categoryIds.has(group.categoryId)) {
    throw new Error(`Unknown category in models[${index}]: ${group.categoryId}`);
  }
  if (!Array.isArray(group.models) || !group.models.length) {
    throw new Error(`models[${index}] must contain at least one model.`);
  }
});

const payloadBytes = Buffer.byteLength(JSON.stringify(catalog), "utf8");
if (payloadBytes > 900_000) throw new Error(`Catalogue is too large for one Firestore document: ${payloadBytes} bytes.`);

console.log(`Laundry catalogue valid: ${catalog.manufacturers.length} manufacturers, ${catalog.models.length} model groups, ${catalog.spareParts.length} spare parts, ${payloadBytes} bytes.`);
if (!apply) {
  console.log("Dry run only. Use the sync command to publish it to Firestore.");
  process.exit(0);
}
if (!projectId) throw new Error("Firebase project ID is not configured.");

if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });
const database = getFirestore();
const batch = database.batch();
const publication = {
  publishedAt: FieldValue.serverTimestamp(),
  publishedBy: "owner-cli",
};

batch.set(database.doc("laundry_public_catalog/meta"), {
  type: "meta",
  version: catalog.version,
  updatedAt: catalog.updatedAt,
  activeManufacturerIds: catalog.manufacturers.map(({ id }) => id),
  ...publication,
});
batch.set(database.doc("laundry_public_catalog/categories"), {
  type: "categories",
  items: catalog.categories,
  ...publication,
});
catalog.manufacturers.forEach((manufacturer) => {
  const modelGroups = catalog.models.filter(({ manufacturerId }) => manufacturerId === manufacturer.id);
  const spareParts = catalog.spareParts.filter(({ manufacturerId }) => manufacturerId === manufacturer.id);
  const document = {
    type: "manufacturer",
    manufacturer,
    modelGroups,
    spareParts,
    ...publication,
  };
  const documentBytes = Buffer.byteLength(JSON.stringify(document), "utf8");
  if (documentBytes > 900_000) {
    throw new Error(`Manufacturer ${manufacturer.id} exceeds the Firestore document limit.`);
  }
  batch.set(database.doc(`laundry_public_catalog/manufacturer_${manufacturer.id}`), document);
});

batch.commit().then(() => {
  console.log(`Laundry catalogue published to ${projectId}/laundry_public_catalog.`);
});
