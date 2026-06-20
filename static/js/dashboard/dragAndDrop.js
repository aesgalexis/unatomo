const getDragAfterElement = (container, y) => {
  const items = getDirectDragItems(container).filter((child) => {
    if (child.classList.contains("machine-drop-placeholder")) return false;
    return !child.classList.contains("is-dragging") && !child.querySelector?.(":scope > .is-dragging");
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

const getDirectDragItems = (container) =>
  [...container.children].filter((child) =>
    child.classList.contains("machine-card") ||
    child.classList.contains("machine-card-wrap") ||
    child.classList.contains("machine-group") ||
    child.classList.contains("machine-drop-placeholder")
  );

const getDropBody = (listEl, target) =>
  target.closest?.(".machine-group-body") || listEl;

const getTargetGroup = (target) => target.closest?.(".machine-group") || null;

const isDraggingSubgroup = (dragging) =>
  !!dragging?.classList?.contains("machine-subgroup");

const getGroupDropBody = (listEl, target, dragging, event) => {
  const body = target.closest?.(".machine-group-body") || null;
  if (!body) return listEl;
  const ownerGroup = body.closest?.(".machine-group");
  if (isDraggingSubgroup(dragging) && ownerGroup && ownerGroup.contains(dragging)) {
    const box = body.getBoundingClientRect();
    if (event.clientX < box.left + 24) return listEl;
  }
  return body;
};

const getDirectCardOrder = (container) =>
  getDirectDragItems(container)
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

const getDirectItemOrder = (container) =>
  getDirectDragItems(container)
    .filter((child) => !child.classList.contains("machine-drop-placeholder"))
    .map((child) => {
      if (child.classList.contains("machine-group")) {
        return { type: "group", id: child.dataset.groupId || "" };
      }
      const card = child.classList.contains("machine-card")
        ? child
        : child.querySelector(":scope > .machine-card");
      return { type: "machine", id: card?.dataset.machineId || "" };
    })
    .filter((item) => item.id);

const isCenterCardDrop = (event, card) => {
  if (!card) return false;
  const box = card.getBoundingClientRect();
  const y = event.clientY - box.top;
  return y > box.height * 0.28 && y < box.height * 0.72;
};

const isCenterGroupDrop = (event, group) => {
  if (!group) return false;
  const header = group.querySelector(":scope > .machine-group-header");
  const box = (header || group).getBoundingClientRect();
  const y = event.clientY - box.top;
  return y > box.height * 0.2 && y < box.height * 0.8;
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
  let draggedType = "";
  let placeholder = null;
  let centerTargetCard = null;
  let centerTargetGroup = null;

  const clearCenterTarget = () => {
    if (centerTargetCard) centerTargetCard.classList.remove("is-drop-target");
    if (centerTargetGroup) centerTargetGroup.classList.remove("is-drop-target");
    centerTargetCard = null;
    centerTargetGroup = null;
  };

  listEl.addEventListener("dragstart", (event) => {
    if (event.target.closest("button, input, select, textarea, a, option")) {
      event.preventDefault();
      return;
    }
    const header = event.target.closest(".machine-group-header");
    const group = header?.closest(".machine-group");
    if (group) {
      draggedId = group.dataset.groupId || "";
      draggedType = "group";
      event.dataTransfer.setData("text/plain", draggedId);
      event.dataTransfer.effectAllowed = "move";
      group.classList.add("is-dragging");

      placeholder = document.createElement("div");
      placeholder.className = "machine-drop-placeholder machine-group-placeholder";
      placeholder.style.height = `${group.offsetHeight}px`;
      return;
    }

    const card = event.target.closest(".machine-card");
    if (!card || card.draggable === false) return;

    draggedId = card.dataset.machineId;
    draggedType = "machine";
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
    const draggingGroup = listEl.querySelector(".machine-group.is-dragging");
    if (draggingGroup) draggingGroup.classList.remove("is-dragging");
    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    clearCenterTarget();
    placeholder = null;
    draggedId = null;
    draggedType = "";
  });

  listEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = draggedType === "group"
      ? listEl.querySelector(".machine-group.is-dragging")
      : listEl.querySelector(".machine-card.is-dragging");
    if (!dragging || !placeholder) return;
    const targetGroup = getTargetGroup(event.target);
    const targetCard = draggedType === "machine" ? event.target.closest(".machine-card") : null;
    if (
      draggedType === "group" &&
      !isDraggingSubgroup(dragging) &&
      targetGroup &&
      targetGroup.dataset.groupId !== draggedId &&
      isCenterGroupDrop(event, targetGroup)
    ) {
      if (centerTargetGroup !== targetGroup) {
        clearCenterTarget();
        centerTargetGroup = targetGroup;
        centerTargetGroup.classList.add("is-drop-target");
      }
      return;
    }
    if (targetCard && targetCard.dataset.machineId !== draggedId && isCenterCardDrop(event, targetCard)) {
      if (centerTargetCard !== targetCard) {
        clearCenterTarget();
        centerTargetCard = targetCard;
        centerTargetCard.classList.add("is-drop-target");
      }
    } else {
      clearCenterTarget();
    }
    if (draggedType === "group") {
      const body = isDraggingSubgroup(dragging)
        ? listEl
        : getGroupDropBody(listEl, event.target, dragging, event);
      const parentGroup = body.closest?.(".machine-group");
      if (parentGroup?.dataset.parentGroupId) return;
      const afterElement = getDragAfterElement(body, event.clientY);
      if (afterElement == null) body.appendChild(placeholder);
      else body.insertBefore(placeholder, afterElement);
      return;
    }
    const body = getDropBody(listEl, event.target);
    const afterElement = getDragAfterElement(body, event.clientY);
    if (afterElement == null) body.appendChild(placeholder);
    else body.insertBefore(placeholder, afterElement);
  });

  listEl.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedId) return;
    if (draggedType === "group") {
      const targetGroup = centerTargetGroup || getTargetGroup(event.target);
      const targetGroupId = targetGroup?.dataset.groupId || "";
      const draggingGroup = listEl.querySelector(".machine-group.is-dragging");
      if (
        centerTargetGroup &&
        !isDraggingSubgroup(draggingGroup) &&
        targetGroupId &&
        targetGroupId !== draggedId
      ) {
        if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        clearCenterTarget();
        callbacks.onDropGroupOnGroup?.(draggedId, targetGroupId);
      } else if (placeholder?.parentNode) {
        const body = placeholder.parentNode;
        if (draggingGroup) body.insertBefore(draggingGroup, placeholder);
        placeholder.remove();
        const parentGroup = body === listEl ? null : body.closest?.(".machine-group");
        const parentGroupId = parentGroup?.dataset.groupId || "";
        callbacks.onReorderItems?.(parentGroupId, getDirectItemOrder(body));
      }
      return;
    }

    const dragging = listEl.querySelector(".machine-card.is-dragging");
    const dragItem = getDragItem(dragging);
    const targetGroup = getTargetGroup(event.target);
    if (targetGroup && event.target.closest(".machine-group-header")) {
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      clearCenterTarget();
      callbacks.onDropMachineOnGroup?.(draggedId, targetGroup.dataset.groupId || "");
      return;
    }
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
    if (callbacks.onReorderItems) callbacks.onReorderItems(groupId, getDirectItemOrder(body));
    else callbacks.onReorder?.(groupId, order);
  });
};
