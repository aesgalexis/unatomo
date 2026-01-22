import { actions } from "../state.js";
import { equipmentTypes } from "../types.js";

const GRID_SIZE = 14;
const RESERVED_ROWS = 4;

const buildSections = (cols) => {
  const ratios = [1, 2, 2, 3];
  const total = ratios.reduce((sum, value) => sum + value, 0);
  const baseCols = ratios.map((ratio) => Math.floor((ratio / total) * cols));
  let remaining = cols - baseCols.reduce((sum, value) => sum + value, 0);

  for (let i = 0; i < baseCols.length && remaining > 0; i += 1) {
    baseCols[i] += 1;
    remaining -= 1;
  }

  const sections = [];
  let cursor = 0;
  baseCols.forEach((count) => {
    sections.push({ start: cursor, end: cursor + count });
    cursor += count;
  });

  return sections;
};

const createGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(false));

const canPlace = (grid, x, y, w, h) => {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (!grid[row] || grid[row][col]) {
        return false;
      }
    }
  }
  return true;
};

const markGrid = (grid, x, y, w, h) => {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      grid[row][col] = true;
    }
  }
};

const findSpot = (grid, cols, rows, w, h) => {
  const sections = buildSections(cols);

  for (const section of sections) {
    for (let row = RESERVED_ROWS; row <= rows - h; row += 1) {
      for (let col = section.start; col <= section.end - w; col += 1) {
        if (canPlace(grid, col, row, w, h)) {
          return { col, row };
        }
      }
    }
  }

  return null;
};

export const createCanvas = (store, mount) => {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-wrap";

  const rect = document.createElement("div");
  rect.className = "dashboard-rect";

  const itemsLayer = document.createElement("div");
  itemsLayer.className = "dashboard-items";

  const render = () => {
    const state = store.getState();
    const items = state.items;

    itemsLayer.replaceChildren();

    const rows = Math.floor(rect.clientHeight / GRID_SIZE);
    const cols = Math.floor(rect.clientWidth / GRID_SIZE);
    const grid = createGrid(rows, cols);

    items.forEach((item) => {
      const type = equipmentTypes[item.type];
      const size = type.size;
      let position = item.position;

      if (!position || position.cols !== cols || position.rows !== rows) {
        const spot = findSpot(grid, cols, rows, size.w, size.h);
        if (!spot) {
          return;
        }
        position = { ...spot, cols, rows };
        store.dispatch(actions.updateItem(item.id, { position }));
      }

      markGrid(grid, position.col, position.row, size.w, size.h);

      const node = document.createElement("button");
      node.type = "button";
      node.className = "dashboard-item";
      node.setAttribute("data-type", item.type);
      node.setAttribute("aria-label", type.label);
      node.style.left = `${position.col * GRID_SIZE}px`;
      node.style.top = `${position.row * GRID_SIZE}px`;
      node.style.width = `${size.w * GRID_SIZE}px`;
      node.style.height = `${size.h * GRID_SIZE}px`;
      node.addEventListener("click", () => {
        store.dispatch(actions.selectItem(item.id));
      });

      itemsLayer.appendChild(node);
    });
  };

  const handleResize = () => render();

  window.addEventListener("resize", handleResize);
  store.subscribe(render);

  rect.appendChild(itemsLayer);
  wrap.appendChild(rect);
  mount.appendChild(wrap);

  render();

  return { wrap, rect };
};
