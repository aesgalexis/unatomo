// Drag & Drop entre marcos (A/B aceptan drop; L solo origen)
// Reordena "en vivo" moviendo el propio .dragging en dragover.

let dropCallback = null;
let draggingId = null;

function getDragAfterElement(container, y) {
  // Devuelve el elemento delante del cual deberíamos insertar
  const els = [...container.querySelectorAll(".item")].filter(
    el => !el.classList.contains("dragging")
  );
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const child of els) {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  }
  return closest.element;
}

function bindZone(zoneEl, listEl, whereKey, dropEnabled = true) {
  if (!zoneEl || !listEl) return;
  if (zoneEl.dataset.dndBound === "1") return;
  zoneEl.dataset.dndBound = "1";

  if (!listEl.style.minHeight) listEl.style.minHeight = "32px";

  // Iniciar arrastre
  zoneEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    draggingId = item.dataset.id;
    try { e.dataTransfer.setData("text/plain", draggingId); } catch {}
    e.dataTransfer.effectAllowed = "move";
    item.classList.add("dragging");
  });

  // Fin arrastre
  zoneEl.addEventListener("dragend", (e) => {
    const item = e.target.closest(".item");
    if (item) item.classList.remove("dragging");
    draggingId = null;
  });

  if (!dropEnabled) return; // En Landing no aceptamos drop

  // Reordenado "en vivo"
  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

    const draggingEl = listEl.querySelector(".item.dragging") || document.querySelector(".item.dragging");
    if (!draggingEl) return;

    const after = getDragAfterElement(listEl, e.clientY);
    if (after == null) {
      listEl.appendChild(draggingEl);
    } else {
      listEl.insertBefore(draggingEl, after);
    }
  });

  // Soltar: calcular índice exacto
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
    if (!id) return;

    const draggingEl = listEl.querySelector(".item.dragging") || document.querySelector(".item.dragging");
    const items = [...listEl.querySelectorAll(".item")];

    // Índice = posición del arrastrado en el DOM (nº de hermanos anteriores)
    let index = items.indexOf(draggingEl);
    if (index < 0) index = items.length; // fallback

    if (typeof dropCallback === "function") {
      dropCallback({ id, where: whereKey, index });
    }
    // dragend quitará la clase .dragging
  });
}

export function enableDragAndDrop({ listL, listA, listB, onDrop }) {
  dropCallback = onDrop;

  const frameA = listA?.closest?.(".frame") || listA;
  const frameB = listB?.closest?.(".frame") || listB;
  const frameL = listL?.closest?.(".frame") || listL;

  // A y B: arrastrar y soltar (en lista y marco para zona amplia)
  if (listA) {
    bindZone(listA, listA, "A", true);
    if (frameA && frameA !== listA) bindZone(frameA, listA, "A", true);
  }
  if (listB) {
    bindZone(listB, listB, "B", true);
    if (frameB && frameB !== listB) bindZone(frameB, listB, "B", true);
  }

  // L (Landing): solo fuente (no drop)
  if (listL) {
    bindZone(listL, listL, "L", false);
    if (frameL && frameL !== listL) bindZone(frameL, listL, "L", false);
  }
}
