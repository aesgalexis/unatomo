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

const TASK_STATUS_MODES = [
  { id: "visible", labelKey: "todoStatusVisible", fallback: "Por defecto" },
  { id: "pending", labelKey: "todoStatusPending", fallback: "Pendientes" },
  { id: "completed", labelKey: "todoStatusCompleted", fallback: "Completadas" },
  { id: "all", labelKey: "todoStatusAll", fallback: "Todas" }
];

const TASK_SORT_MODES = [
  { id: "created-desc", labelKey: "todoSortNewest", fallback: "Más recientes primero" },
  { id: "created-asc", labelKey: "todoSortOldest", fallback: "Más antiguas primero" },
  { id: "machine-asc", labelKey: "todoSortMachine", fallback: "Equipo A-Z" },
  { id: "title-asc", labelKey: "todoSortTitle", fallback: "Título A-Z" }
];

const GALLERY_SIZE_MODES = [
  { id: "1", labelKey: "gallerySizeSmall", fallback: "Pequeñas" },
  { id: "4", labelKey: "gallerySizeLarge", fallback: "Grandes" }
];

const normalizeSort = (value) =>
  SORT_MODES.some((item) => item.id === value) ? value : "manual";

export const createDashboardViewMenu = ({
  currentMode = "grouped",
  currentPresentation = "tree",
  currentSort = "manual",
  isTreeAvailable = () => true,
  onChange,
  onSortChange,
  onTaskStatusChange,
  onTaskSortChange,
  onGallerySizeChange
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
  let taskMode = false;
  let galleryMode = false;
  let currentGallerySize = "1";
  let currentTaskStatus = "visible";
  let currentTaskSort = "created-desc";

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
    button.setAttribute(
      "aria-label",
      galleryMode
        ? t("dashboard.gallerySizeMenu", "Tamaño de imágenes")
        : taskMode
          ? t("dashboard.todoFilter", "Filtrar y ordenar")
          : t("dashboard.orderAria", "Ordenar")
    );
    if (galleryMode) {
      GALLERY_SIZE_MODES.forEach((item) => {
        addItem(item, item.id === currentGallerySize, (id) => {
          if (id === currentGallerySize) return;
          currentGallerySize = id;
          onGallerySizeChange?.(Number(id));
          render();
        });
      });
      return;
    }
    if (taskMode) {
      const statusLabel = document.createElement("div");
      statusLabel.className = "dashboard-view-menu-label";
      statusLabel.textContent = t("dashboard.todoStatus", "Estado");
      menu.appendChild(statusLabel);
      TASK_STATUS_MODES.forEach((item) => {
        addItem(item, item.id === currentTaskStatus, (id) => {
          if (id !== currentTaskStatus) onTaskStatusChange?.(id);
        });
      });

      const separator = document.createElement("div");
      separator.className = "dashboard-view-menu-separator";
      menu.appendChild(separator);

      const sortLabel = document.createElement("div");
      sortLabel.className = "dashboard-view-menu-label";
      sortLabel.textContent = t("dashboard.todoSort", "Ordenar por");
      menu.appendChild(sortLabel);
      TASK_SORT_MODES.forEach((item) => {
        addItem(item, item.id === currentTaskSort, (id) => {
          if (id !== currentTaskSort) onTaskSortChange?.(id);
        });
      });
      return;
    }

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
    setTaskMode(enabled, { statusFilter = "visible", sort = "created-desc" } = {}) {
      close();
      taskMode = !!enabled;
      currentTaskStatus = TASK_STATUS_MODES.some((item) => item.id === statusFilter)
        ? statusFilter
        : "visible";
      currentTaskSort = TASK_SORT_MODES.some((item) => item.id === sort)
        ? sort
        : "created-desc";
      render();
    },
    setGalleryMode(enabled) {
      close();
      const wasGalleryMode = galleryMode;
      galleryMode = !!enabled;
      if (galleryMode && !wasGalleryMode) {
        onGallerySizeChange?.(Number(currentGallerySize));
      }
      render();
    },
    refresh() {
      render();
    },
    close
  };
};
