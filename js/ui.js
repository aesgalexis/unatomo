import {
  state,
  save,
  addItem,
  removeItem,
  updateItem,
  moveBy,
  resolveItem,
  exportJson,
  importJson,
  moveItem, // para fijar orden en drop
  clearAll,
  clearHistory,
  sendToOrbit,   // NUEVO
  landDueOrbits, // NUEVO
  delayOrbit,    // NUEVO (asegúrate de tenerlo en state.js)
} from "./state.js";
import { enableDragAndDrop } from "./dragdrop.js";

// === Tabla periódica: número atómico → nombre ===
const ELEMENTS = {
  1: "Hydrogen",
  2: "Helium",
  3: "Lithium",
  4: "Beryllium",
  5: "Boron",
  6: "Carbon",
  7: "Nitrogen",
  8: "Oxygen",
  9: "Fluorine",
  10: "Neon",
  11: "Sodium",
  12: "Magnesium",
  13: "Aluminum",
  14: "Silicon",
  15: "Phosphorus",
  16: "Sulfur",
  17: "Chlorine",
  18: "Argon",
  19: "Potassium",
  20: "Calcium",
  21: "Scandium",
  22: "Titanium",
  23: "Vanadium",
  24: "Chromium",
  25: "Manganese",
  26: "Iron",
  27: "Cobalt",
  28: "Nickel",
  29: "Copper",
  30: "Zinc",
  31: "Gallium",
  32: "Germanium",
  33: "Arsenic",
  34: "Selenium",
  35: "Bromine",
  36: "Krypton",
  37: "Rubidium",
  38: "Strontium",
  39: "Yttrium",
  40: "Zirconium",
  41: "Niobium",
  42: "Molybdenum",
  43: "Technetium",
  44: "Ruthenium",
  45: "Rhodium",
  46: "Palladium",
  47: "Silver",
  48: "Cadmium",
  49: "Indium",
  50: "Tin",
  51: "Antimony",
  52: "Tellurium",
  53: "Iodine",
  54: "Xenon",
  55: "Cesium",
  56: "Barium",
  57: "Lanthanum",
  58: "Cerium",
  59: "Praseodymium",
  60: "Neodymium",
  61: "Promethium",
  62: "Samarium",
  63: "Europium",
  64: "Gadolinium",
  65: "Terbium",
  66: "Dysprosium",
  67: "Holmium",
  68: "Erbium",
  69: "Thulium",
  70: "Ytterbium",
  71: "Lutetium",
  72: "Hafnium",
  73: "Tantalum",
  74: "Tungsten",
  75: "Rhenium",
  76: "Osmium",
  77: "Iridium",
  78: "Platinum",
  79: "Gold",
  80: "Mercury",
  81: "Thallium",
  82: "Lead",
  83: "Bismuth",
  84: "Polonium",
  85: "Astatine",
  86: "Radon",
  87: "Francium",
  88: "Radium",
  89: "Actinium",
  90: "Thorium",
  91: "Protactinium",
  92: "Uranium",
  93: "Neptunium",
  94: "Plutonium",
  95: "Americium",
  96: "Curium",
  97: "Berkelium",
  98: "Californium",
  99: "Einsteinium",
  100: "Fermium",
  101: "Mendelevium",
  102: "Nobelium",
  103: "Lawrencium",
  104: "Rutherfordium",
  105: "Dubnium",
  106: "Seaborgium",
  107: "Bohrium",
  108: "Hassium",
  109: "Meitnerium",
  110: "Darmstadtium",
  111: "Roentgenium",
  112: "Copernicium",
  113: "Nihonium",
  114: "Flerovium",
  115: "Moscovium",
  116: "Livermorium",
  117: "Tennessine",
  118: "Oganesson"
};

// Límites por marco
const MAX_A = 8;
const MAX_B = 16;

// Visibilidad / cupos de UI
const LANDING_MAX = 62;           // Landing: contador independiente
const ORBIT_VISIBLE_MAX = 32;     // Orbit: infinito pero mostramos 32
const HISTORY_VISIBLE_MAX = 32;   // History: infinito pero mostramos 32

