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
  moveItem, // <- necesario para fijar orden en drop
  clearAll   // <- NUEVO
} from "./state.js";
import { enableDragAndDrop } from "./dragdrop.js";

// Elementos raíz
const listA = document.getElementById("listA");
const listB = document.getElementById("listB");
const histList = document.getElementById("histList");
const addBtn = document.getElementById("addBtn");
const input = document.getElementById("labelInput");
const countEl = document.getElementById("count");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const clearAllBtn = document.getElementById("clearAll"); // <- NUEVO

export function render() {
  // Limpiar
  listA.innerHTML = "";
  listB.innerHTML = "";
  histList.innerHTML = "";

  // Items
  const itemsA = state.items.filter((x) => x.where === "A");
  const itemsB = state.items.filter((x) => x.where === "B");

  for (const it of itemsA) listA.appendChild(renderItem(it));
  for (const it of itemsB) listB.appendChild(renderItem(it, true));

  // Historial (desplegable). El contenedor fuerza scroll vía CSS.
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

    // Click para desplegar/plegar con exclusión mutua dentro del historial
    head.addEventListener("click", () => {
      const willOpen = !panel.classList.contains("open");
      closePanelsIn(histList, ".hist-panel", panel); // cierra otros del historial
      panel.classList.toggle("open", willOpen);
    });

    card.append(head, panel);
    histList.appendChild(card);
  }

  // Asegura como máximo un panel abierto por marco al renderizar
  enforceSingleOpen(listA, ".panel");
  enforceSingleOpen(listB, ".panel");
  enforceSingleOpen(histList, ".hist-panel");

  countEl.textContent = state.items.length;

  // Activar DnD (listeners solo se atan una vez; el callback se actualiza cada render)
  enableDragAndDrop({ listA, listB, onDrop: onDragDrop });
}

function renderItem(it, inAlt = false) {
  const item = document.createElement("div");
  item.className = `item${inAlt ? " in-alt" : ""}`;
  item.dataset.id = String(it.id);
  item.setAttribute("draggable", "true"); // el contenedor es draggable
  item.innerHTML = `
    <div class="grab">◳</div>
    <button class="btn"></button>
    <div class="tools">
      <button class="tbtn up" title="Subir">↑</button>
      <button class="tbtn down" title="Bajar">↓</button>
      <button class="tbtn rename" title="Renombrar">✎</button>
      <button class="tbtn done" title="Marcar como resuelto">✔</button>
    </div>
    <div class="panel${it.open ? " open" : ""}"><textarea></textarea></div>
  `;

  const btn = item.querySelector(".btn");
  const panel = item.querySelector(".panel");
  const textarea = item.querySelector("textarea");
  btn.textContent = it.label;
  textarea.value = it.note || "";

  // Abrir/cerrar panel de notas con exclusión por lista (A o B)
  btn.addEventListener("click", () => {
    const container = item.parentElement; // listA o listB
    const willOpen = !panel.classList.contains("open");

    // Cierra cualquier otro panel abierto en la misma lista y actualiza estado
    closePanelsIn(container, ".panel", panel, (p) => {
      const otherItem = p.closest(".item");
      if (otherItem) updateItem(Number(otherItem.dataset.id), { open: false });
    });

    panel.classList.toggle("open", willOpen);
    updateItem(it.id, { open: willOpen });
  });

  // Renombrar (✎)
  item.querySelector(".rename").addEventListener("click", () => {
    const nuevo = prompt("Renombrar botón:", btn.textContent.trim());
    if (nuevo == null) return; // cancelado
    const nombre = nuevo.trim();
    if (!nombre) return;       // vacío -> no cambiamos
    updateItem(it.id, { label: nombre });
    render(); // refresca texto y conserva estado
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
  // Mover el ítem a 'where' e insertar en el índice indicado
  moveItem(Number(id), where, Number(index));
  render();
}

export function bindGlobalHandlers() {
  addBtn.addEventListener("click", () => {
    const label = input.value.trim();
    addItem(label);
    input.value = "";
    input.focus();
    render();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });

  exportBtn.addEventListener("click", () => exportJson());

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      await importJson(file);
      render();
    } catch (e) {
      alert("No se pudo importar: " + e.message);
    } finally {
      importInput.value = ""; // reset
    }
  });

  // Vaciar todo
  clearAllBtn?.addEventListener("click", () => {
    if (!confirm("¿Vaciar todo?")) return;
    clearAll();
    render();
  });
}

/* ================== Helpers ================== */

// Cierra todos los paneles de un contenedor, excepto 'exceptEl'.
// selector: ".panel" o ".hist-panel" según el caso.
// onClose(panel) opcional para sincronizar estado.
function closePanelsIn(container, selector, exceptEl, onClose) {
  if (!container) return;
  container.querySelectorAll(`${selector}.open`).forEach((p) => {
    if (p === exceptEl) return;
    p.classList.remove("open");
    onClose?.(p);
  });
}

// Asegura que como máximo haya un panel abierto en 'container' (con el selector dado).
function enforceSingleOpen(container, selector = ".panel") {
  if (!container) return;
  const openPanels = Array.from(container.querySelectorAll(`${selector}.open`));
  if (openPanels.length <= 1) return;
  // Deja abierto solo el primero
  openPanels.slice(1).forEach((p) => p.classList.remove("open"));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(); // usa la configuración local del navegador
  } catch {
    return "";
  }
}
