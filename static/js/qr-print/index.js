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

const mount = document.getElementById("qr-print-mount");
const lang = getCurrentLang();
const isEn = lang === "en";

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
  reload: isEn ? "Reload QR codes" : "Recargar QRs",
  remove: isEn ? "Remove from print sheet" : "Quitar de la hoja",
  size: isEn ? "QR size" : "Tamaño QR",
  frame: isEn ? "Frame" : "Marco",
  count: isEn
    ? (visible, total) => `Showing ${visible} of ${total} QR ${total === 1 ? "code" : "codes"}`
    : (visible, total) => `Mostrando ${visible} de ${total} ${total === 1 ? "QR" : "QRs"}`,
  login: localizeEsPath("/es/auth/login.html", lang),
  home: localizeEsPath("/es/index.html", lang),
};
const QR_SIZE_STEPS = [100, 132, 168, 210, 260];
const PRINT_COLUMNS_BY_STEP = [4, 3, 2, 2, 1];
const GRID_GAP_BY_STEP = ["0.85rem", "1rem", "1.2rem", "1.45rem", "1.65rem"];
let currentMachines = [];
let totalMachinesCount = 0;
let currentSizeIndex = 0;
let useFrame = false;

const getFocusedMachineId = () => {
  try {
    return new URLSearchParams(window.location.search).get("machineId") || "";
  } catch {
    return "";
  }
};

const setState = (message, state = "") => {
  if (!mount) return;
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

const renderQrGrid = (machines, options = {}) => {
  if (!mount) return;
  if (!options.preserveList) {
    currentMachines = machines;
    totalMachinesCount = Number.isFinite(options.totalCount)
      ? options.totalCount
      : machines.length;
  }
  mount.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "qr-print";
  wrap.classList.toggle("qr-print--framed", useFrame);
  setQrSize(wrap, currentSizeIndex);

  const toolbar = document.createElement("div");
  toolbar.className = "qr-print-toolbar";

  const copy = document.createElement("div");
  copy.className = "qr-print-summary";
  const count = document.createElement("p");
  count.className = "qr-print-count";
  count.textContent = text.count(machines.length, totalMachinesCount);
  copy.appendChild(count);

  const actions = document.createElement("div");
  actions.className = "qr-print-actions";

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

  const reloadBtn = document.createElement("button");
  reloadBtn.type = "button";
  reloadBtn.className = "qr-print-icon-button qr-print-icon-button--reload";
  reloadBtn.setAttribute("aria-label", text.reload);
  reloadBtn.title = text.reload;
  reloadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
      <path d="M20 4v5h-5"></path>
    </svg>
  `;
  reloadBtn.addEventListener("click", () => {
    if (!auth.currentUser?.uid) return;
    setState(text.loading);
    fetchQrMachines(auth.currentUser.uid)
      .then((nextMachines) => renderQrGrid(nextMachines))
      .catch(() => setState(text.error, "error"));
  });

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "qr-print-icon-button qr-print-icon-button--print";
  printBtn.setAttribute("aria-label", text.print);
  printBtn.title = text.print;
  printBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 9V3h12v6"></path>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <path d="M6 14h12v7H6z"></path>
    </svg>
  `;
  printBtn.addEventListener("click", () => window.print());

  actions.appendChild(sizeControl);
  actions.appendChild(frameControl);
  actions.appendChild(reloadBtn);
  actions.appendChild(printBtn);

  toolbar.appendChild(copy);
  toolbar.appendChild(actions);
  wrap.appendChild(toolbar);

  if (!machines.length) {
    const empty = document.createElement("p");
    empty.className = "qr-print-state";
    empty.textContent = text.empty;
    wrap.appendChild(empty);
    mount.appendChild(wrap);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "qr-print-grid";
  machines.forEach((machine) => {
    const item = document.createElement("article");
    item.className = "qr-print-item";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "qr-print-remove";
    removeBtn.setAttribute("aria-label", text.remove);
    removeBtn.title = text.remove;
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      currentMachines = currentMachines.filter((entry) => entry.id !== machine.id);
      renderQrGrid(currentMachines, { preserveList: true });
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
  });
  wrap.appendChild(grid);
  mount.appendChild(wrap);
};

if (mount) {
  setState(text.loading);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = text.login;
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = text.home;
        return;
      }
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
