// Drag & Drop entre marcos con placeholder y zonas ampliadas (lista + marco)
// Permite soltar en A y B. En L (Landing) solo deja "arrastrar DESDE", no soltar.

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
  // Excluir el que está arrastrándose
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

function bindZone(zoneEl, listEl, whereKey, dropEnabled = true) {
  if (!zoneEl || !listEl) return;

  // Facilidad para soltar en listas vacías
  if (!listEl.style.minHeight) listEl.style.minHeight = "32px";

  if (zoneEl.dataset.dndBound === "1") return;
  zoneEl.dataset.dndBound = "1";

  // --- Arranque / fin del drag: siempre activos para poder iniciar desde cualquier zona
  zoneEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    draggingId = item.dataset.id;
    try {
      e.dataTransfer.setData("text/plain", draggingId);
    } catch {}
    e.dataTransfer.effectAllowed = "move";
    item.classList.add("dragging");
  });

  zoneEl.addEventListener("dragend", (e) => {
    const item = e.target.closest(".item");
    if (item) item.classList.remove("dragging");
    draggingId = null;
    removePlaceholder();
  });

  if (!dropEnabled) return; // ← En Landing NO habilitamos drop

  // --- Drag dentro de la zona (lista o marco): el placeholder SIEMPRE va en la lista real (listEl)
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
    // ID del que arrastramos
    const id =
      (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
    if (!id) return;

    // Índice destino = nº de .item (no .dragging) antes del placeholder
    let index = 0;
    if (placeholder && listEl.contains(placeholder)) {
      const nodes = [...listEl.children];
      for (const n of nodes) {
        if (n === placeholder) break;
        if (n.classList && n.classList.contains("item") && !n.classList.contains("dragging")) {
          index++;
        }
      }
    } else {
      // Si por lo que sea no hay placeholder, caemos al final
      index = [...listEl.querySelectorAll(".item")].filter(
        (el) => !el.classList.contains("dragging")
      ).length;
    }

    removePlaceholder();

    if (typeof dropCallback === "function") {
      dropCallback({ id, where: whereKey, index });
    }
  });
}

export function enableDragAndDrop({ listL, listA, listB, onDrop }) {
  dropCallback = onDrop; // actualizar callback en cada render

  // Marcos para ampliar drop
  const frameA = listA?.closest?.(".frame") || listA;
  const frameB = listB?.closest?.(".frame") || listB;
  const frameL = listL?.closest?.(".frame") || listL;

  // A y B: arrastrar y soltar (lista + marco)
  if (listA) {
    bindZone(listA, listA, "A", true);
    if (frameA && frameA !== listA) bindZone(frameA, listA, "A", true);
  }
  if (listB) {
    bindZone(listB, listB, "B", true);
    if (frameB && frameB !== listB) bindZone(frameB, listB, "B", true);
  }

  // L (Landing): solo arrastrar DESDE L. (dropEnabled=false)
  if (listL) {
    bindZone(listL, listL, "L", false);
    if (frameL && frameL !== listL) bindZone(frameL, listL, "L", false);
  }
}
