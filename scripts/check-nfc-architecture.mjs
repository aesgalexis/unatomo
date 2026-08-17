import { existsSync, readFileSync } from "node:fs";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const resolveRootImport = (request) => {
  const normalizedRequest = path.normalize(request);
  const rootPrefix = `${ROOT}${path.sep}`;
  if (
    path.isAbsolute(normalizedRequest) &&
    (normalizedRequest === ROOT || normalizedRequest.startsWith(rootPrefix))
  ) {
    return normalizedRequest;
  }
  const normalized = request.replace(/^[/\\]+/, "");
  if (/^[A-Za-z]:[\\/]/.test(normalized)) return path.normalize(normalized);
  return path.resolve(ROOT, normalized);
};

const read = (relativePath) =>
  readFileSync(path.join(ROOT, relativePath), "utf8");

const requiredFiles = [
  "static/js/dashboard/data/dashboardSubscriptions.js",
  "static/js/dashboard/data/machineAccessSync.js",
  "static/js/dashboard/layout/dashboardLayoutActions.js",
  "static/js/dashboard/views/dashboardInternalViews.js",
  "static/js/dashboard/views/machineTasks/machineTasksView.js",
  "static/js/dashboard/views/machineTasks/machineTasksData.js",
  "static/js/dashboard/views/machineTasks/machineTasksComposer.js",
  "static/js/dashboard/views/machineTasks/machineTasksRows.js",
  "static/js/dashboard/cardHooks/taskHooks.js",
  "static/js/dashboard/cardHooks/documentHooks.js",
  "static/js/dashboard/tabs/tasks/taskActions.js",
  "static/js/dashboard/components/loading/dashboardLoadState.js",
  "static/js/dashboard/components/loading/dashboardPlaceholders.js",
  "firebase/functions/src/core/firebase.ts",
  "firebase/functions/src/accounts/handles.ts",
  "firebase/functions/src/accounts/registration.ts",
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
  "static/js/dashboard/controllers/dashboardViewModeController.js",
  "static/js/dashboard/controllers/machineAccessController.js",
  "static/js/dashboard/components/viewMenu/viewMenu.js",
  "static/js/dashboard/rendering/dashboardRenderer.js",
  "static/js/dashboard/rendering/groupSectionRenderer.js",
  "static/js/dashboard/rendering/machineCardRenderer.js",
  "static/js/dashboard/runtime/dashboardDataController.js",
  "static/js/dashboard/runtime/dashboardSession.js",
  "static/js/dashboard/runtime/dashboardState.js",
  "static/js/qr-print/qrPrintData.js",
  "static/js/qr-print/qrPrintNavigation.js",
  "static/js/qr-print/qrPrintService.js",
  "static/js/qr-print/qrPrintShell.js",
  "static/js/qr-print/qrPrintUi.js",
  "nfc/controlpanel/panel.js",
  "nfc/controlpanel/panelCallables.js",
  "nfc/controlpanel/panelCodes.js",
  "nfc/controlpanel/panelLocalCards.js",
  "nfc/controlpanel/panelShared.js",
  "nfc/controlpanel/panelStatsBackup.js",
  "nfc/controlpanel/panelSystemIntegrity.js",
  "nfc/controlpanel/panelTags.js",
  "nfc/controlpanel/panelText.js",
  "nfc/controlpanel/panelUsers.js",
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
  "static/css/dashboard/machine-stats.css",
  "static/css/dashboard/global-statistics.css",
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
          path: resolveRootImport(args.path)
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

let controlPanelModuleGraphOk = true;
try {
  await build({
    entryPoints: [path.join(ROOT, "nfc/controlpanel/panel.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
    plugins: [{
      name: "control-panel-root-imports",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^\// }, (args) => ({
          path: resolveRootImport(args.path)
        }));
        buildApi.onResolve({ filter: /^https:\/\// }, (args) => ({
          path: args.path,
          external: true
        }));
      }
    }]
  });
} catch {
  controlPanelModuleGraphOk = false;
}
addCheck(
  controlPanelModuleGraphOk,
  "control panel ES module graph resolves with valid imports"
);

