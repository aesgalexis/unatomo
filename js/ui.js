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
  sendToOrbit,   // <-- NUEVO
  landDueOrbits, // <-- NUEVO
} from "./state.js";
import { enableDragAndDrop } from "./dragdrop.js";

// Límites por marco
const MAX_A = 8;
const MAX_B = 16;
const HISTORY_MAX = 16; // debe coincidir con state.js

const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Elementos raíz
const listL = document.getElementById("listL"); // Landing
const listA = document.getElementById("listA");
const listB = document.getElementById("listB");
const histList = document.getElementById("histList");
const addBtn = document.getElementById("addBtn");
const input = document.getElementById("labelInput");
const countEl = document.getElementById("count");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const clearAllBtn = document.getElementById("clearAll");

// Títulos de marcos
const frameATitle = document.querySelector("#frameA h2");
const frameBTitle = document.querySelector("#frameB h2");
const histTitle  = document.querySelector(".historial h2");
const frameL = document.querySelector("#frameL"); // <-- NUEVO (para glow violeta)

// Timer de aterrizaje periódico
let orbitTimer = null;

export function render() {
  // Limpiar
  if (listL) listL.innerHTML = "";
  listA.innerHTML = "";
  listB.innerHTML = "";
  histList.innerHTML = "";

  // Items por marco
  const itemsL = state.items.filter((x) => x.where === "L");
  const itemsA = state.items.filter((x) => x.where === "A");
  const itemsB = state.items.filter((x) => x.where === "B");

  // Pintar
  for (const it of itemsL) listL?.appendChild(renderItem(it, true)); // estilo discreto
  for (const it of itemsA) listA.appendChild(renderItem(it));
  for (const it of itemsB) listB.appendChild(renderItem(it, true));

  // Historial (desplegable)
  for (const h of state.history) {
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
    note.textContent = hasNote ? h.note : "(sin nota)";

    panel.append(meta, note);

    // Exclusión mutua dentro del historial
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
  if (histTitle)  histTitle.textContent  = `History (${state.history.length}/${HISTORY_MAX})`;

  // Estado visual de Landing (glow violeta si contiene elementos)
  if (frameL) frameL.classList.toggle("has-items", itemsL.length > 0); // <-- NUEVO

  // Desactivar/activar +Crear según límite A
  if (addBtn) addBtn.disabled = itemsA.length >= MAX_A;

  // Exclusión: un panel abierto por zona
  enforceSingleOpen(listL, ".panel");
  enforceSingleOpen(listA, ".panel");
  enforceSingleOpen(listB, ".panel");
  enforceSingleOpen(histList, ".hist-panel");

  // Total abajo (suma de Main + Side; Landing no suma)
  countEl.textContent = String(itemsA.length + itemsB.length);

  // Activar DnD: A y B aceptan drop; L solo permite iniciar drag (dragdrop.js lo maneja)
  enableDragAndDrop({ listA, listB, listL, onDrop: onDragDrop }); // <-- PASO listL
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
      <button class="tbtn up" title="Subir">↑</button>
      <button class="tbtn down" title="Bajar">↓</button>
      <button class="tbtn rename" title="Renombrar">✎</button>
      <!-- ⬇️ renombrado: orbit -> orbit-btn y cambiamos icono a ≫ -->
      <button class="tbtn orbit-btn" title="Send to orbit" aria-label="Send to orbit">≫</button>
      <button class="tbtn done" title="Marcar como resuelto">✔</button>
    </div>
    <div class="panel${it.open ? " open" : ""}">
      <textarea placeholder="Write something.."></textarea>
    </div>
  `;

  const btn = item.querySelector(".btn");
  const panel = item.querySelector(".panel");
  const textarea = item.querySelector("textarea");

  btn.textContent = labelWithStamp(it);
  textarea.value = it.note || "";

  // Abrir/cerrar panel de notas con exclusión por lista
  btn.addEventListener("click", () => {
    const container = item.parentElement; // listL, listA o listB
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

  // Enviar a órbita (≫)
  item.querySelector(".orbit-btn").addEventListener("click", () => {
    const raw = prompt("¿En cuántos minutos debe volver este Attomic Button?", "5");
    if (raw == null) return; // cancelado
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      alert("Introduce un número de minutos válido (> 0).");
      return;
    }
    sendToOrbit(it.id, minutes);
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
  // Capacidad actual del destino (excluyendo el propio ítem si ya está ahí)
  const numId = Number(id);
  const destItemsExcludingSelf = state.items.filter(
    (x) => x.where === where && x.id !== numId
  );
  const capacity = where === "A" ? MAX_A : MAX_B;

  if (destItemsExcludingSelf.length >= capacity) {
    return;
  }
  moveItem(numId, where, Number(index));
  render();
}

export function bindGlobalHandlers() {
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
      await importJson(file); // esto ya aterriza vencidos
      render();
    } catch (e) {
      alert("No se pudo importar: " + e.message);
    } finally {
      importInput.value = ""; // reset
    }
  });

  // Vaciar todo
  clearAllBtn?.addEventListener("click", () => {
    if (!confirm("¿Clear all?")) return;
    clearAll();
    render();
  });

  // Aterrizaje inmediato al arrancar (por si hay pendientes)
  if (landDueOrbits() > 0) render();

  // Timer de comprobación periódica (cada 15s)
  if (orbitTimer) clearInterval(orbitTimer);
  orbitTimer = setInterval(() => {
    if (landDueOrbits() > 0) render();
  }, 15000);
}

/* ================== Helpers ================== */

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

// Texto del botón: nombre + sello temporal (si existe)
function labelWithStamp(it) {
  if (!it?.createdAt) return it.label || "";
  return `${it.label} — ${formatStamp(it.createdAt)}`;
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
