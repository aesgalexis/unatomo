import { createDashboardSectionNav } from "/static/js/dashboard/components/sectionNav.js";
import { initThemeToggle } from "/static/js/theme/theme-toggle.js";
import { createDemoStore } from "./demoStore.js";

const mount = document.getElementById("qr-print-mount");
const store = createDemoStore();
const QR_SIZE_STEPS = [100, 132, 168, 210, 260];
const PRINT_COLUMNS_BY_STEP = [4, 3, 2, 2, 1];
const GRID_GAP_BY_STEP = ["0.85rem", "1rem", "1.2rem", "1.45rem", "1.65rem"];
const PRINT_ROWS_BY_STEP = [5, 4, 3, 3, 2];

let allMachines = [];
let currentMachines = [];
let hiddenMachineIds = new Set();
let searchQuery = "";
let currentSizeIndex = 0;
let useFrame = true;
let printBackNames = false;

const text = {
  title: "Impresion QR",
  print: "Imprimir",
  reload: "Recargar QRs",
  search: "Buscar QR por titulo de maquina",
  searchPlaceholder: "Buscar por titulo...",
  remove: "Quitar de la hoja",
  size: "Tamano QR",
  frame: "Marco",
  backNames: "Nombres reverso",
  empty: "No hay QRs generados.",
  count: (visible, total) => `${visible}/${total}`
};

const PRINT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 9V3h12v6"></path>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <path d="M6 14h12v7H6z"></path>
  </svg>
`;

const RELOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
    <path d="M20 4v5h-5"></path>
  </svg>
`;

const createIconButton = (className, label, icon) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `qr-print-icon-button ${className}`;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = icon;
  return btn;
};

