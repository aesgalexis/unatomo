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
  const els = [...container.querySelectorAll(".item")].filter(
    (el) => !el.classList.contains("dragging")
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

function indexFromPlaceholder(listEl) {
  let index = 0;
  for (const node of listEl.children) {
    if (node === placeholder) break;
    if (node.classList && node.classList.contains("item")) index++;
  }
  return index;
}

function bindZone(zoneEl, listEl, whereKey, dropEnabled = true) {
  if (!zoneEl || !listEl) return;
  if (zoneEl.dataset.dndBound === "1") return;
  zoneEl.dataset.dndBound = "1";

  if (!listEl.style.minHeight) listEl.style.minHeight = "32px";

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

  if (!dropEnabled) return; 

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
    if (!listEl.contains(ph)) {
      const after = getDragAfterElement(listEl, e.clientY);
      if (after) listEl.insertBefore(ph, after);
      else listEl.appendChild(ph);
    }

    const index = indexFromPlaceholder(listEl);

    if (typeof dropCallback === "function") {
      dropCallback({ id, where: whereKey, index });
    }
    removePlaceholder();
  });
}

export function enableDragAndDrop({ listL, listA, listB, onDrop }) {
  dropCallback = onDrop;

  const frameA = listA?.closest?.(".frame") || listA;
  const frameB = listB?.closest?.(".frame") || listB;
  const frameL = listL?.closest?.(".frame") || listL;

  if (listA) {
    bindZone(listA, listA, "A", true);
    if (frameA && frameA !== listA) bindZone(frameA, listA, "A", true);
  }
  if (listB) {
    bindZone(listB, listB, "B", true);
    if (frameB && frameB !== listB) bindZone(frameB, listB, "B", true);
  }

  if (listL) {
    bindZone(listL, listL, "L", false);
    if (frameL && frameL !== listL) bindZone(frameL, listL, "L", false);
  }
}
