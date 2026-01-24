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

export const initDragAndDrop = (listEl, getMachines, setMachinesAndPersist, rerender) => {
  let draggedId = null;

  listEl.addEventListener("dragstart", (event) => {
    const handle = event.target.closest(".mc-drag-handle");
    if (!handle) return;
    const card = handle.closest(".machine-card");
    if (!card) return;

    draggedId = card.dataset.machineId;
    event.dataTransfer.setData("text/plain", draggedId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("is-dragging");
  });

  listEl.addEventListener("dragend", () => {
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (dragging) dragging.classList.remove("is-dragging");
    listEl.querySelectorAll(".machine-card.is-over").forEach((node) => {
      node.classList.remove("is-over");
    });
    draggedId = null;
  });

  listEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const card = event.target.closest(".machine-card");
    if (card) {
      listEl.querySelectorAll(".machine-card.is-over").forEach((node) => {
        if (node !== card) node.classList.remove("is-over");
      });
      card.classList.add("is-over");
    }

    const afterElement = getDragAfterElement(listEl, event.clientY);
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (!dragging) return;
    if (afterElement == null) {
      listEl.appendChild(dragging);
    } else {
      listEl.insertBefore(dragging, afterElement);
    }
  });

  listEl.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedId) return;
    const order = [...listEl.querySelectorAll(".machine-card")]
      .map((card) => card.dataset.machineId)
      .filter(Boolean);
    const current = getMachines();
    const next = order
      .map((id) => current.find((machine) => machine.id === id))
      .filter(Boolean);
    setMachinesAndPersist(next);
    rerender();
  });
};
