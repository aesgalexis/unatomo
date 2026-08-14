import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { observeDashboardLoading } from "/static/js/topbar/loading-logo.js";
import {
  auth,
  getUserRegistrationState,
  isAccountOnboardingRequired
} from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang } from "/static/js/site/locale.js";
import {
  canDashboardGroupHaveChildren,
  MAX_DASHBOARD_GROUP_DEPTH,
  normalizeDashboardLayout
} from "/static/js/dashboard/layout/dashboardLayoutModel.mjs";
import {
  canMoveGroupIntoGroup,
  canWrapGroupWithParent,
  createChildGroup,
  createDashboardGroupId,
  createParentGroup,
  createRootGroup,
  deleteGroup,
  getNextDashboardGroupTitle,
  moveGroupToGroup,
  moveGroupToRoot,
  renameGroup
} from "/static/js/dashboard/layout/dashboardLayoutActions.js";
import { upsertDashboardLayout } from "/static/js/dashboard/firestoreRepo.js";
import { t as dashboardT } from "/static/js/dashboard/i18n.js";
import {
  createDashboardGroupTreeRenderer,
  getDashboardGroupBranchIds,
  getDashboardScopedMachines
} from "/static/js/dashboard/rendering/groupTreeRenderer.js";
import { createDashboardTooltips } from "/static/js/dashboard/runtime/dashboardTooltips.js";
import { initMobilePrimaryNavigation } from "/static/js/dashboard/runtime/mobilePrimaryNavigation.js";
import {
  loadHiddenTreeGroupIds,
  saveHiddenTreeGroupIds
} from "/static/js/dashboard/runtime/dashboardGroupVisibilityStorage.js";
import {
  applyQrDashboardTopbarTitle,
  buildQrMachineState,
  fetchQrAccessibleMachines
} from "./qrPrintData.js";
import {
  createMobileHeadingGroup,
  createQrIconButton,
  createQrPrintText,
  GRID_GAP_BY_STEP,
  PRINT_COLUMNS_BY_STEP,
  PRINT_ICON,
  PRINT_ROWS_BY_STEP,
  QR_SIZE_STEPS,
  RELOAD_ICON,
  ZOOM_ICON
} from "./qrPrintUi.js";
import { getFocusedQrMachineId, requestQrPrint } from "./qrPrintService.js";
import { createQrSectionNav, loadQrSectionNavigation } from "./qrPrintNavigation.js";
import { installQrPrintShell } from "./qrPrintShell.js";

const mount = document.getElementById("qr-print-mount");
const lang = getCurrentLang();
const isEn = lang === "en";
const { sync: syncQrMenuState } = installQrPrintShell();

const text = createQrPrintText(lang);
let currentMachines = [];
let allMachines = [];
let totalMachinesCount = 0;
let accessibleMachinesCount = 0;
let currentSizeIndex = 1;
let useFrame = true;
let printBackNames = false;
let loadingProgressTimer = null;
let sectionNavigation = {
  registry: 0,
  showSuggestions: false,
  suggestions: 0,
  todo: 0
};
let searchQuery = "";
let hiddenMachineIds = new Set();
let dashboardLayout = normalizeDashboardLayout();
let selectedTreeGroupId = "";
let selectedTreeMachineId = "";
let expandedTreeGroupIds = [];
let hiddenTreeGroupIds = [];
let qrDataReady = false;
let activeUid = "";
let cleanupMobilePrimaryNavigation = () => {};
const qrTreeMedia = window.matchMedia("(min-width: 1280px)");
const qrGroupTree = document.createElement("aside");
qrGroupTree.className = "dashboard-group-tree";
qrGroupTree.hidden = true;
const qrTooltips = createDashboardTooltips();
qrTooltips.installGlobalCleanup();



const clearLoadingProgress = () => {
  if (!loadingProgressTimer) return;
  window.clearInterval(loadingProgressTimer);
  loadingProgressTimer = null;
};

const createSectionNav = () => {
  return createQrSectionNav({ isEn, navigation: sectionNavigation, text });
};

const resetMobilePrimaryNavigation = () => {
  cleanupMobilePrimaryNavigation();
  cleanupMobilePrimaryNavigation = () => {};
};

