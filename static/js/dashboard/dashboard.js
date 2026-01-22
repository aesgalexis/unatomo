const mount = document.getElementById("dashboard-mount");

const GRID_SIZE = 14;
const ITEM_SIZE = GRID_SIZE * 2;
const GRID_PADDING = 16;

const placementState = {
  col: 0,
  row: 0,
};

const placeNext = (item, host) => {
  const maxCols = Math.max(1, Math.floor((host.clientWidth - GRID_PADDING * 2) / ITEM_SIZE));
  const x = GRID_PADDING + placementState.col * ITEM_SIZE;
  const y = GRID_PADDING + placementState.row * ITEM_SIZE;

  item.style.left = `${x}px`;
  item.style.top = `${y}px`;

  placementState.col += 1;
  if (placementState.col >= maxCols) {
    placementState.col = 0;
    placementState.row += 1;
  }
};

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-wrap";

  const rect = document.createElement("div");
  rect.className = "dashboard-rect";

  const itemsLayer = document.createElement("div");
  itemsLayer.className = "dashboard-items";

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

  const addWasher = document.createElement("button");
  addWasher.type = "button";
  addWasher.className = "btn-secondary";
  addWasher.textContent = "Lavadora";

  const addDryer = document.createElement("button");
  addDryer.type = "button";
  addDryer.className = "btn-secondary";
  addDryer.textContent = "Secadora";

  const createItem = (type) => {
    const item = document.createElement("div");
    item.className = "dashboard-item";
    item.setAttribute("data-type", type);
    placeNext(item, rect);
    itemsLayer.appendChild(item);
  };

  addBtn.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
  });

  document.addEventListener("click", (event) => {
    if (!toolbar.contains(event.target)) {
      menu.hidden = true;
    }
  });

  addWasher.addEventListener("click", () => {
    createItem("lavadora");
    menu.hidden = true;
  });

  addDryer.addEventListener("click", () => {
    createItem("secadora");
    menu.hidden = true;
  });

  menu.appendChild(menuLabel);
  menu.appendChild(menuGroup);
  menu.appendChild(addWasher);
  menu.appendChild(addDryer);
  toolbar.appendChild(addBtn);
  toolbar.appendChild(menu);
  rect.appendChild(itemsLayer);
  rect.appendChild(toolbar);
  wrap.appendChild(rect);
  mount.appendChild(wrap);
}
