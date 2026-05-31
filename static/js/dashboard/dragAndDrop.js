const getDragAfterElement = (container, y) => {
  const items = [...container.children].filter((child) => {
    if (child.classList.contains("machine-drop-placeholder")) return false;
    const card = child.classList.contains("machine-card")
      ? child
      : child.querySelector?.(".machine-card");
    return card && !card.classList.contains("is-dragging");
  });
  return items.reduce(
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

const getDragItem = (card) => card?.closest(".machine-card-wrap") || card;

const getDropBody = (listEl, target) =>
  target.closest?.(".machine-group-body") || listEl;

const getDirectCardOrder = (container) =>
  [...container.children]
    .map((child) =>
      child.classList.contains("machine-card")
        ? child
        : child.classList.contains("machine-card-wrap")
          ? child.querySelector(".machine-card")
          : null
    )
    .filter(Boolean)
    .map((card) => card.dataset.machineId)
    .filter(Boolean);

const isCenterCardDrop = (event, card) => {
  if (!card) return false;
  const box = card.getBoundingClientRect();
  const y = event.clientY - box.top;
  return y > box.height * 0.28 && y < box.height * 0.72;
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

export const initGroupedDragAndDrop = (listEl, callbacks = {}) => {
  let draggedId = null;
  let placeholder = null;
  let centerTargetCard = null;

  const clearCenterTarget = () => {
    if (centerTargetCard) centerTargetCard.classList.remove("is-drop-target");
    centerTargetCard = null;
  };

  listEl.addEventListener("dragstart", (event) => {
    if (event.target.closest("button, input, select, textarea, a, option")) {
      event.preventDefault();
      return;
    }
    const card = event.target.closest(".machine-card");
    if (!card || card.draggable === false) return;

    draggedId = card.dataset.machineId;
    event.dataTransfer.setData("text/plain", draggedId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("is-dragging");

    const item = getDragItem(card);
    placeholder = document.createElement("div");
    placeholder.className = "machine-drop-placeholder";
    placeholder.style.height = `${item.offsetHeight}px`;
  });

  listEl.addEventListener("dragend", () => {
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (dragging) dragging.classList.remove("is-dragging");
    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    clearCenterTarget();
    placeholder = null;
    draggedId = null;
  });

  listEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    if (!dragging || !placeholder) return;
    const targetCard = event.target.closest(".machine-card");
    if (targetCard && targetCard.dataset.machineId !== draggedId && isCenterCardDrop(event, targetCard)) {
      if (centerTargetCard !== targetCard) {
        clearCenterTarget();
        centerTargetCard = targetCard;
        centerTargetCard.classList.add("is-drop-target");
      }
    } else {
      clearCenterTarget();
    }
    const body = getDropBody(listEl, event.target);
    const afterElement = getDragAfterElement(body, event.clientY);
    if (afterElement == null) body.appendChild(placeholder);
    else body.insertBefore(placeholder, afterElement);
  });

  listEl.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedId) return;
    const dragging = listEl.querySelector(".machine-card.is-dragging");
    const dragItem = getDragItem(dragging);
    const targetCard = centerTargetCard || event.target.closest(".machine-card");
    const targetId = targetCard?.dataset.machineId || "";

    if (targetId && targetId !== draggedId && (targetCard === centerTargetCard || isCenterCardDrop(event, targetCard))) {
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      clearCenterTarget();
      callbacks.onDropOnCard?.(draggedId, targetId);
      return;
    }

    const body = placeholder?.parentNode || getDropBody(listEl, event.target);
    if (dragItem && placeholder && body) {
      body.insertBefore(dragItem, placeholder);
      placeholder.remove();
    }
    const group = body.closest?.(".machine-group");
    const groupId = group?.dataset.groupId || "";
    const order = getDirectCardOrder(body);
    clearCenterTarget();
    callbacks.onReorder?.(groupId, order);
  });
};