const mountMobilePrimaryNavigation = (sectionNav) => {
  cleanupMobilePrimaryNavigation = initMobilePrimaryNavigation({ sectionNav });
};

const normalizeSearch = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLocaleLowerCase(isEn ? "en" : "es");

const getVisibleMachines = () => {
  const queryText = normalizeSearch(searchQuery);
  const scopedMachines = getDashboardScopedMachines({
    machines: allMachines,
    groups: dashboardLayout.groups,
    placements: dashboardLayout.placements,
    selectedGroupId: selectedTreeGroupId,
    selectedMachineId: selectedTreeMachineId
  });
  return scopedMachines.filter((machine) => {
    const groupId = dashboardLayout.placements[machine.id]?.groupId || "";
    if (hiddenTreeGroupIds.includes(groupId)) return false;
    if (!machine.tagQrUrl) return false;
    if (hiddenMachineIds.has(machine.id)) return false;
    if (!queryText) return true;
    return normalizeSearch(machine.title || machine.id).includes(queryText);
  });
};

const renderVisibleMachines = (options = {}) => {
  renderQrGrid(getVisibleMachines(), { preserveList: true, ...options });
};

const saveQrDashboardLayout = async () => {
  if (!activeUid) return;
  try {
    await upsertDashboardLayout(activeUid, {
      groups: dashboardLayout.groups || [],
      placements: dashboardLayout.placements || {}
    });
  } catch {
    window.alert(isEn ? "Unable to save the group layout." : "No se ha podido guardar la organizaci\u00f3n de grupos.");
  }
};

const mutateQrDashboardLayout = (mutation) => {
  dashboardLayout = normalizeDashboardLayout(mutation(dashboardLayout).layout, {
    groupUntitled: dashboardT("dashboard.groupUntitled", "Grupo"),
    validMachineIds: new Set(allMachines.map((machine) => machine.id))
  });
  renderVisibleMachines();
  saveQrDashboardLayout();
};

const promptQrGroupTitle = () => {
  const suggested = getNextDashboardGroupTitle(
    dashboardLayout,
    dashboardT("dashboard.groupUntitled", "Grupo")
  );
  const value = window.prompt(dashboardT("dashboard.addGroupPrompt", "Nombre del grupo"), suggested);
  if (value === null) return null;
  return value.trim() || suggested;
};

const addQrRootGroup = () => {
  const title = promptQrGroupTitle();
  if (!title) return;
  mutateQrDashboardLayout((layout) => createRootGroup(layout, {
    id: createDashboardGroupId(),
    title
  }));
};

const getQrGroupMenuActions = (group, depth = 0) => {
  const actions = [];
  if (canWrapGroupWithParent(dashboardLayout, group.id)) {
    actions.push({
      label: dashboardT("dashboard.groupAddParent", "A\u00f1adir grupo superior"),
      onClick: () => {
        const title = promptQrGroupTitle();
        if (!title) return;
        mutateQrDashboardLayout((layout) => createParentGroup(layout, group.id, {
          id: createDashboardGroupId(),
          title
        }));
      }
    });
  }
  if (depth < MAX_DASHBOARD_GROUP_DEPTH && canDashboardGroupHaveChildren(dashboardLayout.groups, group.id)) {
    actions.push({
      label: dashboardT("dashboard.groupAddChild", "A\u00f1adir grupo"),
      onClick: () => {
        const title = promptQrGroupTitle();
        if (!title) return;
        mutateQrDashboardLayout((layout) => createChildGroup(layout, group.id, {
          id: createDashboardGroupId(),
          title
        }));
      }
    });
  }
  actions.push({
    label: dashboardT("dashboard.groupRename", "Renombrar"),
    onClick: () => {
      const currentTitle = group.title || dashboardT("dashboard.groupUntitled", "Grupo");
      const title = window.prompt(dashboardT("dashboard.groupRenamePrompt", "Nombre del grupo"), currentTitle);
      if (title === null || !title.trim() || title.trim() === currentTitle) return;
      mutateQrDashboardLayout((layout) => renameGroup(layout, group.id, title));
    }
  }, {
    label: dashboardT("dashboard.groupDelete", "Eliminar"),
    onClick: () => {
      const title = group.title || dashboardT("dashboard.groupUntitled", "Grupo");
      if (!window.confirm(dashboardT("dashboard.groupDeleteConfirm", (value) => `\u00bfEliminar el grupo "${value}"? Las m\u00e1quinas no se eliminar\u00e1n.`)(title))) return;
      mutateQrDashboardLayout((layout) => deleteGroup(layout, group.id));
    }
  });
  return actions;
};

