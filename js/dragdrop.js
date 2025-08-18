// Drag & Drop entre marcos con placeholder y zonas ampliadas (lista + marco)
// Soporta arrastrar DESDE Landing, pero NO permite soltar en Landing.

let dropCallback = null;
let draggingId = null;
let placeholder = null;

function ensurePlaceholder() {
  if (placeholder) return placeholder;
  const el = document.createElement("div");
  el.className = "dnd-placeholder";
  el.style.height = "44px";
  el.style.border = "1px dashed var(--outline)";
  el.style.borderRadius = "8px";
  el.style.margin = "4px 0";
  el.style.opacity = "0.8";
  return (placeholder = el);
}

function removePlaceholder() {
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.removeChild(placeholder);
  }
}

function getDragAfterElement(container, y) {
  // Excluye el que arrastras
  const els = [...container.querySelectorAll(".item")].filter(
    (el) => !el.classList.contains("dragging")
  );
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const child of els) {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  }
  return closest.element;
}

/* --------- Solo fuente de arrastre (dragstart/dragend) --------- */
function bindDragSource(zoneEl) {
  if (!zoneEl || zoneEl.dataset.dndSrcBound === "1") return;
  zoneEl.dataset.dndSrcBound = "1";

  zoneEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    draggingId = item.dataset.id;
    try { e.dataTransfer.setData("text/plain", draggingId); } catch {}
    e.dataTransfer.effectAllowed = "move";
    item.classList.add("dragging");
  });

  zoneEl.addEventListener("dragend", (e) => {
    const item = e.target.closest(".item");
    if (item) item.classList.remove("dragging");
    draggingId = null;
    removePlaceholder();
  });
}

/* --------- Zona de drop (enter/over/drop) --------- */
function bindDropZone(zoneEl, listEl, whereKey) {
  if (!zoneEl || zoneEl.dataset.dndDropBound === "1") return;
  zoneEl.dataset.dndDropBound = "1";

  // Para facilitar el drop en listas vacías
  if (!listEl.style.minHeight) listEl.style.minHeight = "32px";

  zoneEl.addEventListener("dragenter", (e) => {
    e.preventDefault();
    if (!draggingId) return;
    const ph = ensurePlaceholder();
    if (!listEl.contains(ph)) listEl.appendChild(ph);
  });

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (!draggingId) return;

    const ph = ensurePlaceholder();
    const after = getDragAfterElement(listEl, e.clientY);
    if (after) listEl.insertBefore(ph, after);
    else listEl.appendChild(ph);
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const id =
      (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
    if (!id) return;

    const ph = ensurePlaceholder();
    const children = [...listEl.querySelectorAll(".item")].filter(
      (el) => !el.classList.contains("dragging")
    );

    // Índice destino = número de .item antes del placeholder
    let index = children.length;
    if (ph && listEl.contains(ph)) {
      const all = [...listEl.children];
      index = 0;
      for (let i = 0; i < all.length; i++) {
        if (all[i] === ph) break;
        if (all[i].classList && all[i].classList.contains("item")) index++;
      }
    }

    if (typeof dropCallback === "function") {
      dropCallback({ id, where: whereKey, index });
    }
    removePlaceholder();
  });
}

/* --------- API --------- */
export function enableDragAndDrop({ listL, listA, listB, onDrop }) {
  dropCallback = onDrop; // actualizar callback en cada render

  // Zonas de drop: listas + marcos contenedores (A y B solamente)
  const frameA = listA?.closest(".frame") || listA;
  const frameB = listB?.closest(".frame") || listB;

  // Fuentes de arrastre (se puede empezar a arrastrar desde L, A, B)
  if (listL) bindDragSource(listL);
  if (listA) bindDragSource(listA);
  if (listB) bindDragSource(listB);

  // Habilitar DROP en A y B
  if (listA) {
    bindDropZone(listA, listA, "A");
    if (frameA && frameA !== listA) bindDropZone(frameA, listA, "A");
  }
  if (listB) {
    bindDropZone(listB, listB, "B");
    if (frameB && frameB !== listB) bindDropZone(frameB, listB, "B");
  }

  // IMPORTANTE: NO se llama bindDropZone para Landing (listL)
  // => Se puede arrastrar DESDE L, pero no soltar EN L.
}
