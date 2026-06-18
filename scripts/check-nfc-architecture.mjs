import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const read = (relativePath) =>
  readFileSync(path.join(ROOT, relativePath), "utf8");

const requiredFiles = [
  "static/js/dashboard/data/dashboardSubscriptions.js",
  "static/js/dashboard/data/machineAccessSync.js",
  "static/js/dashboard/layout/dashboardLayoutActions.js",
  "static/js/dashboard/views/dashboardInternalViews.js",
  "static/js/dashboard/cardHooks/taskHooks.js",
  "static/js/dashboard/cardHooks/documentHooks.js",
  "static/js/dashboard/tabs/tasks/taskActions.js",
  "static/js/dashboard/components/loading/dashboardLoadState.js",
  "static/js/dashboard/components/loading/dashboardPlaceholders.js"
];

const checks = [];

const addCheck = (ok, message) => {
  checks.push({ ok, message });
};

requiredFiles.forEach((relativePath) => {
  addCheck(existsSync(path.join(ROOT, relativePath)), `required file exists: ${relativePath}`);
});

const indexJs = read("static/js/dashboard/index.js");
const taskHooks = read("static/js/dashboard/cardHooks/taskHooks.js");
const documentHooks = read("static/js/dashboard/cardHooks/documentHooks.js");
const dashboardSubscriptions = read("static/js/dashboard/data/dashboardSubscriptions.js");
const taskActions = read("static/js/dashboard/tabs/tasks/taskActions.js");

[
  "onSnapshot",
  "collection(",
  "where("
].forEach((needle) => {
  addCheck(
    !indexJs.includes(needle),
    `index.js does not own Firebase live query primitive: ${needle}`
  );
});

[
  "uploadPlateDocument",
  "uploadManualDocument",
  "uploadOtherDocument",
  "deleteMachineDocumentFile"
].forEach((needle) => {
  addCheck(
    !indexJs.includes(needle),
    `index.js does not own document storage primitive: ${needle}`
  );
  addCheck(
    documentHooks.includes(needle),
    `documentHooks.js owns document storage primitive: ${needle}`
  );
});

[
  "renderGlobalRegistryView",
  "renderSuggestionsView"
].forEach((needle) => {
  addCheck(
    !indexJs.includes(needle),
    `index.js does not render internal view directly: ${needle}`
  );
});

[
  "hooks.onAddTask",
  "hooks.onRemoveTask",
  "hooks.onAddTaskNote",
  "hooks.onEditTask",
  "hooks.onCompleteTask"
].forEach((needle) => {
  addCheck(!indexJs.includes(needle), `index.js does not define task hook: ${needle}`);
  addCheck(taskHooks.includes(needle), `taskHooks.js defines task hook: ${needle}`);
});

[
  "buildAddTaskUpdate",
  "buildRemoveTaskUpdate",
  "buildAddTaskNoteUpdate",
  "buildEditTaskUpdate",
  "buildCompleteTaskUpdate",
  "buildStatusToggleUpdate"
].forEach((needle) => {
  addCheck(taskActions.includes(`export const ${needle}`), `taskActions.js exports ${needle}`);
});

[
  "markOwnerLoadSuccess",
  "markOwnerLoadFailure",
  "markAdminLoadSuccess",
  "markAdminLoadFailure"
].forEach((needle) => {
  addCheck(
    dashboardSubscriptions.includes(needle),
    `dashboardSubscriptions.js uses load-state marker: ${needle}`
  );
});

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.log(`NFC architecture check failed: ${failed.length} issue(s)`);
  failed.forEach((check) => console.log(`- ${check.message}`));
  process.exit(1);
}

console.log(`OK: NFC architecture checks passed (${checks.length} checks).`);
