// DnD mínimo basado en arrastrar el asa .grab
export function enableDragAndDrop({ listA, listB, onDrop }) {
  for (const list of [listA, listB]) {
    list.addEventListener("dragstart", (e) => {
      const grab = e.target.closest(".grab");
      if (!grab) return;
      const item = grab.closest(".item");
      e.dataTransfer.setData("text/plain", item.dataset.id);
      e.dataTransfer.effectAllowed = "move";
    });

    list.addEventListener("dragstart", (e) => {
  // Permite iniciar el drag desde .grab o desde cualquier punto dentro del .item
  const item = e.target.closest(".item");
  if (!item) return;
  e.dataTransfer.setData("text/plain", item.dataset.id);
  e.dataTransfer.effectAllowed = "move";
});

    list.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      const after = getDragAfterElement(list, e.clientY);
      const index = after ? [...list.querySelectorAll(".item")].indexOf(after) : list.children.length;
      const where = list.id === "listA" ? "A" : "B";
      onDrop?.({ id, where, index });
    });
  }
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".item")];
  return els.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      else return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}
