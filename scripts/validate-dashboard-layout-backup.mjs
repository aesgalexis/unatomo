import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeDashboardLayout
} from "../static/js/dashboard/layout/dashboardLayoutModel.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKUPS_DIR = path.join(ROOT, ".backups");

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : "";
};

const findLatestFirestoreBackup = () => {
  if (!existsSync(BACKUPS_DIR)) return "";
  return readdirSync(BACKUPS_DIR)
    .filter((name) => name.endsWith("-nfc-firestore.json"))
    .sort()
    .at(-1) || "";
};

const loadBackup = () => {
  const explicit = getArgValue("file");
  const filePath = explicit
    ? path.resolve(ROOT, explicit)
    : path.join(BACKUPS_DIR, findLatestFirestoreBackup());
  if (!filePath || !existsSync(filePath)) {
    throw new Error("No Firestore backup found. Run npm.cmd run backup:nfc:firestore first.");
  }
  return {
    filePath,
    data: JSON.parse(readFileSync(filePath, "utf8"))
  };
};

const getCollectionDocs = (backup, collectionName) =>
  backup?.collections?.[collectionName]?.docs || [];

const getFieldValue = (fields = {}, key) => {
  const value = fields[key];
  if (!value || typeof value !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  return undefined;
};

const firestoreValueToPlain = (value) => {
  if (!value || typeof value !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(firestoreValueToPlain);
  }
  if (value.mapValue) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [
        key,
        firestoreValueToPlain(item)
      ])
    );
  }
  return undefined;
};

const decodeLayoutDoc = (doc) => {
  const fields = doc.fields || {};
  return {
    groups: firestoreValueToPlain(fields.groups),
    placements: firestoreValueToPlain(fields.placements),
    tabOrder: firestoreValueToPlain(fields.tabOrder),
    dashboardTitle: getFieldValue(fields, "dashboardTitle") || "",
    registrySeenAt: getFieldValue(fields, "registrySeenAt") || "",
    suggestionsSeenAt: getFieldValue(fields, "suggestionsSeenAt") || ""
  };
};

const validateLayout = (doc, layout, machineIds) => {
  const issues = [];
  const normalized = normalizeDashboardLayout(layout);
  const rawGroups = Array.isArray(layout.groups) ? layout.groups : [];
  const rawGroupIds = rawGroups.map((group) => String(group?.id || "")).filter(Boolean);
  const uniqueGroupIds = new Set(rawGroupIds);
  if (uniqueGroupIds.size !== rawGroupIds.length) {
    issues.push("duplicate group ids");
  }

  const groupById = new Map(normalized.groups.map((group) => [group.id, group]));
  normalized.groups.forEach((group) => {
    const parent = groupById.get(group.parentGroupId);
    if (parent?.parentGroupId) {
      issues.push(`group ${group.id} has nesting deeper than one level`);
    }
  });

  Object.entries(normalized.placements || {}).forEach(([machineId, placement]) => {
    if (!machineIds.has(machineId)) {
      issues.push(`placement references missing machine ${machineId}`);
    }
    if (placement.groupId && !groupById.has(placement.groupId)) {
      issues.push(`placement ${machineId} references missing group ${placement.groupId}`);
    }
  });

  return {
    id: doc.id,
    groupCount: normalized.groups.length,
    placementCount: Object.keys(normalized.placements || {}).length,
    issues
  };
};

const main = () => {
  const { filePath, data } = loadBackup();
  const machineIds = new Set(getCollectionDocs(data, "machines").map((doc) => doc.id));
  const layoutDocs = getCollectionDocs(data, "dashboard_layout");
  const results = layoutDocs.map((doc) =>
    validateLayout(doc, decodeLayoutDoc(doc), machineIds)
  );
  const issueCount = results.reduce((total, result) => total + result.issues.length, 0);

  console.log(`Dashboard layout backup: ${path.relative(ROOT, filePath)}`);
  console.log(`Layouts checked: ${results.length}`);
  console.log(`Issues found: ${issueCount}`);
  results.forEach((result) => {
    const status = result.issues.length ? "ISSUES" : "OK";
    console.log(
      `- ${result.id}: ${status}, groups=${result.groupCount}, placements=${result.placementCount}`
    );
    result.issues.forEach((issue) => console.log(`  - ${issue}`));
  });

  if (issueCount > 0) process.exitCode = 1;
};

main();