const hashText = (value) => {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createDemoQrDataUrl = (value) => {
  const cells = 33;
  const quiet = 4;
  const cell = 6;
  const size = (cells + quiet * 2) * cell;
  const seed = hashText(value);
  const isFinder = (x, y) =>
    (x < 7 && y < 7) ||
    (x >= cells - 7 && y < 7) ||
    (x < 7 && y >= cells - 7);
  const inFinderWhite = (x, y) =>
    (x >= 1 && x <= 5 && y >= 1 && y <= 5 && !(x >= 2 && x <= 4 && y >= 2 && y <= 4)) ||
    (x >= cells - 6 && x <= cells - 2 && y >= 1 && y <= 5 && !(x >= cells - 5 && x <= cells - 3 && y >= 2 && y <= 4)) ||
    (x >= 1 && x <= 5 && y >= cells - 6 && y <= cells - 2 && !(x >= 2 && x <= 4 && y >= cells - 5 && y <= cells - 3));
  const rects = [];
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const finder = isFinder(x, y);
      const finderBorder = finder && !inFinderWhite(x, y);
      const finderCenter = finder && (
        ((x >= 2 && x <= 4) && (y >= 2 && y <= 4)) ||
        ((x >= cells - 5 && x <= cells - 3) && (y >= 2 && y <= 4)) ||
        ((x >= 2 && x <= 4) && (y >= cells - 5 && y <= cells - 3))
      );
      const bit = ((seed + x * 1103515245 + y * 12345 + x * y * 97) >>> ((x + y) % 16)) & 1;
      const timing = !finder && (x === 6 || y === 6) && ((x + y) % 2 === 0);
      if (finderBorder || finderCenter || timing || (!finder && bit)) {
        rects.push(`<rect x="${(x + quiet) * cell}" y="${(y + quiet) * cell}" width="${cell}" height="${cell}"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#fff"/>
    <g fill="#000">${rects.join("")}</g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const getFocusedMachineId = () => {
  try {
    return new URLSearchParams(window.location.search).get("machineId") || "";
  } catch {
    return "";
  }
};

const buildMachines = () => {
  const focusedId = getFocusedMachineId();
  const machines = store
    .getState()
    .machines
    .filter((machine) => machine.tagId)
    .map((machine) => ({
      id: machine.id,
      title: machine.title,
      tagId: machine.tagId,
      tagQrUrl: createDemoQrDataUrl(machine.tagUrl || machine.tagId)
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
  return focusedId ? machines.filter((machine) => machine.id === focusedId) : machines;
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

const getVisibleMachines = () => {
  const query = searchQuery.trim().toLowerCase();
  return allMachines.filter((machine) => {
    if (hiddenMachineIds.has(machine.id)) return false;
    if (!query) return true;
    return machine.title.toLowerCase().includes(query);
  });
};

const clearPrintMode = () => {
  document.body.classList.remove("qr-print-printing", "qr-print-include-back");
};

const requestPrint = () => {
  clearPrintMode();
  document.body.classList.add("qr-print-printing");
  if (printBackNames) document.body.classList.add("qr-print-include-back");
  window.setTimeout(() => {
    window.print();
    window.setTimeout(clearPrintMode, 1000);
  }, 0);
};

const createSectionNav = () =>
  createDashboardSectionNav({
    dashboardHref: "/demo/#/dashboard",
    registryHref: "/demo/#/registro",
    qrPrintHref: "/demo/qr-print.html",
    labels: {
      dashboard: "Dashboard",
      registry: "Registro",
      qrPrint: "Impresion QR"
    },
    active: "qrPrint",
    extraClass: "qr-print-section-nav"
  }).sectionNav;

const renderQrGrid = (machines, options = {}) => {
  currentMachines = machines;
  if (!options.preserveList) {
    allMachines = machines;
    hiddenMachineIds = new Set();
  }

  mount.innerHTML = "";
  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  wrap.classList.toggle("qr-print--framed", useFrame);
  setQrSize(wrap, currentSizeIndex);
  wrap.appendChild(createSectionNav());

  const toolbar = document.createElement("div");
  toolbar.className = "qr-print-toolbar";

  const printBtn = createIconButton("qr-print-icon-button--print", text.print, PRINT_ICON);
  printBtn.disabled = machines.length === 0;
  printBtn.addEventListener("click", requestPrint);

  const reloadBtn = createIconButton("qr-print-icon-button--reload", text.reload, RELOAD_ICON);
  reloadBtn.addEventListener("click", () => {
    searchQuery = "";
    renderQrGrid(buildMachines());
  });

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "qr-print-search";
  searchInput.placeholder = text.searchPlaceholder;
  searchInput.value = searchQuery;
  searchInput.setAttribute("aria-label", text.search);
  searchInput.classList.toggle("is-active-search", !!searchQuery.trim());
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value || "";
    renderQrGrid(getVisibleMachines(), { preserveList: true, restoreSearch: true });
  });

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "qr-print-options";

  const sizeControl = document.createElement("label");
  sizeControl.className = "qr-print-size";
  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = text.size;
  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "0";
  sizeInput.max = String(QR_SIZE_STEPS.length - 1);
  sizeInput.step = "1";
  sizeInput.value = String(currentSizeIndex);
  sizeInput.addEventListener("input", () => setQrSize(wrap, sizeInput.value));
  sizeControl.appendChild(sizeLabel);
  sizeControl.appendChild(sizeInput);

  const frameControl = document.createElement("label");
  frameControl.className = "qr-print-frame-toggle";
  const frameInput = document.createElement("input");
  frameInput.type = "checkbox";
  frameInput.checked = useFrame;
  frameInput.addEventListener("change", () => {
    useFrame = frameInput.checked;
    wrap.classList.toggle("qr-print--framed", useFrame);
  });
  const frameLabel = document.createElement("span");
  frameLabel.textContent = text.frame;
  frameControl.appendChild(frameInput);
  frameControl.appendChild(frameLabel);

  const backControl = document.createElement("label");
  backControl.className = "qr-print-back-toggle";
  const backInput = document.createElement("input");
  backInput.type = "checkbox";
  backInput.checked = printBackNames;
  backInput.addEventListener("change", () => {
    printBackNames = backInput.checked;
    renderQrGrid(currentMachines, { preserveList: true });
  });
  const backLabel = document.createElement("span");
  backLabel.textContent = text.backNames;
  backControl.appendChild(backInput);
  backControl.appendChild(backLabel);

  optionsWrap.appendChild(sizeControl);
  optionsWrap.appendChild(frameControl);
  optionsWrap.appendChild(backControl);
  toolbar.appendChild(printBtn);
  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(searchInput);
  toolbar.appendChild(optionsWrap);
  wrap.appendChild(toolbar);

  const header = document.createElement("div");
  header.className = "qr-print-header";
  const heading = document.createElement("h3");
  heading.textContent = text.title;
  const count = document.createElement("p");
  count.className = "qr-print-count";
  count.textContent = text.count(machines.length, allMachines.length || machines.length);
  header.appendChild(heading);
  header.appendChild(count);
  wrap.appendChild(header);

  if (!machines.length) {
    const empty = document.createElement("p");
    empty.className = "qr-print-state";
    empty.textContent = text.empty;
    wrap.appendChild(empty);
    mount.appendChild(wrap);
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
    removeBtn.title = text.remove;
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => {
      hiddenMachineIds.add(machine.id);
      renderQrGrid(getVisibleMachines(), { preserveList: true });
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
    const img = document.createElement("img");
    img.className = "qr-print-image";
    img.src = machine.tagQrUrl;
    img.alt = `${machine.title || machine.id} QR`;

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

  if (options.restoreSearch) {
    const nextSearch = wrap.querySelector(".qr-print-search");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(nextSearch.value.length, nextSearch.value.length);
  }
};

initThemeToggle();
window.__unatomoStylesReady?.finally(() => renderQrGrid(buildMachines())) || renderQrGrid(buildMachines());
