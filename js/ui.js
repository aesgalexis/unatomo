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

  // Historial
  for (const h of state.history) {
    const el = document.createElement("div");
    el.className = "hist-item";
    el.textContent = h.label;
    histList.appendChild(el);
  }

  countEl.textContent = state.items.length;

  // Activar DnD (listeners solo se atan una vez; el callback se actualiza cada render)
  enableDragAndDrop({ listA, listB, onDrop: onDragDrop });
}

function renderItem(it, inAlt = false) {
  const item = document.createElement("div");
  item.className = `item${inAlt ? " in-alt" : ""}`;
  item.dataset.id = String(it.id);
  item.innerHTML = `
    <div class="grab" draggable="true">◳</div>
    <button class="btn"></button>
    <div class="tools">
      <button class="tbtn up" title="Subir">↑</button>
      <button class="tbtn down" title="Bajar">↓</button>
      <button class="tbtn done" title="Marcar como resuelto">✔</button>
    </div>
    <div class="panel${it.open ? " open" : ""}"><textarea></textarea></div>
  `;

  const btn = item.querySelector(".btn");
  const panel = item.querySelector(".panel");
  const textarea = item.querySelector("textarea");
  btn.textContent = it.label;
  textarea.value = it.note || "";

  // Eventos
  btn.addEventListener("click", () => {
    const open = !panel.classList.contains("open");
    panel.classList.toggle("open", open);
    updateItem(it.id, { open });
  });

  textarea.addEventListener("input", () => {
    updateItem(it.id, { note: textarea.value });
  });

  item.querySelector(".up").addEventListener("click", () => {
    moveBy(it.id, -1);
    render();
  });

  item.querySelector(".down").addEventListener("click", () => {
    moveBy(it.id, 1);
    render();
  });

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
}