const qrTreeRenderer = createDashboardGroupTreeRenderer({
  attachTooltip: qrTooltips.attach,
  container: qrGroupTree,
  getGroupMenuActions: getQrGroupMenuActions,
  getMachineIndicator: (machine) => machine.tagQrUrl ? ({
    state: machine.qrAccessEnabled === false ? "qr-disabled" : "has-qr",
    label: machine.qrAccessEnabled === false
      ? (lang === "en" ? "QR access disabled" : "Acceso QR deshabilitado")
      : (lang === "en" ? "QR access enabled" : "Acceso QR habilitado"),
    text: "QR"
  }) : null,
  getPendingTaskCount: () => 0,
  normalizeStatus: () => "",
  onCreateGroup: addQrRootGroup,
  onSelect: (groupId) => {
    selectedTreeGroupId = groupId;
    selectedTreeMachineId = "";
    renderVisibleMachines();
  },
  onSelectMachine: (machineId, groupId) => {
    selectedTreeGroupId = groupId === "__ungrouped__" ? groupId : groupId || "";
    selectedTreeMachineId = machineId;
    renderVisibleMachines();
  },
  onToggle: (groupId) => {
    const expanded = new Set(expandedTreeGroupIds);
    const isCollapsing = expanded.has(groupId);
    if (isCollapsing) expanded.delete(groupId);
    else expanded.add(groupId);
    if (
      isCollapsing &&
      getDashboardGroupBranchIds(dashboardLayout.groups, groupId).has(selectedTreeGroupId)
    ) {
      selectedTreeGroupId = groupId;
      selectedTreeMachineId = "";
    }
    expandedTreeGroupIds = Array.from(expanded);
    renderVisibleMachines();
  },
  onToggleVisibility: (groupId) => {
    const branchIds = getDashboardGroupBranchIds(dashboardLayout.groups, groupId);
    const hiddenIds = new Set(hiddenTreeGroupIds);
    const hideBranch = !Array.from(branchIds).every((id) => hiddenIds.has(id));
    branchIds.forEach((id) => hideBranch ? hiddenIds.add(id) : hiddenIds.delete(id));
    if (hideBranch && branchIds.has(selectedTreeGroupId)) {
      selectedTreeGroupId = "";
      selectedTreeMachineId = "";
    }
    hiddenTreeGroupIds = Array.from(hiddenIds);
    if (activeUid) saveHiddenTreeGroupIds(activeUid, hiddenTreeGroupIds);
    renderVisibleMachines();
  },
  onShowAllGroups: () => {
    hiddenTreeGroupIds = [];
    if (activeUid) saveHiddenTreeGroupIds(activeUid, []);
    renderVisibleMachines();
  },
  t: dashboardT
});