const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Elementos raíz
const listL = document.getElementById("listL");      // Landing
const frameL = document.getElementById("frameL");    // Glow violeta
const listA = document.getElementById("listA");
const listB = document.getElementById("listB");
const histList = document.getElementById("histList");
const addBtn = document.getElementById("addBtn");
const input = document.getElementById("labelInput");
const countEl = document.getElementById("count");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const clearAllBtn = document.getElementById("clearAll");

// Orbit (columna derecha)
const orbitList = document.getElementById("orbitList");
const orbitTitle = document.getElementById("orbitTitle");

// Títulos de marcos
const frameATitle = document.querySelector("#frameA h2");
const frameBTitle = document.querySelector("#frameB h2");
const histTitle  = document.querySelector(".historial h2");
const landingTitle = document.querySelector("#frameL h2");

// Timer de aterrizaje / refresco
let orbitTimer = null;

export function render() {
  // Limpiar listas
  if (listL) listL.innerHTML = "";
  listA.innerHTML = "";
  listB.innerHTML = "";
  histList.innerHTML = "";
  if (orbitList) orbitList.innerHTML = "";

  // Items por marco
  const itemsL = state.items.filter((x) => x.where === "L");
  const itemsA = state.items.filter((x) => x.where === "A");
  const itemsB = state.items.filter((x) => x.where === "B");

  // Orbit ordenado por retorno (total ilimitado)
  const orbitsAll = (state.orbit || [])
    .slice()
    .sort((a, b) => Date.parse(a.returnAt) - Date.parse(b.returnAt));

  const orbitCount = orbitsAll.length;
  const landingCount = itemsL.length;

  // Glow violeta en Landing si contiene elementos
  if (frameL) frameL.classList.toggle("has-items", landingCount > 0);

  // Pintar Landing/Main/Side
  for (const it of itemsL) listL?.appendChild(renderItem(it, true));
  for (const it of itemsA) listA.appendChild(renderItem(it));
  for (const it of itemsB) listB.appendChild(renderItem(it, true));

  // ===== ORBIT: mostrar hasta 32, panel minimal con prompt =====
  if (orbitList) {
    const toShow = orbitsAll.slice(0, ORBIT_VISIBLE_MAX);
    orbitList.innerHTML = "";

    for (const o of toShow) {
      const d = daysRemaining(o.returnAt);

      const card  = document.createElement("div");
      card.className = "hist-card";

      const head  = document.createElement("div");
      head.className = "hist-item";
      head.textContent = `Re-entering in ${d} ${d === 1 ? "day" : "days"}`;

      const panel = document.createElement("div");
      panel.className = "hist-panel";
      panel.innerHTML = `
        <div class="hist-meta">Due: ${formatDate(o.returnAt)}</div>
        <button class="tbtn -btn">Delay…</button>
      `;

      // Toggle exclusivo (como History)
      head.addEventListener("click", () => {
        const willOpen = !panel.classList.contains("open");
        closePanelsIn(orbitList, ".hist-panel", panel);
        panel.classList.toggle("open", willOpen);
      });

      // Botón Delay -> mismo prompt que al crear órbita
      panel.querySelector(".delay-btn").addEventListener("click", () => {
        const raw = prompt("Delay re-entry by how many days? (1–365)", "3");
        if (raw == null) return;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 1 || n > 365) {
          alert("Enter a number of days between 1 and 365.");
          return;
        }
        delayOrbit(o.id, n);
        render();
      });

      card.append(head, panel);
      orbitList.appendChild(card);
    }

    if (orbitTitle) {
      orbitTitle.textContent = `Orbit (${orbitCount}/∞)`;
    }
  }

  // ===== Historial (desplegable) — visible 32, total ilimitado =====
  const historyTotal = state.history.length;
  const historyVisible = state.history.slice(0, HISTORY_VISIBLE_MAX);

  for (const h of historyVisible) {
    const card = document.createElement("div");
    card.className = "hist-card";

    const head = document.createElement("div");
    head.className = "hist-item";
    head.textContent = h.label || "(sin etiqueta)";

    const panel = document.createElement("div");
    panel.className = "hist-panel";

    const meta = document.createElement("div");
    meta.className = "hist-meta";
    meta.textContent = formatDate(h.at);

    const note = document.createElement("div");
    const hasNote = !!(h.note && h.note.trim());
    note.className = "hist-note" + (hasNote ? "" : " empty");
    note.textContent = hasNote ? h.note : "(empty)";

    panel.append(meta, note);

    head.addEventListener("click", () => {
      const willOpen = !panel.classList.contains("open");
      closePanelsIn(histList, ".hist-panel", panel);
      panel.classList.toggle("open", willOpen);
    });

    card.append(head, panel);
    histList.appendChild(card);
  }

  // Contadores por marco en el título
  if (frameATitle) frameATitle.textContent = `Main (${itemsA.length}/${MAX_A})`;
  if (frameBTitle) frameBTitle.textContent = `Side (${itemsB.length}/${MAX_B})`;
  if (histTitle) {
    const vis = Math.min(historyTotal, HISTORY_VISIBLE_MAX);
    histTitle.textContent  = `History (${vis}/${historyTotal})`;
  }
  if (landingTitle) {
    landingTitle.textContent = `Landing (${landingCount}/${LANDING_MAX})`;
  }

  // Desactivar/activar +Crear según límite A
  if (addBtn) addBtn.disabled = itemsA.length >= MAX_A;

  // Exclusión: un panel abierto por zona
  enforceSingleOpen(listL, ".panel");
  enforceSingleOpen(listA, ".panel");
  enforceSingleOpen(listB, ".panel");
  enforceSingleOpen(histList, ".hist-panel");
  enforceSingleOpen(orbitList, ".hist-panel");

