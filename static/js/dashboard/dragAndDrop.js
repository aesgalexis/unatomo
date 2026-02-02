const getDragAfterElement = (container, y) => {
  const cards = [...container.querySelectorAll(".machine-card:not(.is-dragging)")];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
};

export const initDragAndDrop = (listEl, onReorder) => {
  let draggedId = null;
  let placeholder = null;

  listEl.addEventListener("dragstart", (event) => {
    if (event.target.closest("button, input, select, textarea, a, option")) {
      event.preventDefault();
      return;
    }
    const card = event.target.closest(".machine-card");
    if (!card) return;
    if (card.draggable === false) {
      event.preventDefault();
      return;
    }

    draggedId = card.dataset.machineId;
    event.dataTransfer.setData("text/plain", draggedId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("is-dragging");

    placeholder = document.createElement("div");
    placeholder.className = "machine-drop-placeholder";
    placeholder.style.height = `${card.offsetHeight}px`;
  });

  listEl.addEventListener("dragend", () => {
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (dragging) dragging.classList.remove("is-dragging");
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;
    draggedId = null;
  });

  listEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const afterElement = getDragAfterElement(listEl, event.clientY);
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (!dragging) return;
    if (placeholder) {
      if (afterElement == null) {
        listEl.appendChild(placeholder);
      } else {
        listEl.insertBefore(placeholder, afterElement);
      }
    }
  });

  listEl.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedId) return;
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (dragging && placeholder) {
      listEl.insertBefore(dragging, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }
    const order = [...listEl.querySelectorAll(".machine-card")]
      .map((card) => card.dataset.machineId)
      .filter(Boolean);
    if (onReorder) onReorder(order);
  });
};