let qrPrintModuleGraphOk = true;
try {
  await build({
    entryPoints: [path.join(ROOT, "static/js/qr-print/index.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
    plugins: [{
      name: "qr-print-root-imports",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^\// }, (args) => ({
          path: resolveRootImport(args.path)
        }));
        buildApi.onResolve({ filter: /^https:\/\// }, (args) => ({
          path: args.path,
          external: true
        }));
      }
    }]
  });
} catch {
  qrPrintModuleGraphOk = false;
}
addCheck(qrPrintModuleGraphOk, "QR print ES module graph resolves with valid imports");

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
          path: resolveRootImport(args.path)
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
const qrPrintIndex = read("static/js/qr-print/index.js");
const nfcLanding = read("static/js/nfc-landing.js");
const registrationClient = read("static/js/registro/firebase-init.js");
const registrationBackend = read(
  "firebase/functions/src/accounts/registration.ts"
);
const firestoreRules = read("firebase/firestore.rules");
const dashboardRenderer = read("static/js/dashboard/rendering/dashboardRenderer.js");
const dashboardViewMenu = read("static/js/dashboard/components/viewMenu/viewMenu.js");
const dashboardDragAndDrop = read("static/js/dashboard/dragAndDrop.js");
const dashboardViewModeController = read(
  "static/js/dashboard/controllers/dashboardViewModeController.js"
);
const taskHooks = read("static/js/dashboard/cardHooks/taskHooks.js");
const documentHooks = read("static/js/dashboard/cardHooks/documentHooks.js");
const machineCardController = read(
  "static/js/dashboard/components/machineCard/machineCardController.js"
);
const taggedMachinePage = read("static/js/machine/index.js");
const dashboardSubscriptions = read("static/js/dashboard/data/dashboardSubscriptions.js");
const taskActions = read("static/js/dashboard/tabs/tasks/taskActions.js");
const machineTasksView = read("static/js/dashboard/views/machineTasks/machineTasksView.js");
const machineTasksData = read("static/js/dashboard/views/machineTasks/machineTasksData.js");
const machineTasksComposer = read(
  "static/js/dashboard/views/machineTasks/machineTasksComposer.js"
);
const machineTasksRows = read("static/js/dashboard/views/machineTasks/machineTasksRows.js");
const functionsIndex = read("firebase/functions/src/index.ts");
const dashboardCssManifest = read("static/css/dashboard.css");
const dashboardCssImports = [
  "/static/css/effects/inactive_sections/inactive.css",
  "/static/css/components/dashboard-section-nav.css",
  "/static/css/dashboard/shell.css",
  "/static/css/dashboard/group-tree.css",
  "/static/css/dashboard/incident-modal.css",
  "/static/css/dashboard/registry.css",
  "/static/css/dashboard/gallery.css",
  "/static/css/dashboard/suggestions.css",
  "/static/css/dashboard/todo.css",
  "/static/css/dashboard/users.css",
  "/static/css/dashboard/loading.css",
  "/static/css/dashboard/machine-base.css",
  "/static/css/dashboard/machine-documents.css",
  "/static/css/dashboard/machine-config.css",
  "/static/css/dashboard/machine-tasks.css",
  "/static/css/dashboard/machine-stats.css",
  "/static/css/dashboard/global-statistics.css",
  "/static/css/dashboard/machine-login.css",
  "/static/css/dashboard/responsive.css",
  "/static/css/components/mobile-primary-navigation.css"
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
  machineTasksView.includes('from "./machineTasksData.js"') &&
    machineTasksView.includes('from "./machineTasksComposer.js"') &&
    machineTasksView.includes('from "./machineTasksRows.js"'),
  "machineTasksView composes the data, composer, and row modules"
);
addCheck(
  machineTasksData.includes("prepareMachineTaskEntries") &&
    !machineTasksData.includes("document.createElement"),
  "machineTasksData owns task preparation without rendering DOM"
);
addCheck(
  machineTasksComposer.includes("renderMachineTaskComposer") &&
    machineTasksComposer.includes("contentEditable"),
  "machineTasksComposer owns command creation and editing"
);
addCheck(
  machineTasksRows.includes("createTaskActionsMenu") &&
    machineTasksRows.includes("renderMachineTaskRows"),
  "machineTasksRows owns task rows and actions"
);
[
  "chooseMachine",
  "renderCreateForm",
  "renderExpandedCreateForm",
  "createTaskFilterMenu"
].forEach((needle) => {
  addCheck(!machineTasksView.includes(needle), `machineTasksView has no legacy implementation: ${needle}`);
});

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
addCheck(
  qrPrintIndex.split(/\r?\n/).length <= 800,
  "QR print index.js remains below 800 lines"
);
addCheck(
  qrPrintIndex.includes("machines = getVisibleMachines();"),
  "QR print initial render applies the shared tree visibility selector"
);
[
  "collection(",
  "getDoc(",
  "getDocs(",
  "query(",
  "where(",
  "window.print("
].forEach((needle) => {
  addCheck(
    !qrPrintIndex.includes(needle),
    `QR print index.js does not own extracted primitive: ${needle}`
  );
});
addCheck(
  indexJs.includes(
    "renderCards({ preserveScroll: true, preserveAnchor: false })"
  ),
  "machine search preserves absolute scroll instead of a filtered machine anchor"
);
addCheck(
  nfcLanding.includes("window.location.assign(localized.dashboard)"),
  "authenticated NFC landing routes directly to the localized dashboard"
);
addCheck(
  nfcLanding.includes("window.history.replaceState") &&
    nfcLanding.includes("LANDING_RETURN_STATE_KEY"),
  "NFC landing stores a history-entry return exception before dashboard navigation"
);
addCheck(
  nfcLanding.includes('window.addEventListener("pageshow"') &&
    nfcLanding.includes("suppressDashboardRedirect"),
  "NFC landing consumes the return exception across browser back-forward cache restores"
);
addCheck(
  registrationBackend.includes("db.runTransaction") &&
    registrationBackend.includes("transaction.create(userRef") &&
    registrationBackend.includes("transaction.delete(codeRef)"),
  "registration code redemption creates the profile and deletes the code transactionally"
);
addCheck(
  !registrationClient.includes('doc(db, "registration_codes"') &&
    registrationClient.includes('httpsCallable(functions, "validateRegistrationCode")') &&
    registrationClient.includes('httpsCallable(functions, "redeemRegistrationCode")'),
  "registration client validates and redeems codes only through backend callables"
);
addCheck(
  !registrationClient.includes("regCode:") &&
    !registrationClient.includes("profile.regCode"),
  "registration client does not persist or expose a code link on user profiles"
);
addCheck(
  /match \/registration_codes\/\{code\}\s*\{\s*allow read, write: if false;\s*\}/s.test(
    firestoreRules
  ),
  "Firestore rules keep registration codes backend-only"
);
addCheck(
  !dashboardViewMenu.includes("sortDisabled") &&
    !dashboardViewMenu.includes("sortAvailable"),
  "dashboard sort menu enables automatic sorting in every machine presentation"
);
addCheck(
  dashboardViewModeController.includes(
    "machineSortMode: state.dashboardLayout.machineSortMode"
  ),
  "changing machine presentation preserves the selected card sort"
);
addCheck(
  dashboardRenderer.includes(
    'const useTreeMachineSort = useTreeLayout && machineSortMode !== "manual"'
  ) && dashboardRenderer.includes(
    'state.dashboardLayout.machineViewMode === "flat" ||'
  ) && dashboardRenderer.includes(
    "useTreeMachineSort ||"
  ),
  "dashboard renderer applies the shared card sorter to flat and side-tree views"
);
addCheck(
  dashboardRenderer.includes(
    "!useTreeMachineSort && (useGroupedLayout || useTreeLayout)"
  ),
  "manual side-tree rendering preserves hierarchical placement order"
);
addCheck(
  dashboardRenderer.includes(
    'state.dashboardLayout.machineViewMode !== "flat" &&'
  ) && dashboardRenderer.includes(
    "compareMachinesBySortMode(a, b, machineSortMode)"
  ),
  "inline groups sort cards within each placement without reordering groups"
);
addCheck(
  dashboardDragAndDrop.includes("callbacks.allowMachineReorder") &&
    dashboardDragAndDrop.includes("if (!allowReorder && !allowGrouping) return"),
  "automatic card sorting blocks manual placement reorder but preserves grouping drops"
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
  callableExports.length === 68 && new Set(callableExports).size === 68,
  "Functions index.ts preserves 68 unique function exports"
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
  "buildCompleteTaskUpdate"
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

const emailDeliveryBackend = read("firebase/functions/src/controlPanel/emailDelivery.ts");
const emailDeliveryUi = read("nfc/controlpanel/panelEmailTemplates.js");
const emailDeliveryController = read("nfc/controlpanel/panel.js");
const controlPanelHtml = read("nfc/controlpanel/index.html");
const controlPanelCss = read("nfc/controlpanel/panel.css");
const accountSecurity = read("firebase/functions/src/accounts/security.ts");
const accountSettings = read("static/js/configuracion/index.js");
const accessRequests = read("firebase/functions/src/accounts/accessRequests.ts");
const registration = read("firebase/functions/src/accounts/registration.ts");
const onboarding = read("firebase/functions/src/accounts/onboarding.ts");
const onboardingCss = read("static/css/onboarding.css");
const machineTransfers = read("firebase/functions/src/machines/transfers.ts");
const machineInvites = read("firebase/functions/src/machines/adminInvites.ts");
const dashboardAccess = read("static/js/dashboard/controllers/machineAccessController.js");
const controlPanelUsers = read("nfc/controlpanel/panelUsers.js");
const deleteUser = read("firebase/functions/src/controlPanel/deleteUser.ts");
const coreStorage = read("firebase/functions/src/core/storage.ts");
const registrationUi = read("static/js/registro/app.js");
const nfcLandingHtml = read("nfc/index.html");
const nfcLandingCss = read("static/css/nfc-landing.css");
const emailDeliveryCallables = read("nfc/controlpanel/panelCallables.js");
addCheck(
  emailDeliveryBackend.includes("assertControlPanelAccess") &&
    emailDeliveryBackend.includes("maskEmail") &&
    !emailDeliveryBackend.includes("data: item.data"),
  "email delivery operations remain superadmin-only and sanitize browser output"
);
addCheck(
  emailDeliveryBackend.includes("idempotencyKey: message.idempotencyKey") &&
    emailDeliveryBackend.includes("message.retryMessageId"),
  "email retry preserves idempotency and prevents duplicate manual retries"
);
addCheck(
  emailDeliveryController.includes("emailDeliveryRetryConfirm") &&
    emailDeliveryUi.includes("handlers.onRetry") &&
    emailDeliveryCallables.includes("retryControlPanelEmailDelivery"),
  "control panel confirms and routes failed email retries through the callable"
);
addCheck(
  emailDeliveryController.includes(".catch(() => null)") &&
    emailDeliveryUi.includes("deliveries.unavailable"),
  "email templates remain visible when delivery operations are unavailable"
);
addCheck(
  controlPanelHtml.includes("/static/css/dashboard/group-tree.css") &&
    emailDeliveryController.includes("controlpanel-section-tree") &&
    emailDeliveryController.includes('role", "treeitem"'),
  "control panel reuses the accessible settings tree pattern"
);
addCheck(
  controlPanelCss.includes("@media (min-width: 1280px)") &&
    controlPanelCss.includes(".controlpanel-section-tree {\n  display: none;") &&
    controlPanelCss.includes(".controlpanel-card.is-active"),
  "control panel keeps collapsible cards below the desktop tree breakpoint"
);
addCheck(
  accountSecurity.includes("RECENT_AUTH_SECONDS") &&
    accountSecurity.includes("generateVerifyAndChangeEmailLink") &&
    accountSecurity.includes('status: "completed"'),
  "account password and email changes require recent auth and verified finalization"
);
addCheck(
  accountSettings.includes("reauthenticateWithCredential") &&
    accountSettings.includes("reauthenticateWithPopup") &&
    accountSettings.includes("finalizeAccountEmailChange"),
  "settings reauthenticates provider accounts and finalizes verified email changes"
);
addCheck(
  accessRequests.includes("alreadyRegistered: true") &&
    accessRequests.includes('alreadyPending: outcome === "already-pending"') &&
    registrationUi.includes("requestAccessPending") &&
    accessRequests.includes("emailLower: requestedEmail") &&
    registration.includes("registration-email-mismatch"),
  "access requests report repeats, reject accounts, and bind approved email"
);
addCheck(
  controlPanelUsers.includes("usersSearch") &&
    controlPanelUsers.includes("item.inAuthentication") &&
    controlPanelUsers.includes("item.creationTime"),
  "control panel makes Authentication-only accounts searchable and identifiable"
);
addCheck(
  accessRequests.includes("`access_approved_${requestId}_${code}`") &&
    accessRequests.includes("`access-approved/${requestId}/${code}`"),
  "repeat access-request approvals create a distinct idempotent email delivery"
);
addCheck(
  registration.includes('reason: "existing_account"') &&
    registrationUi.includes("codeApplied") &&
    registrationUi.includes("approvedEmail.readOnly = true"),
  "registration links explain automatic code validation and route existing accounts"
);
addCheck(
  registration.includes("registration-profile-already-exists") &&
    !registration.includes("return {alreadyRegistered: true}") &&
    deleteUser.includes('db.collection("dashboard_layout").doc(uid)') &&
    coreStorage.includes("await Promise.all(\n    Array.from(refs.values())"),
  "account deletion fails closed and fresh registration cannot reuse stale profile data"
);
addCheck(
  onboarding.includes("verificationUrl") &&
    onboardingCss.includes("width: min(100%, 420px)") &&
    onboardingCss.includes("padding: 1rem 1.25rem"),
  "onboarding loading state stays narrow on mobile and welcome includes verification"
);
addCheck(
  accountSecurity.includes("resendAccountEmailVerification") &&
    accountSecurity.includes("assertVerifiedEmail(auth)") &&
    machineTransfers.includes("assertVerifiedEmail(auth)") &&
    machineInvites.includes("assertVerifiedEmail(auth)") &&
    dashboardAccess.includes("resendAccountEmailVerification") &&
    controlPanelUsers.includes("emailVerificationPending"),
  "unverified accounts get a resend notice and sensitive actions remain protected"
);
addCheck(
  nfcLandingHtml.includes('id="registration-choice"') &&
    registrationUi.includes("registrationChoice.hidden = true") &&
    registrationUi.includes('requestForm.classList.add("is-submitted")') &&
    nfcLandingCss.includes("#access-request-form.is-submitted"),
  "landing registration progressively reveals one path and collapses submitted requests"
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.log(`NFC architecture check failed: ${failed.length} issue(s)`);
  failed.forEach((check) => console.log(`- ${check.message}`));
  process.exit(1);
}

console.log(`OK: NFC architecture checks passed (${checks.length} checks).`);
