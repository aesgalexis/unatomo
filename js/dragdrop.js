// Drag & Drop robusto con placeholder visual y delegación.
// Funciona entre listas (A <-> B) y reordena con índice preciso.

let dropCallback = null;
let draggingId = null;
let placeholder = null;

// Crea (una vez) un placeholder que abre hueco al arrastrar
function ensurePlaceholder() {
  if (placeholder) return placeholder;
  const el = document.createElement("div");
  el.className = "dnd-placeholder";
  // Estilo inline para no tocar CSS global
  el.style.height = "44px";
  el.style.border = "1px dashed var(--outline)";
  el.style.borderRadius = "8px";
  el.style.margin = "4px 0";
  el.style.opacity = "0.8";
  return (placeholder = el);
}

export function enableDragAndDrop({ listA, listB, onDrop }) {
  dropCallback = onDrop; // Actualiza la referencia a cada render

  for (const list of [listA, listB]) {
    if (list.dataset.dndBound === "1") continue; // evita duplicar listeners
    list.dataset.dndBound = "1";

    // dragstart: iniciamos arrastre desde cualquier .item (no solo asa)
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

    // dragend: limpieza
    list.addEventListener("dragend", (e) => {
      const item = e.target.closest(".item");
      if (item) item.classList.remove("dragging");
      draggingId = null;
      removePlaceholder();
    });

    // dragenter: mostrar placeholder aunque la lista esté vacía
    list.addEventListener("dragenter", (e) => {
      e.preventDefault();
      if (!draggingId) return;
      const ph = ensurePlaceholder();
      if (!list.contains(ph)) list.appendChild(ph);
    });

    // dragover: necesario para permitir drop + mover placeholder
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      if (!draggingId) return;

      const after = getDragAfterElement(list, e.clientY);
      const ph = ensurePlaceholder();

      if (after) {
        list.insertBefore(ph, after);
      } else {
        list.appendChild(ph);
      }
    });

    // drop: calcular índice destino y notificar
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      const id =
        (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggingId;
      if (!id) return;

      const ph = ensurePlaceholder();
      const children = [...list.querySelectorAll(".item")].filter(
        (el) => !el.classList.contains("dragging")
      );

      // Índice = posición del placeholder entre los items visibles
      let index = children.length; // por defecto, final
      if (ph && list.contains(ph)) {
        const all = [...list.children];
        index = all.indexOf(ph);
        // el índice está entre todos los childNodes; ajústalo a contar solo .item
        index = Math.min(
          children.length,
          Math.max(
            0,
            children.findIndex((el, i) => list.children[i] === ph) // intento directo
          )
        );
        // Si no se encontró por el método anterior, volvemos a calcular manualmente
        if (index < 0) {
          index = 0;
          for (let i = 0; i < all.length; i++) {
            if (all[i] === ph) break;
            if (all[i].classList && all[i].classList.contains("item")) index++;
          }
        }
      }

      const where = list.id === "listA" ? "A" : "B";
      if (typeof dropCallback === "function") {
        dropCallback({ id, where, index });
      }
      removePlaceholder();
    });

    // Si sales con el ratón, no quites el placeholder (ayuda visual),
    // se quita en drop/dragend. Pero evitamos fugas si el usuario suelta fuera.
    list.addEventListener("dragleave", () => {
      // No hacemos nada para que el hueco siga; se limpia en drop o dragend.
    });
  }
}

function removePlaceholder() {
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.removeChild(placeholder);
  }
}

function getDragAfterElement(container, y) {
  // Excluir el que se está arrastrando y el placeholder
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