let draggedQrGroupId = "";
qrGroupTree.addEventListener("dragstart", (event) => {
  const row = event.target.closest?.(".dashboard-group-tree-row[data-group-id]");
  if (!row || !qrGroupTree.contains(row)) return;
  if (event.target.closest(
    ".dashboard-group-tree-toggle, .dashboard-group-tree-visibility-toggle, .dashboard-group-tree-menu-toggle"
  )) {
    event.preventDefault();
    return;
  }
  draggedQrGroupId = row.dataset.groupId || "";
  if (!draggedQrGroupId) return;
  event.dataTransfer?.setData("application/x-unatomo-dashboard-group", draggedQrGroupId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
});
qrGroupTree.addEventListener("dragover", (event) => {
  if (!draggedQrGroupId) return;
  const row = event.target.closest?.(".dashboard-group-tree-row[data-tree-drop-type]");
  const type = row?.dataset.treeDropType || "";
  const targetId = row?.dataset.groupId || "";
  const allowed = type === "all" || (
    type === "group" && canMoveGroupIntoGroup(dashboardLayout, draggedQrGroupId, targetId)
  );
  if (!allowed) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
});
qrGroupTree.addEventListener("drop", (event) => {
  if (!draggedQrGroupId) return;
  const row = event.target.closest?.(".dashboard-group-tree-row[data-tree-drop-type]");
  const type = row?.dataset.treeDropType || "";
  const targetId = row?.dataset.groupId || "";
  if (type === "group" && canMoveGroupIntoGroup(dashboardLayout, draggedQrGroupId, targetId)) {
    event.preventDefault();
    expandedTreeGroupIds = Array.from(new Set([...expandedTreeGroupIds, targetId]));
    const sourceId = draggedQrGroupId;
    draggedQrGroupId = "";
    mutateQrDashboardLayout((layout) => moveGroupToGroup(layout, sourceId, targetId));
  } else if (type === "all") {
    event.preventDefault();
    const sourceId = draggedQrGroupId;
    draggedQrGroupId = "";
    mutateQrDashboardLayout((layout) => moveGroupToRoot(layout, sourceId));
  }
});
qrGroupTree.addEventListener("dragend", () => {
  draggedQrGroupId = "";
});

const mountQrGroupTree = (wrap) => {
  const visible = qrTreeMedia.matches;
  mount.classList.toggle("has-group-tree", visible);
  qrGroupTree.hidden = !visible;
  if (!visible) return;
  qrTreeRenderer.renderTree({
    groups: dashboardLayout.groups,
    placements: dashboardLayout.placements,
    machines: allMachines,
    selectedGroupId: selectedTreeGroupId,
    selectedMachineId: selectedTreeMachineId,
    expandedGroupIds: expandedTreeGroupIds,
    hiddenGroupIds: hiddenTreeGroupIds,
    showIncidentCounts: false,
    showTaskCounts: false,
    showPreferences: false,
    filterOnly: false
  });
  wrap.appendChild(qrGroupTree);
};

qrTreeMedia.addEventListener("change", () => {
  if (qrDataReady) renderVisibleMachines();
});

const setState = (message, state = "") => {
  if (!mount) return;
  clearLoadingProgress();
  resetMobilePrimaryNavigation();
  mount.innerHTML = "";
  mount.classList.remove("has-group-tree");
  qrGroupTree.hidden = true;
  qrDataReady = false;
  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  const status = document.createElement("p");
  status.className = "qr-print-state";
  if (state) status.dataset.state = state;
  status.textContent = message;
  wrap.appendChild(status);
  mount.appendChild(wrap);
};


const setQrSize = (wrap, sizeIndex) => {
  const safeIndex = Math.max(0, Math.min(QR_SIZE_STEPS.length - 1, Number(sizeIndex) || 0));
  currentSizeIndex = safeIndex;
  wrap.style.setProperty("--qr-size", `${QR_SIZE_STEPS[safeIndex]}px`);
  wrap.style.setProperty("--qr-print-columns", PRINT_COLUMNS_BY_STEP[safeIndex]);
  wrap.style.setProperty("--qr-grid-gap", GRID_GAP_BY_STEP[safeIndex]);
};

const getPrintSheetCapacity = () => {
  const columns = PRINT_COLUMNS_BY_STEP[currentSizeIndex] || PRINT_COLUMNS_BY_STEP[0];
  const rows = PRINT_ROWS_BY_STEP[currentSizeIndex] || PRINT_ROWS_BY_STEP[0];
  return Math.max(1, columns * rows);
};

const renderQrGrid = (machines, options = {}) => {
  if (!mount) return;
  clearLoadingProgress();
  resetMobilePrimaryNavigation();
  if (!options.preserveList) {
    qrDataReady = true;
    allMachines = Array.isArray(options.sourceMachines) ? options.sourceMachines : machines;
    hiddenMachineIds = new Set();
    totalMachinesCount = Number.isFinite(options.totalCount)
      ? options.totalCount
      : machines.length;
    accessibleMachinesCount = Number.isFinite(options.accessibleMachineCount)
      ? options.accessibleMachineCount
      : machines.length;
    machines = getVisibleMachines();
  }
  currentMachines = machines;
  mount.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  wrap.classList.toggle("qr-print--framed", useFrame);
  setQrSize(wrap, currentSizeIndex);
  const sectionNav = createSectionNav();

  const toolbar = document.createElement("div");
  toolbar.className = "qr-print-toolbar";

  const header = document.createElement("div");
  header.className = "qr-print-header";
  const heading = document.createElement("h3");
  heading.textContent = text.title;
  const count = document.createElement("p");
  count.className = "qr-print-count";
  count.textContent = text.count(machines.length, totalMachinesCount);
  header.appendChild(heading);
  header.appendChild(count);

  const printOptions = document.createElement("div");
  printOptions.className = "qr-print-options";

  const sizeControl = document.createElement("label");
  sizeControl.className = "qr-print-size";
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "qr-print-size-icon";
  sizeLabel.innerHTML = ZOOM_ICON;
  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "0";
  sizeInput.max = String(QR_SIZE_STEPS.length - 1);
  sizeInput.step = "1";
  sizeInput.value = String(currentSizeIndex);
  sizeInput.setAttribute("aria-label", text.size);
  sizeInput.addEventListener("input", () => {
    setQrSize(wrap, sizeInput.value);
  });
  sizeControl.appendChild(sizeLabel);
  sizeControl.appendChild(sizeInput);

  const frameControl = document.createElement("label");
  frameControl.className = "qr-print-frame-toggle";
  const frameInput = document.createElement("input");
  frameInput.type = "checkbox";
  frameInput.checked = useFrame;
  const frameLabel = document.createElement("span");
  frameLabel.textContent = text.frame;
  frameInput.addEventListener("change", () => {
    useFrame = frameInput.checked;
    wrap.classList.toggle("qr-print--framed", useFrame);
  });
  frameControl.appendChild(frameInput);
  frameControl.appendChild(frameLabel);

  const backControl = document.createElement("label");
  backControl.className = "qr-print-back-toggle";
  const backInput = document.createElement("input");
  backInput.type = "checkbox";
  backInput.checked = printBackNames;
  const backLabel = document.createElement("span");
  backLabel.textContent = text.backNames;
  backInput.addEventListener("change", () => {
    printBackNames = backInput.checked;
    renderQrGrid(currentMachines, { preserveList: true });
  });
  backControl.appendChild(backInput);
  backControl.appendChild(backLabel);

  const reloadBtn = createQrIconButton("qr-print-icon-button--reload", text.reload, RELOAD_ICON);
  reloadBtn.addEventListener("click", () => {
    if (!auth.currentUser?.uid) return;
    searchQuery = "";
    selectedTreeGroupId = "";
    selectedTreeMachineId = "";
    setLoadingState();
    fetchQrAccessibleMachines(auth.currentUser.uid)
      .then(async (sourceMachines) => {
        const nextSourceMachines = await buildQrMachineState(sourceMachines, lang);
        const nextQrMachines = nextSourceMachines.filter((machine) => machine.tagQrUrl);
        renderQrGrid(nextQrMachines, {
          sourceMachines: nextSourceMachines,
          totalCount: nextQrMachines.length,
          accessibleMachineCount: nextSourceMachines.length
        });
      })
      .catch(() => setState(text.error, "error"));
  });

  const printBtn = createQrIconButton("qr-print-icon-button--print", text.print, PRINT_ICON);
  printBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestQrPrint(printBackNames);
  });

  printBtn.disabled = machines.length === 0;

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "qr-print-search";
  searchInput.placeholder = text.searchPlaceholder;
  searchInput.value = searchQuery;
  searchInput.setAttribute("aria-label", text.search);
  searchInput.classList.toggle("is-active-search", !!searchQuery.trim());
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value || "";
    renderVisibleMachines({ restoreSearch: true });
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    searchQuery = "";
    renderVisibleMachines({ restoreSearch: true });
  });

  printOptions.appendChild(sizeControl);
  printOptions.appendChild(frameControl);
  printOptions.appendChild(backControl);

  toolbar.appendChild(printBtn);
  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(searchInput);
  const desktopMenus = window.matchMedia("(min-width: 769px)").matches;
  const headerActions = document.createElement("div");
  headerActions.className = "qr-print-header-actions";
  headerActions.append(printOptions, count);
  header.replaceChildren(
    desktopMenus ? heading : createMobileHeadingGroup(heading),
    headerActions
  );
  const fixedMenus = document.createElement("div");
  fixedMenus.className = "qr-print-fixed-menus";
  fixedMenus.append(sectionNav, toolbar, header);
  const fixedMenusSpace = document.createElement("div");
  fixedMenusSpace.className = "qr-print-fixed-menus-space";
  wrap.append(fixedMenus, fixedMenusSpace);
  mountQrGroupTree(wrap);

  if (!machines.length) {
    const empty = document.createElement("p");
    empty.className = "qr-print-state";
    const selectedMachine = selectedTreeMachineId
      ? allMachines.find((machine) => machine.id === selectedTreeMachineId)
      : null;
    empty.textContent = selectedMachine && !selectedMachine.tagQrUrl
      ? text.emptySelectedWithoutQr
      : accessibleMachinesCount > 0 ? text.empty : text.emptyNoMachines;
    wrap.appendChild(empty);
    mount.appendChild(wrap);
    mountMobilePrimaryNavigation(sectionNav);
    window.requestAnimationFrame(syncQrMenuState);
    if (options.restoreSearch) {
      const nextSearch = wrap.querySelector(".qr-print-search");
      nextSearch?.focus();
      nextSearch?.setSelectionRange?.(nextSearch.value.length, nextSearch.value.length);
    }
    return;
  }

  let grid = document.createElement("div");
  grid.className = "qr-print-grid qr-print-front-grid";
  let backGrid = document.createElement("div");
  backGrid.className = "qr-print-grid qr-print-back-grid";
  const sheetCapacity = getPrintSheetCapacity();
  const appendSheetPair = () => {
    wrap.appendChild(grid);
    wrap.appendChild(backGrid);
    grid = document.createElement("div");
    grid.className = "qr-print-grid qr-print-front-grid";
    backGrid = document.createElement("div");
    backGrid.className = "qr-print-grid qr-print-back-grid";
  };
  machines.forEach((machine, index) => {
    if (index > 0 && index % sheetCapacity === 0) appendSheetPair();
    const item = document.createElement("article");
    item.className = "qr-print-item";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "qr-print-remove";
    removeBtn.setAttribute("aria-label", text.remove);
    removeBtn.setAttribute("data-tooltip", text.remove);
    qrTooltips.attach(removeBtn);
    removeBtn.innerHTML =
      '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
      '<path d="M2.25 2.25 9.75 9.75M9.75 2.25 2.25 9.75"/></svg>';
    removeBtn.addEventListener("click", () => {
      hiddenMachineIds.add(machine.id);
      renderVisibleMachines();
    });

    const name = document.createElement("p");
    name.className = "qr-print-machine";
    name.textContent = machine.title || machine.id;

    const qrWrap = document.createElement("div");
    qrWrap.className = "qr-print-qr-wrap";

    const frameImg = document.createElement("img");
    frameImg.className = "qr-print-frame";
    frameImg.src = "/static/img/LOGO%20unatomo%20v1.6%20baseQR.jpg";
    frameImg.alt = "";
    frameImg.loading = "eager";
    frameImg.decoding = "async";

    const img = document.createElement("img");
    img.className = "qr-print-image";
    img.src = machine.tagQrUrl;
    img.alt = `${machine.title || machine.id} QR`;
    img.loading = "eager";
    img.decoding = "async";

    item.appendChild(removeBtn);
    item.appendChild(name);
    qrWrap.appendChild(frameImg);
    qrWrap.appendChild(img);
    item.appendChild(qrWrap);
    grid.appendChild(item);

    const backItem = document.createElement("article");
    backItem.className = "qr-print-item qr-print-back-item";
    const backName = document.createElement("p");
    backName.className = "qr-print-back-machine";
    backName.textContent = machine.title || machine.id;
    backItem.appendChild(backName);
    backGrid.appendChild(backItem);
  });
  wrap.appendChild(grid);
  wrap.appendChild(backGrid);
  mount.appendChild(wrap);
  mountMobilePrimaryNavigation(sectionNav);
  window.requestAnimationFrame(syncQrMenuState);
  if (options.restoreSearch) {
    const nextSearch = wrap.querySelector(".qr-print-search");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(nextSearch.value.length, nextSearch.value.length);
  }
};

