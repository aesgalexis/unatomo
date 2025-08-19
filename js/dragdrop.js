// Drag & Drop entre marcos SIN placeholder (previsualiza moviendo el .dragging)
// Permite soltar en A y B. En L (Landing) solo deja "arrastrar DESDE", no soltar.

let dropCallback = null;
let draggingId = null;

function getDragAfterElement(container, y) {
  // Todos los items salvo el que arrastro
  const els = [...container.querySelectorAll(".item")].filter(
    (el) => !el.classList.contains("dragging")
  );
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const el of els) {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: el };
    }
  }
  return closest.element;
}

function bindZone(zoneEl, listEl, whereKey, dropEnabled = true) {
  if (!zoneEl || !listEl) return;

  // Para facilitar el drop en listas vacías
  if (!listEl.style.minHeight) listEl.style.minHeight = "32px";

  if (zoneEl.dataset.dndBound === "1") return;
  zoneEl.dataset.dndBound = "1";

  // Iniciar arrastre desde la zona (lista o marco)
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
  });

  if (!dropEnabled) return; // ← En Landing NO habilitamos drop

  zoneEl.addEventListener("dragenter", (e) => {
    // necesario para permitir drop
    e.preventDefault();
  });

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

    const dragging = document.querySelector(".item.dragging");
    if (!dragging) return;

    const after = getDragAfterElement(listEl, e.clientY);
    if (after == null) {
      listEl.appendChild(dragging);
      // Si arrastro cerca del final, aseguro poder llegar al fondo
      listEl.scrollTop = listEl.scrollHeight;
    } else {
      listEl.insertBefore(dragging, after);
    }
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const dragging = document.querySelector(".item.dragging");
    if (!dragging) return;

    const id =
      (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
    if (!id) return;

    // Índice real: posición actual del .dragging en la lista destino
    const items = [...listEl.querySelectorAll(".item")];
    const index = items.indexOf(dragging);

    if (typeof dropCallback === "function") {
      dropCallback({ id, where: whereKey, index });
    }
  });
}

export function enableDragAndDrop({ listL, listA, listB, onDrop }) {
  dropCallback = onDrop;

  // Marcos para ampliar zona de drop (usamos el frame como "zona", pero insertamos en la lista real)
  const frameA = listA?.closest?.(".frame") || listA;
  const frameB = listB?.closest?.(".frame") || listB;
  const frameL = listL?.closest?.(".frame") || listL;

  // A y B: arrastrar + soltar
  if (listA) {
    bindZone(listA, listA, "A", true);
    if (frameA && frameA !== listA) bindZone(frameA, listA, "A", true);
  }
  if (listB) {
    bindZone(listB, listB, "B", true);
    if (frameB && frameB !== listB) bindZone(frameB, listB, "B", true);
  }

  // L (Landing): solo arrastrar DESDE L (dropEnabled=false)
  if (listL) {
    bindZone(listL, listL, "L", false);
    if (frameL && frameL !== listL) bindZone(frameL, listL, "L", false);
  }
}
