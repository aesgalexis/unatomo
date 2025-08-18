// DnD robusto con delegación y protección contra doble binding.
// Permite iniciar arrastre desde .grab o cualquier hijo de .item.
// Calcula índice correcto incluso con listas vacías.

let dropCallback = null;
let draggingId = null;

export function enableDragAndDrop({ listA, listB, onDrop }) {
  dropCallback = onDrop; // actualizamos la referencia en cada render

  for (const list of [listA, listB]) {
    if (list.dataset.dndBound === "1") continue; // evita listeners duplicados
    list.dataset.dndBound = "1";

    // dragstart: aceptar arrastre desde .grab o cualquier parte del .item
    list.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".item");
      if (!item) return;
      draggingId = item.dataset.id;
      try {
        e.dataTransfer.setData("text/plain", draggingId);
      } catch {}
      e.dataTransfer.effectAllowed = "move";
      item.classList.add("dragging");
    });

    // dragend: limpiar clases/estado
    list.addEventListener("dragend", (e) => {
      const item = e.target.closest(".item");
      if (item) item.classList.remove("dragging");
      draggingId = null;
    });

    // dragover: necesario para permitir drop
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    });

    // drop: calcular índice y notificar
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      const id =
        (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
      if (!id) return;

      const after = getDragAfterElement(list, e.clientY);
      const items = [...list.querySelectorAll(".item")];

      // Índice destino: si hay "after", insertamos antes de él.
      // Si no hay, insertamos al final.
      const index = after ? items.indexOf(after) : items.length;

      const where = list.id === "listA" ? "A" : "B";
      if (typeof dropCallback === "function") {
        dropCallback({ id, where, index });
      }
    });
  }
}

function getDragAfterElement(container, y) {
  // Buscar el elemento más cercano por encima del cursor
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