const setLoadingState = () => {
  if (!mount) return;
  clearLoadingProgress();
  resetMobilePrimaryNavigation();
  mount.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  mount.classList.remove("has-group-tree");
  qrGroupTree.hidden = true;
  qrDataReady = false;
  const sectionNav = createSectionNav();

  const toolbar = document.createElement("div");
  toolbar.className = "qr-print-toolbar";

  const printBtn = createQrIconButton("qr-print-icon-button--print", text.print, PRINT_ICON);
  printBtn.disabled = true;
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "qr-print-search";
  searchInput.placeholder = text.searchPlaceholder;
  searchInput.setAttribute("aria-label", text.search);
  searchInput.disabled = true;
  const reloadBtn = createQrIconButton("qr-print-icon-button--reload", text.reload, RELOAD_ICON);
  reloadBtn.disabled = true;

  const loading = document.createElement("div");
  loading.className = "dashboard-loading qr-print-loading";
  const loadingText = document.createElement("div");
  loadingText.className = "dashboard-loading-text";
  loadingText.textContent = `${text.loading} `;
  const percent = document.createElement("span");
  percent.className = "dashboard-loading-percent";
  percent.textContent = "0%";
  loadingText.appendChild(percent);
  loading.appendChild(loadingText);

  const header = document.createElement("div");
  header.className = "qr-print-header";
  const heading = document.createElement("h3");
  heading.textContent = text.title;
  const desktopMenus = window.matchMedia("(min-width: 769px)").matches;
  header.appendChild(
    desktopMenus ? heading : createMobileHeadingGroup(heading, loading)
  );
  if (desktopMenus) header.appendChild(loading);
  const fixedMenus = document.createElement("div");
  fixedMenus.className = "qr-print-fixed-menus";
  fixedMenus.append(sectionNav, toolbar, header);
  const fixedMenusSpace = document.createElement("div");
  fixedMenusSpace.className = "qr-print-fixed-menus-space";
  wrap.append(fixedMenus, fixedMenusSpace);
  mount.appendChild(wrap);
  mountMobilePrimaryNavigation(sectionNav);
  window.requestAnimationFrame(syncQrMenuState);

  let progress = 0;
  loadingProgressTimer = window.setInterval(() => {
    progress = Math.min(88, progress + Math.max(1, Math.ceil((88 - progress) / 12)));
    percent.textContent = `${progress}%`;
    if (progress >= 88) clearLoadingProgress();
  }, 80);
};

