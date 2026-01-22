import { actions } from "../state.js";
import { equipmentTypes } from "../types.js";

export const createContextMenu = (store) => {
  const toolbar = document.createElement("div");
  toolbar.className = "dashboard-toolbar";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "dashboard-add-btn is-add";
  addBtn.setAttribute("aria-label", "Add");
  addBtn.textContent = "add";

  const menu = document.createElement("div");
  menu.className = "dashboard-menu";
  menu.hidden = true;

  const menuLabel = document.createElement("div");
  menuLabel.className = "dashboard-menu-label";
  menuLabel.textContent = "Añadir";

  const menuRow = document.createElement("div");
  menuRow.className = "dashboard-menu-row";

  const menuItem = document.createElement("div");
  menuItem.className = "dashboard-menu-item";
  menuItem.textContent = "Equipo";

  const subMenu = document.createElement("div");
  subMenu.className = "dashboard-submenu";

  const createSubItem = (label, type, enabled) => {
    const item = document.createElement("div");
    item.className = `dashboard-submenu-item${enabled ? "" : " is-disabled"}`;
    item.textContent = label;
    if (enabled) {
      item.addEventListener("click", () => {
        const items = store.getState().items;
        const count = items.filter((entry) => entry.type === type).length + 1;
        store.dispatch(
          actions.addItem({
            id: `${type}-${crypto.randomUUID()}`,
            type,
            position: null,
            name: `${equipmentTypes[type].label} ${count}`,
            anchor: null,
            params: { ...equipmentTypes[type].defaults },
          })
        );
        menu.hidden = true;
      });
    }
    return item;
  };

  subMenu.appendChild(createSubItem("Lavadora", "lavadora", true));
  subMenu.appendChild(createSubItem("Secadora", "secadora", true));
  subMenu.appendChild(createSubItem("Túnel", "tunel", false));
  subMenu.appendChild(createSubItem("Calandra", "calandra", false));
  subMenu.appendChild(createSubItem("Plegador", "plegador", false));
  subMenu.appendChild(createSubItem("Introductor", "introductor", false));
  subMenu.appendChild(createSubItem("Empaquetadora", "empaquetadora", false));

  menuRow.appendChild(menuItem);
  menuRow.appendChild(subMenu);

  addBtn.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
  });

  document.addEventListener("click", (event) => {
    if (!toolbar.contains(event.target)) {
      menu.hidden = true;
    }
  });

  menu.appendChild(menuLabel);
  menu.appendChild(menuRow);
  toolbar.appendChild(addBtn);
  toolbar.appendChild(menu);

  return toolbar;
};
