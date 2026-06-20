import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";
import { normalizeDashboardTitle } from "/static/js/dashboard/layout/dashboardLayoutModel.mjs";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";

const mount = document.getElementById("qr-print-mount");
const lang = getCurrentLang();
const isEn = lang === "en";
const DASHBOARD_TITLE_CACHE_KEY = "unatomo_dashboard_title_v1";

const text = {
  title: isEn ? "QR print" : "Impresión QR",
  loading: isEn ? "Loading QR codes..." : "Cargando QRs...",
  empty: isEn
    ? "No generated QR codes found."
    : "No hay QRs generados.",
  error: isEn
    ? "Unable to load QR codes."
    : "No se han podido cargar los QRs.",
  print: isEn ? "Print" : "Imprimir",
  printBack: isEn
    ? "Print back side with machine names?"
    : "¿Imprimir el reverso con los nombres de las máquinas?",
  reload: isEn ? "Reload QR codes" : "Recargar QRs",
  search: isEn ? "Search QR by machine title" : "Buscar QR por titulo de maquina",
  searchPlaceholder: isEn ? "Search by title..." : "Buscar por titulo...",
  remove: isEn ? "Remove from print sheet" : "Quitar de la hoja",
  size: isEn ? "QR size" : "Tamaño QR",
  frame: isEn ? "Frame" : "Marco",
  backNames: isEn ? "Back names" : "Nombres reverso",
  sectionNavAria: isEn ? "Sections" : "Secciones",
  navDashboard: "Dashboard",
  navRegistry: isEn ? "Registry" : "Registro",
  navQrPrint: isEn ? "QR print" : "Impresi\u00f3n QR",
  navSuggestions: isEn ? "Suggestions" : "Sugerencias",
  count: (visible, total) => `${visible}/${total}`,
  login: localizeEsPath("/es/auth/login.html", lang),
  home: localizeEsPath("/es/index.html", lang),
  dashboard: localizeEsPath("/es/index.html", lang),
  qrPrint: localizeEsPath("/es/impresion-qr.html", lang),
};
const QR_SIZE_STEPS = [100, 132, 168, 210, 260];
const PRINT_COLUMNS_BY_STEP = [4, 3, 2, 2, 1];
const GRID_GAP_BY_STEP = ["0.85rem", "1rem", "1.2rem", "1.45rem", "1.65rem"];
const RELOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
    <path d="M20 4v5h-5"></path>
  </svg>
`;
const PRINT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 9V3h12v6"></path>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <path d="M6 14h12v7H6z"></path>
  </svg>
`;
let currentMachines = [];
let allMachines = [];
let totalMachinesCount = 0;
let currentSizeIndex = 0;
let useFrame = true;
let printBackNames = false;
let loadingProgressTimer = null;
let showSuggestionsNav = false;
let searchQuery = "";
let hiddenMachineIds = new Set();

const createIconButton = (className, label, icon) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `qr-print-icon-button ${className}`;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = icon;
  return btn;
};

const getCachedDashboardTitle = () => {
  try {
    return normalizeDashboardTitle(localStorage.getItem(DASHBOARD_TITLE_CACHE_KEY) || "");
  } catch {
    return "";
  }
};

const cacheDashboardTitle = (title) => {
  try {
    const normalized = normalizeDashboardTitle(title);
    if (normalized) localStorage.setItem(DASHBOARD_TITLE_CACHE_KEY, normalized);
  } catch {}
};

const applyDashboardTopbarTitle = async (uid) => {
  const setTitle = (value, attempts = 0) => {
    const titleEl = document.getElementById("topbar-title");
    if (titleEl) {
      titleEl.textContent = value;
      return;
    }
    if (attempts < 20) {
      window.setTimeout(() => setTitle(value, attempts + 1), 50);
    }
  };
  let title = getCachedDashboardTitle() || "Dashboard";
  try {
    const snap = await getDoc(doc(db, "dashboard_layout", uid));
    const remoteTitle = normalizeDashboardTitle(snap.exists() ? snap.data()?.dashboardTitle : "");
    if (remoteTitle) {
      title = remoteTitle;
      cacheDashboardTitle(remoteTitle);
    }
  } catch {}
  setTitle(title);
};