// Total incluyendo Landing
const total = itemsA.length + itemsB.length + itemsL.length;
countEl.textContent = `${total}`;

const elementName = ELEMENTS[total] || "";
if (elementName) {
  // Si hay elemento, mostramos el nombre en naranja
  countEl.innerHTML = `${total} <span class="element-name">(${elementName})</span>`;
} else {
  // Si no hay elemento (por encima de 118 o 0), solo mostramos el número
  countEl.textContent = total;
}

  // DnD: A y B aceptan drop; L solo inicia drag (dragdrop.js lo maneja)
  enableDragAndDrop({ listA, listB, listL, onDrop: onDragDrop });
}

function renderItem(it, inAlt = false) {
  const item = document.createElement("div");
  item.className = `item${inAlt ? " in-alt" : ""}`;
  item.dataset.id = String(it.id);
  item.setAttribute("draggable", "true");
  item.innerHTML = `
    <div class="grab">◳</div>
    <button class="btn"></button>
    <div class="tools">
      <button class="tbtn up" title="Up">↑</button>
      <button class="tbtn down" title="Down">↓</button>
      <button class="tbtn rename" title="Rename">✎</button>
      <button class="tbtn orbit-btn" title="Send to orbit" aria-label="Send to orbit">≫</button>
      <button class="tbtn done" title="Solve">✔</button>
    </div>
    <div class="panel${it.open ? " open" : ""}">
      <textarea
        placeholder="Write something.."
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        autocomplete="off"
      ></textarea>
    </div>
  `;

  const btn = item.querySelector(".btn");
  const panel = item.querySelector(".panel");
  const textarea = item.querySelector("textarea");

  textarea.spellcheck = false;
  textarea.setAttribute("autocorrect", "off");
  textarea.setAttribute("autocapitalize", "off");
  textarea.autocomplete = "off";

  btn.textContent = labelWithStamp(it);
  textarea.value = it.note || "";

  // Abrir/cerrar panel de notas
  btn.addEventListener("click", () => {
    const container = item.parentElement;
    const willOpen = !panel.classList.contains("open");
    closePanelsIn(container, ".panel", panel, (p) => {
      const otherItem = p.closest(".item");
      if (otherItem) updateItem(Number(otherItem.dataset.id), { open: false });
    });
    panel.classList.toggle("open", willOpen);
    updateItem(it.id, { open: willOpen });
  });

  // Renombrar
  item.querySelector(".rename").addEventListener("click", () => {
    const nuevo = prompt("Renombrar Attomic Button:", btn.textContent.trim());
    if (nuevo == null) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    updateItem(it.id, { label: nombre });
    render();
  });

  // Enviar a órbita (≫) — días 1..365
  item.querySelector(".orbit-btn").addEventListener("click", () => {
    const raw = prompt("How many days must it orbit before returning? (1–365)", "3");
    if (raw == null) return;
    const days = Number(raw);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      alert("Enter a number of days between 1 y 365.");
      return;
    }
    sendToOrbit(it.id, days);
    render();
  });

  // Editar nota
  textarea.addEventListener("input", () => {
    updateItem(it.id, { note: textarea.value });
  });

  // Subir/Bajar
  item.querySelector(".up").addEventListener("click", () => {
    moveBy(it.id, -1);
    render();
  });
  item.querySelector(".down").addEventListener("click", () => {
    moveBy(it.id, 1);
    render();
  });

  // Marcar como resuelto
  item.querySelector(".done").addEventListener("click", () => {
    resolveItem(it.id);
    render();
  });

  return item;
}

