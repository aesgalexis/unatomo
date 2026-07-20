import { t } from "../../i18n.js";

const VIEW_MODES = [
  { id: "inline", labelKey: "viewMenuInlineGroups", fallback: "Grupos en el dashboard" },
  { id: "tree", labelKey: "viewMenuTreeGroups", fallback: "\u00c1rbol lateral" },
  { id: "flat", labelKey: "viewMenuHideGroups", fallback: "No mostrar grupos" }
];

const SORT_MODES = [
  { id: "manual", labelKey: "sortManual", fallback: "Manual" },
  { id: "incidents", labelKey: "sortIncidents", fallback: "Incidencias" },
  { id: "name", labelKey: "sortName", fallback: "Nombre A-Z" }
];

const normalizeSort = (value) =>
  SORT_MODES.some((item) => item.id === value) ? value : "manual";

export const createDashboardViewMenu = ({
  currentMode = "grouped",
  currentPresentation = "inline",
  currentSort = "manual",
  isTreeAvailable = () => true,
  onChange,
  onSortChange
} = {}) => {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-view-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-order dashboard-view-menu-toggle";
  button.setAttribute("aria-label", t("dashboard.orderAria", "Ordenar"));
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path fill="currentColor" d="M7 6h10a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h6a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h2a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zM4 5l2 2 2-2H4zm0 7l2 2 2-2H4zm0 7l2 2 2-2H4z"/>' +
    "</svg>";

  const menu = document.createElement("div");
  menu.className = "dashboard-view-menu-panel";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  const close = () => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const addItem = (item, active, onSelect) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "dashboard-view-menu-item";
    option.setAttribute("role", "menuitemradio");
    option.setAttribute("aria-checked", active ? "true" : "false");
    option.dataset.mode = item.id;

    const check = document.createElement("span");
    check.className = "dashboard-view-menu-check";
    check.textContent = active ? "\u2713" : "";

    const label = document.createElement("span");
    label.textContent = t(`dashboard.${item.labelKey}`, item.fallback);

    option.appendChild(check);
    option.appendChild(label);
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      close();
      onSelect(item.id);
    });
    menu.appendChild(option);
  };

  const render = () => {
    menu.innerHTML = "";
    const treeAvailable = isTreeAvailable();
    const activeViewMode = currentMode === "flat"
      ? "flat"
      : currentPresentation === "tree" && !treeAvailable
        ? "inline"
        : currentPresentation;
    VIEW_MODES.filter((item) => item.id !== "tree" || treeAvailable).forEach((item) => {
      addItem(item, item.id === activeViewMode, (id) => {
        if (id !== activeViewMode && onChange) onChange(id);
      });
    });

    const separator = document.createElement("div");
    separator.className = "dashboard-view-menu-separator";
    menu.appendChild(separator);

    const label = document.createElement("div");
    label.className = "dashboard-view-menu-label";
    label.textContent = t("dashboard.sortMenuTitle", "Ordenar");
    menu.appendChild(label);

    SORT_MODES.forEach((item) => {
      addItem(item, item.id === currentSort, (id) => {
        if (id !== currentSort && onSortChange) onSortChange(id);
      });
    });
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextOpen = menu.hidden;
    menu.hidden = !nextOpen;
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) close();
  });

  wrap.appendChild(button);
  wrap.appendChild(menu);
  render();

  return {
    wrap,
    button,
    setMode(mode) {
      currentMode = mode === "flat" ? "flat" : "grouped";
      render();
    },
    setPresentationMode(mode) {
      currentPresentation = mode === "tree" ? "tree" : "inline";
      render();
    },
    setSortMode(mode) {
      currentSort = normalizeSort(mode);
      render();
    },
    refresh() {
      render();
    },
    close
  };
};