const clearLoadingProgress = () => {
  if (!loadingProgressTimer) return;
  window.clearInterval(loadingProgressTimer);
  loadingProgressTimer = null;
};

const createSectionNav = () => {
  const sectionNav = document.createElement("nav");
  sectionNav.className = "dashboard-section-nav qr-print-section-nav";
  sectionNav.setAttribute("aria-label", text.sectionNavAria);

  const dashboardLink = document.createElement("a");
  dashboardLink.className = "dashboard-section-link";
  dashboardLink.href = `${text.dashboard}#/dashboard`;
  dashboardLink.textContent = text.navDashboard;

  const registryLink = document.createElement("a");
  registryLink.className = "dashboard-section-link";
  registryLink.href = `${text.dashboard}#/registro`;
  registryLink.setAttribute("aria-label", text.navRegistry);
  registryLink.setAttribute("data-tooltip", text.navRegistry);
  const registryLabel = document.createElement("span");
  registryLabel.className = "dashboard-section-icon";
  registryLabel.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 4h8M8 12h8M8 16h5"></path>
    </svg>
  `;
  registryLink.appendChild(registryLabel);

  const qrPrintLink = document.createElement("a");
  qrPrintLink.className = "dashboard-section-link";
  qrPrintLink.href = text.qrPrint;
  qrPrintLink.setAttribute("aria-label", text.navQrPrint);
  qrPrintLink.setAttribute("data-tooltip", text.navQrPrint);
  const qrPrintLabel = document.createElement("span");
  qrPrintLabel.className = "dashboard-section-icon";
  qrPrintLabel.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3h10v5H7V3Zm-2 7h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2v2H6v-2H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3Zm3 7v2h8v-2H8Zm11-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path>
    </svg>
  `;
  qrPrintLink.appendChild(qrPrintLabel);

  const suggestionsLink = document.createElement("a");
  suggestionsLink.className = "dashboard-section-link";
  suggestionsLink.href = `${text.dashboard}#/sugerencias`;
  suggestionsLink.hidden = !showSuggestionsNav;
  suggestionsLink.setAttribute("aria-label", text.navSuggestions);
  suggestionsLink.setAttribute("data-tooltip", text.navSuggestions);
  const suggestionsLabel = document.createElement("span");
  suggestionsLabel.className = "dashboard-section-icon";
  suggestionsLabel.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"></path>
    </svg>
  `;
  suggestionsLink.appendChild(suggestionsLabel);

  sectionNav.appendChild(dashboardLink);
  sectionNav.appendChild(registryLink);
  sectionNav.appendChild(qrPrintLink);
  sectionNav.appendChild(suggestionsLink);
  return sectionNav;
};

const canShowSuggestionsNav = async (user, registration) => {
  if (registration?.profile?.suggestionsCollaborator === true) return true;
  try {
    return await isControlPanelUser(user);
  } catch {
    return false;
  }
};

const normalizeSearch = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLocaleLowerCase(isEn ? "en" : "es");

const getVisibleMachines = () => {
  const queryText = normalizeSearch(searchQuery);
  return allMachines.filter((machine) => {
    if (hiddenMachineIds.has(machine.id)) return false;
    if (!queryText) return true;
    return normalizeSearch(machine.title || machine.id).includes(queryText);
  });
};

const renderVisibleMachines = (options = {}) => {
  renderQrGrid(getVisibleMachines(), { preserveList: true, ...options });
};

const clearPrintMode = () => {
  document.body.classList.remove("qr-print-printing", "qr-print-include-back");
};

const printDocument = () =>
  new Promise((resolve) => {
    clearPrintMode();
    document.body.classList.add("qr-print-printing");
    if (printBackNames) document.body.classList.add("qr-print-include-back");
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener("afterprint", cleanup);
      clearPrintMode();
      resolve();
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      if (typeof window.print === "function") {
        window.print();
      } else if (typeof globalThis.print === "function") {
        globalThis.print();
      }
      window.setTimeout(cleanup, 1000);
    }, 0);
  });

const requestPrint = async () => {
  try {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  } catch {
    // ignore focus cleanup failures
  }
  await printDocument();
};

const getFocusedMachineId = () => {
  try {
    return new URLSearchParams(window.location.search).get("machineId") || "";
  } catch {
    return "";
  }
};

const setState = (message, state = "") => {
  if (!mount) return;
  clearLoadingProgress();
  mount.innerHTML = "";
  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  const status = document.createElement("p");
  status.className = "qr-print-state";
  if (state) status.dataset.state = state;
  status.textContent = message;
  wrap.appendChild(status);
  mount.appendChild(wrap);
};

const normalizeMachine = (raw) => ({
  id: raw.id || "",
  title: (raw.title || raw.nombre || "").toString().trim(),
  tagId: (raw.tagId || "").toString().trim(),
  tagQrUrl: (raw.tagQrUrl || "").toString().trim(),
});

const resolveQrUrl = async (machine) => {
  if (machine.tagQrUrl) return machine.tagQrUrl;
  if (!machine.tagId) return "";
  try {
    const snap = await getDoc(doc(db, "tags", machine.tagId));
    if (!snap.exists()) return "";
    return (snap.data()?.qrUrl || "").toString().trim();
  } catch {
    return "";
  }
};

const fetchOwnerMachines = async (uid) => {
  const q = query(collection(db, "machines"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

const fetchAdminMachines = async (uid) => {
  const linksQuery = query(
    collection(db, "admin_machine_links"),
    where("adminUid", "==", uid)
  );
  const linksSnap = await getDocs(linksQuery);
  const links = linksSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((link) => link.status === "accepted" && link.machineId);

  const machines = await Promise.all(
    links.map(async (link) => {
      try {
        const snap = await getDoc(doc(db, "machines", link.machineId));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
      } catch {
        return null;
      }
    })
  );

  return machines.filter(Boolean);
};

const fetchQrMachines = async (uid) => {
  const [ownerResult, adminResult] = await Promise.allSettled([
    fetchOwnerMachines(uid),
    fetchAdminMachines(uid),
  ]);
  if (ownerResult.status === "rejected" && adminResult.status === "rejected") {
    throw ownerResult.reason || adminResult.reason;
  }
  const ownerMachines = ownerResult.status === "fulfilled" ? ownerResult.value : [];
  const adminMachines = adminResult.status === "fulfilled" ? adminResult.value : [];
  const map = new Map();
  const normalizedMachines = [...ownerMachines, ...adminMachines].map(normalizeMachine);
  const qrUrls = await Promise.all(normalizedMachines.map(resolveQrUrl));
  normalizedMachines.forEach((normalized, index) => {
    normalized.tagQrUrl = qrUrls[index] || "";
    if (!normalized.id || !normalized.tagQrUrl) return;
    map.set(normalized.id, normalized);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.title.localeCompare(b.title, isEn ? "en" : "es", { sensitivity: "base" })
  );
};

const setQrSize = (wrap, sizeIndex) => {
  const safeIndex = Math.max(0, Math.min(QR_SIZE_STEPS.length - 1, Number(sizeIndex) || 0));
  currentSizeIndex = safeIndex;
  wrap.style.setProperty("--qr-size", `${QR_SIZE_STEPS[safeIndex]}px`);
  wrap.style.setProperty("--qr-print-columns", PRINT_COLUMNS_BY_STEP[safeIndex]);
  wrap.style.setProperty("--qr-grid-gap", GRID_GAP_BY_STEP[safeIndex]);
};

const PRINT_ROWS_BY_STEP = [5, 4, 3, 3, 2];

const getPrintSheetCapacity = () => {
  const columns = PRINT_COLUMNS_BY_STEP[currentSizeIndex] || PRINT_COLUMNS_BY_STEP[0];
  const rows = PRINT_ROWS_BY_STEP[currentSizeIndex] || PRINT_ROWS_BY_STEP[0];
  return Math.max(1, columns * rows);
};

const renderQrGrid = (machines, options = {}) => {
  if (!mount) return;
  clearLoadingProgress();
  currentMachines = machines;
  if (!options.preserveList) {
    allMachines = machines;
    hiddenMachineIds = new Set();
    totalMachinesCount = Number.isFinite(options.totalCount)
      ? options.totalCount
      : machines.length;
  }
  mount.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  wrap.classList.toggle("qr-print--framed", useFrame);
  setQrSize(wrap, currentSizeIndex);
  wrap.appendChild(createSectionNav());

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
  sizeLabel.textContent = text.size;
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

  const reloadBtn = createIconButton("qr-print-icon-button--reload", text.reload, RELOAD_ICON);
  reloadBtn.addEventListener("click", () => {
    if (!auth.currentUser?.uid) return;
    searchQuery = "";
    setLoadingState();
    fetchQrMachines(auth.currentUser.uid)
      .then((nextMachines) => renderQrGrid(nextMachines))
      .catch(() => setState(text.error, "error"));
  });

  const printBtn = createIconButton("qr-print-icon-button--print", text.print, PRINT_ICON);
  printBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestPrint();
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
  toolbar.appendChild(searchInput);
  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(printOptions);
  wrap.appendChild(toolbar);
  wrap.appendChild(header);

  if (!machines.length) {
    const empty = document.createElement("p");
    empty.className = "qr-print-state";
    empty.textContent = text.empty;
    wrap.appendChild(empty);
    mount.appendChild(wrap);
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
    removeBtn.title = text.remove;
    removeBtn.textContent = "×";
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
  if (options.restoreSearch) {
    const nextSearch = wrap.querySelector(".qr-print-search");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(nextSearch.value.length, nextSearch.value.length);
  }
};

const setLoadingState = () => {
  if (!mount) return;
  clearLoadingProgress();
  mount.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  wrap.appendChild(createSectionNav());

  const toolbar = document.createElement("div");
  toolbar.className = "qr-print-toolbar";

  const printBtn = createIconButton("qr-print-icon-button--print", text.print, PRINT_ICON);
  printBtn.disabled = true;
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "qr-print-search";
  searchInput.placeholder = text.searchPlaceholder;
  searchInput.setAttribute("aria-label", text.search);
  searchInput.disabled = true;
  const reloadBtn = createIconButton("qr-print-icon-button--reload", text.reload, RELOAD_ICON);
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

  toolbar.appendChild(printBtn);
  toolbar.appendChild(searchInput);
  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(loading);
  wrap.appendChild(toolbar);
  mount.appendChild(wrap);

  let progress = 0;
  loadingProgressTimer = window.setInterval(() => {
    progress = Math.min(88, progress + Math.max(1, Math.ceil((88 - progress) / 12)));
    percent.textContent = `${progress}%`;
    if (progress >= 88) clearLoadingProgress();
  }, 80);
};

if (mount) {
  setLoadingState();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = text.login;
      return;
    }
    applyDashboardTopbarTitle(user.uid);
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = text.home;
        return;
      }
      showSuggestionsNav = await canShowSuggestionsNav(user, registration);
      const machines = await fetchQrMachines(user.uid);
      const focusedMachineId = getFocusedMachineId();
      const visibleMachines = focusedMachineId
        ? machines.filter((machine) => machine.id === focusedMachineId)
        : machines;
      renderQrGrid(visibleMachines, { totalCount: machines.length });
    } catch {
      setState(text.error, "error");
    }
  });
}
