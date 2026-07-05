import { existsSync, readFileSync } from "node:fs";
import { build } from "esbuild";
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
  "static/js/dashboard/components/loading/dashboardPlaceholders.js",
  "firebase/functions/src/core/firebase.ts",
  "firebase/functions/src/accounts/handles.ts",
  "firebase/functions/src/controlPanel/systemAndUsers.ts",
  "firebase/functions/src/dashboard/layout.ts",
  "firebase/functions/src/dashboard/suggestions.ts",
  "firebase/functions/src/dashboard/todos.ts",
  "firebase/functions/src/machines/adminInvites.ts",
  "firebase/functions/src/machines/deleteMachine.ts",
  "firebase/functions/src/machines/documents.ts",
  "firebase/functions/src/machines/tags.ts",
  "firebase/functions/src/machines/transfers.ts",
  "static/js/dashboard/controllers/dashboardInternalViewController.js",
  "static/js/dashboard/controllers/dashboardLoadController.js",
  "static/js/dashboard/controllers/dashboardNavigationController.js",
  "static/js/dashboard/controllers/dashboardOrderingController.js",
  "static/js/dashboard/controllers/dashboardTopbarController.js",
  "static/js/dashboard/controllers/machineAccessController.js",
  "static/js/dashboard/rendering/dashboardRenderer.js",
  "static/js/dashboard/rendering/groupSectionRenderer.js",
  "static/js/dashboard/rendering/machineCardRenderer.js",
  "static/js/dashboard/runtime/dashboardDataController.js",
  "static/js/dashboard/runtime/dashboardSession.js",
  "static/js/dashboard/runtime/dashboardState.js",
  "static/css/dashboard/shell.css",
  "static/css/dashboard/incident-modal.css",
  "static/css/dashboard/registry.css",
  "static/css/dashboard/gallery.css",
  "static/css/dashboard/suggestions.css",
  "static/css/dashboard/todo.css",
  "static/css/dashboard/loading.css",
  "static/css/dashboard/machine-base.css",
  "static/css/dashboard/machine-documents.css",
  "static/css/dashboard/machine-config.css",
  "static/css/dashboard/machine-tasks.css",
  "static/css/dashboard/machine-login.css",
  "static/css/dashboard/responsive.css"
];

const checks = [];

const addCheck = (ok, message) => {
  checks.push({ ok, message });
};

let dashboardModuleGraphOk = true;
try {
  await build({
    entryPoints: [path.join(ROOT, "static/js/dashboard/index.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
    plugins: [{
      name: "dashboard-root-imports",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^\// }, (args) => ({
          path: path.join(ROOT, args.path.slice(1))
        }));
        buildApi.onResolve({ filter: /^https:\/\// }, (args) => ({
          path: args.path,
          external: true
        }));
      }
    }]
  });
} catch {
  dashboardModuleGraphOk = false;
}
addCheck(
  dashboardModuleGraphOk,
  "dashboard ES module graph resolves with valid named exports"
);

let dashboardCssGraphOk = true;
try {
  await build({
    entryPoints: [path.join(ROOT, "static/css/dashboard.css")],
    bundle: true,
    minify: true,
    write: false,
    logLevel: "silent",
    plugins: [{
      name: "dashboard-css-root-imports",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^\// }, (args) => ({
          path: path.join(ROOT, args.path.slice(1))
        }));
      }
    }]
  });
} catch {
  dashboardCssGraphOk = false;
}
addCheck(dashboardCssGraphOk, "dashboard CSS import graph resolves");

requiredFiles.forEach((relativePath) => {
  addCheck(existsSync(path.join(ROOT, relativePath)), `required file exists: ${relativePath}`);
});

const indexJs = read("static/js/dashboard/index.js");
const taskHooks = read("static/js/dashboard/cardHooks/taskHooks.js");
const documentHooks = read("static/js/dashboard/cardHooks/documentHooks.js");
const machineCardController = read(
  "static/js/dashboard/components/machineCard/machineCardController.js"
);
const taggedMachinePage = read("static/js/machine/index.js");
const dashboardSubscriptions = read("static/js/dashboard/data/dashboardSubscriptions.js");
const taskActions = read("static/js/dashboard/tabs/tasks/taskActions.js");
const functionsIndex = read("firebase/functions/src/index.ts");
const dashboardCssManifest = read("static/css/dashboard.css");
const dashboardCssImports = [
  "/static/css/effects/inactive_sections/inactive.css",
  "/static/css/components/dashboard-section-nav.css",
  "/static/css/dashboard/shell.css",
  "/static/css/dashboard/incident-modal.css",
  "/static/css/dashboard/registry.css",
  "/static/css/dashboard/gallery.css",
  "/static/css/dashboard/suggestions.css",
  "/static/css/dashboard/todo.css",
  "/static/css/dashboard/loading.css",
  "/static/css/dashboard/machine-base.css",
  "/static/css/dashboard/machine-documents.css",
  "/static/css/dashboard/machine-config.css",
  "/static/css/dashboard/machine-tasks.css",
  "/static/css/dashboard/machine-login.css",
  "/static/css/dashboard/responsive.css"
];
const actualDashboardCssImports = Array.from(
  dashboardCssManifest.matchAll(/@import\s+["']([^"']+)["'];/g),
  (match) => match[1]
);
addCheck(
  JSON.stringify(actualDashboardCssImports) === JSON.stringify(dashboardCssImports),
  "dashboard CSS manifest preserves canonical import order"
);
addCheck(
  dashboardCssManifest.split(/\r?\n/).filter((line) => line.trim()).length ===
    dashboardCssImports.length,
  "dashboard.css remains an import-only manifest"
);

addCheck(
  machineCardController.includes("hooks.onContentResize()"),
  "location editor notifies machine-card height changes"
);
addCheck(
  taggedMachinePage.includes("hooks.onContentResize = () =>"),
  "tagged machine page handles dynamic card height changes"
);

addCheck(
  indexJs.split(/\r?\n/).length <= 900,
  "dashboard index.js remains below 900 lines"
);
[
  "createMachineCard(",
  "installDocumentHooks(",
  "installTaskHooks(",
  "renderRegistryDashboardView(",
  "renderSuggestionsDashboardView(",
  "renderTodoDashboardView("
].forEach((needle) => {
  addCheck(
    !indexJs.includes(needle),
    `dashboard index.js does not own extracted rendering primitive: ${needle}`
  );
});

addCheck(
  !functionsIndex.includes("onCall("),
  "Functions index.ts remains an export-only boundary"
);
addCheck(
  functionsIndex.split(/\r?\n/).length <= 150,
  "Functions index.ts remains below 150 lines"
);
const callableExports = Array.from(
  functionsIndex.matchAll(/export\s*\{([^}]+)\}\s*from/g),
  (match) => match[1]
)
  .flatMap((group) => group.split(","))
  .map((name) => name.trim())
  .filter(Boolean);
addCheck(
  callableExports.length === 37 && new Set(callableExports).size === 37,
  "Functions index.ts preserves 37 unique callable exports"
);

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