if (mount) {
  observeDashboardLoading();
  setLoadingState();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      activeUid = "";
      window.location.href = text.login;
      return;
    }
    activeUid = user.uid;
    hiddenTreeGroupIds = loadHiddenTreeGroupIds(user.uid);
    applyQrDashboardTopbarTitle(user.uid);
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = text.home;
        return;
      }
      if (isAccountOnboardingRequired(registration)) {
        window.location.replace(text.onboarding);
        return;
      }
      const sourceMachines = await fetchQrAccessibleMachines(user.uid);
      sectionNavigation = await loadQrSectionNavigation({
        uid: user.uid,
        user,
        registration,
        machines: sourceMachines
      });
      dashboardLayout = sectionNavigation.dashboardLayout;
      const machines = await buildQrMachineState(sourceMachines, lang);
      const qrMachines = machines.filter((machine) => machine.tagQrUrl);
      const focusedMachineId = getFocusedQrMachineId();
      selectedTreeMachineId = machines.some((machine) => machine.id === focusedMachineId)
        ? focusedMachineId
        : "";
      selectedTreeGroupId = selectedTreeMachineId
        ? dashboardLayout.placements[selectedTreeMachineId]?.groupId || ""
        : "";
      if (selectedTreeGroupId) {
        const groupById = new Map(dashboardLayout.groups.map((group) => [group.id, group]));
        const expanded = new Set();
        let currentGroupId = selectedTreeGroupId;
        while (currentGroupId && groupById.has(currentGroupId)) {
          expanded.add(currentGroupId);
          currentGroupId = groupById.get(currentGroupId)?.parentGroupId || "";
        }
        expandedTreeGroupIds = Array.from(expanded);
      }
      renderQrGrid(qrMachines, {
        sourceMachines: machines,
        totalCount: qrMachines.length,
        accessibleMachineCount: machines.length
      });
    } catch {
      setState(text.error, "error");
    }
  });
}
