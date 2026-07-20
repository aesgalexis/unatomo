import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const autoSavePath = new URL(
  "../static/js/dashboard/autoSave.js",
  import.meta.url,
);
const autoSaveSource = readFileSync(autoSavePath, "utf8").replace(
  'import { t } from "./i18n.js";',
  "const t = (_key, fallback) => fallback;",
);
const {initAutoSave} = await import(
  `data:text/javascript;base64,${Buffer.from(autoSaveSource).toString("base64")}`
);

const waitFor = async (predicate) => {
  for (let tries = 0; tries < 50; tries += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition-timeout");
};

let draftVersion = 1;
let activeSaves = 0;
let maxActiveSaves = 0;
let idleCount = 0;
const savedVersions = [];
const releaseSave = [];
const autoSave = initAutoSave({
  saveFn: async () => {
    const version = draftVersion;
    activeSaves += 1;
    maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
    savedVersions.push(version);
    await new Promise((resolve) => releaseSave.push(resolve));
    activeSaves -= 1;
  },
  onSaveIdle: () => {
    idleCount += 1;
  },
});

autoSave.saveNow("machine-1", "first");
await waitFor(() => savedVersions.length === 1);
draftVersion = 2;
autoSave.saveNow("machine-1", "latest");

assert.deepEqual(savedVersions, [1]);
assert.equal(maxActiveSaves, 1);
releaseSave.shift()();
await waitFor(() => savedVersions.length === 2);
assert.deepEqual(savedVersions, [1, 2]);
assert.equal(maxActiveSaves, 1);
releaseSave.shift()();
await waitFor(() => idleCount === 1);

console.log("OK: dashboard autosave serializes writes and persists the latest draft.");
