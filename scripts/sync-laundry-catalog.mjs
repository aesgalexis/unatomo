import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getFirebaseCliAccessToken,
  getFirebaseProjectId,
  getProjectRoot,
} from "./firebase-admin-local.mjs";

const sourcePath = path.join(
  getProjectRoot(),
  "firebase",
  "catalog",
  "laundry-public-catalog.json",
);
const apply = process.argv.includes("--apply");
const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
const projectId = getFirebaseProjectId();
const requiredArrays = ["categories", "manufacturers", "models", "spareParts"];

if (!Number.isInteger(catalog.version) || typeof catalog.updatedAt !== "string") {
  throw new Error("Catalogue version and updatedAt are required.");
}
requiredArrays.forEach((field) => {
  if (!Array.isArray(catalog[field])) {
    throw new Error(`Catalogue ${field} must be an array.`);
  }
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
if (payloadBytes > 900_000) {
  throw new Error(`Catalogue migration snapshot is unexpectedly large: ${payloadBytes} bytes.`);
}

console.log(
  `Laundry catalogue valid: ${catalog.manufacturers.length} manufacturers, ` +
  `${catalog.models.length} model groups, ${catalog.spareParts.length} spare parts, ` +
  `${payloadBytes} bytes.`,
);
if (!apply) {
  console.log("Dry run only. Use the sync command to publish it to Firestore.");
  process.exit(0);
}
if (!projectId) throw new Error("Firebase project ID is not configured.");

const publishedAt = new Date().toISOString();
const publication = { publishedAt, publishedBy: "owner-cli" };
const documents = [
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
        ({ manufacturerId }) => manufacturerId === manufacturer.id,
      ),
      spareParts: catalog.spareParts.filter(
        ({ manufacturerId }) => manufacturerId === manufacturer.id,
      ),
      ...publication,
    },
  })),
];

documents.forEach(({ id, data }) => {
  const documentBytes = Buffer.byteLength(JSON.stringify(data), "utf8");
  if (documentBytes > 900_000) {
    throw new Error(`Catalogue document ${id} exceeds the Firestore document limit.`);
  }
});

const encodeValue = (value, key = "") => {
  if (value === null) return { nullValue: null };
  if (key === "publishedAt") return { timestampValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeValue(item)) } };
  }
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
};

const encodeFields = (data) => Object.fromEntries(
  Object.entries(data).map(([key, value]) => [key, encodeValue(value, key)]),
);

const accessToken = await getFirebaseCliAccessToken();
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const response = await fetch(
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      writes: documents.map(({ id, data }) => ({
        update: {
          name: `${databaseRoot}/laundry_public_catalog/${id}`,
          fields: encodeFields(data),
        },
      })),
    }),
  },
);

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Firestore catalogue sync failed (${response.status}): ${body.slice(0, 500)}`);
}

console.log(
  `Laundry catalogue published to ${projectId}/laundry_public_catalog ` +
  `using the active Firebase CLI login.`,
);
