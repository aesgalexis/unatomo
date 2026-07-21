const STORAGE_KEY = "unatomo.dashboard.hiddenTreeGroups.v1";
const INCIDENT_COUNTS_STORAGE_KEY = "unatomo.dashboard.treeIncidentCounts.v1";
const TASK_COUNTS_STORAGE_KEY = "unatomo.dashboard.treeTaskCounts.v1";

const readStoredMap = (storageKey = STORAGE_KEY) => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export const loadShowTreeIncidentCounts = (uid = "") => {
  if (!uid) return true;
  return readStoredMap(INCIDENT_COUNTS_STORAGE_KEY)[uid] !== false;
};

export const saveShowTreeIncidentCounts = (uid = "", showCounts = true) => {
  if (!uid) return;
  try {
    const storedMap = readStoredMap(INCIDENT_COUNTS_STORAGE_KEY);
    if (showCounts === false) storedMap[uid] = false;
    else delete storedMap[uid];
    localStorage.setItem(INCIDENT_COUNTS_STORAGE_KEY, JSON.stringify(storedMap));
  } catch {}
};

export const loadShowTreeTaskCounts = (uid = "") => {
  if (!uid) return true;
  return readStoredMap(TASK_COUNTS_STORAGE_KEY)[uid] !== false;
};

export const saveShowTreeTaskCounts = (uid = "", showCounts = true) => {
  if (!uid) return;
  try {
    const storedMap = readStoredMap(TASK_COUNTS_STORAGE_KEY);
    if (showCounts === false) storedMap[uid] = false;
    else delete storedMap[uid];
    localStorage.setItem(TASK_COUNTS_STORAGE_KEY, JSON.stringify(storedMap));
  } catch {}
};

export const loadHiddenTreeGroupIds = (uid = "") => {
  if (!uid) return [];
  const storedIds = readStoredMap()[uid];
  if (!Array.isArray(storedIds)) return [];
  return Array.from(new Set(storedIds.filter((id) => typeof id === "string" && id)));
};

export const saveHiddenTreeGroupIds = (uid = "", groupIds = []) => {
  if (!uid) return;
  try {
    const storedMap = readStoredMap();
    const normalizedIds = Array.from(
      new Set(groupIds.filter((id) => typeof id === "string" && id))
    );
    if (normalizedIds.length) storedMap[uid] = normalizedIds;
    else delete storedMap[uid];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedMap));
  } catch {}
};