function onDragDrop({ id, where, index }) {
  const numId = Number(id);
  const destItemsExcludingSelf = state.items.filter(
    (x) => x.where === where && x.id !== numId
  );
  const capacity = where === "A" ? MAX_A : MAX_B;
  if (destItemsExcludingSelf.length >= capacity) return;

  moveItem(numId, where, Number(index));
  render();
}

export function bindGlobalHandlers() {
  // Desactivar corrector y ayudas en el input superior
  if (input) {
    input.spellcheck = false;
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.autocomplete = "off";
  }

  // Crear en Main respetando límite
  addBtn.addEventListener("click", () => {
    const countA = state.items.filter((x) => x.where === "A").length;
    if (countA >= MAX_A) {
      alert(`Marco superior lleno (${countA}/${MAX_A}).`);
      return;
    }
    const label = input.value.trim();
    addItem(label);
    input.value = "";
    input.focus();
    render();
  });

  // Borrar historial
  clearHistoryBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!confirm("Clear history?")) return;
    clearHistory();
    render();
  });

  // Enter para crear
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });

  // Exportar
  exportBtn.addEventListener("click", () => exportJson());

  // Importar
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      await importJson(file); // incluye aterrizaje de vencidos
      render();
    } catch (e) {
      alert("Error importing: " + e.message);
    } finally {
      importInput.value = "";
    }
  });

  // Vaciar todo
  clearAllBtn?.addEventListener("click", () => {
    if (!confirm("¿Clear all?")) return;
    clearAll();
    render();
  });

  // Aterrizaje inmediato al arrancar
  landDueOrbits();
  render();

  // Timer: comprobar aterrizajes y refrescar contador de días
  if (orbitTimer) clearInterval(orbitTimer);
  orbitTimer = setInterval(() => {
    const landed = landDueOrbits();
    if (landed > 0 || (state.orbit && state.orbit.length > 0)) {
      render(); // refresca “Re-entering in X days”
    }
  }, 60_000); // cada minuto
}

/* ================== Helpers ================== */

// días restantes (ceil), mínimo 0
function daysRemaining(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  const ms = t - Date.now();
  const d = Math.ceil(ms / 86_400_000);
  return Math.max(0, d);
}

// Cierra todos los paneles de un contenedor, excepto 'exceptEl'.
function closePanelsIn(container, selector, exceptEl, onClose) {
  if (!container) return;
  container.querySelectorAll(`${selector}.open`).forEach((p) => {
    if (p === exceptEl) return;
    p.classList.remove("open");
    onClose?.(p);
  });
}

// Asegura que como máximo haya un panel abierto en 'container'.
function enforceSingleOpen(container, selector = ".panel") {
  if (!container) return;
  const openPanels = Array.from(container.querySelectorAll(`${selector}.open`));
  if (openPanels.length <= 1) return;
  openPanels.slice(1).forEach((p) => p.classList.remove("open"));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function labelWithStamp(it) {
  if (!it?.createdAt) return it.label || "";
  return `${it.label} | ${formatStamp(it.createdAt)}`;
}

function formatStamp(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return "";
  }
}
