import { actions } from "../state.js";
import { equipmentTypes } from "../types.js";

export const createContextMenu = (store) => {
  const toolbar = document.createElement("div");
  toolbar.className = "dashboard-toolbar";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "dashboard-add-btn";
  addBtn.setAttribute("aria-label", "Añadir equipo");
  addBtn.textContent = "+";

  const menu = document.createElement("div");
  menu.className = "dashboard-menu";
  menu.hidden = true;

  const menuLabel = document.createElement("div");
  menuLabel.className = "dashboard-menu-label";
  menuLabel.textContent = "Añadir";

  const menuGroup = document.createElement("div");
  menuGroup.className = "dashboard-menu-group";
  menuGroup.textContent = "Equipo";

  const createOption = (type) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = equipmentTypes[type].label;
    btn.addEventListener("click", () => {
      store.dispatch(
        actions.addItem({
          id: `${type}-${crypto.randomUUID()}`,
          type,
          position: null,
          params: { ...equipmentTypes[type].defaults },
        })
      );
      menu.hidden = true;
    });
    return btn;
  };

  const washerBtn = createOption("lavadora");
  const dryerBtn = createOption("secadora");

  addBtn.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
  });

  document.addEventListener("click", (event) => {
    if (!toolbar.contains(event.target)) {
      menu.hidden = true;
    }
  });

  menu.appendChild(menuLabel);
  menu.appendChild(menuGroup);
  menu.appendChild(washerBtn);
  menu.appendChild(dryerBtn);
  toolbar.appendChild(addBtn);
  toolbar.appendChild(menu);

  return toolbar;
};
