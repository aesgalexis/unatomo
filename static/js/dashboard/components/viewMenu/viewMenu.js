import { t } from "../../i18n.js";

const VIEW_MODES = [
  { id: "grouped", labelKey: "viewMenuShowGroups", fallback: "Ver grupos" },
  { id: "flat", labelKey: "viewMenuHideGroups", fallback: "No ver grupos" }
];

export const createDashboardViewMenu = ({ currentMode = "grouped", onChange } = {}) => {
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
    '</svg>';

  const menu = document.createElement("div");
  menu.className = "dashboard-view-menu-panel";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  const close = () => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const render = (mode) => {
    menu.innerHTML = "";
    VIEW_MODES.forEach((item) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "dashboard-view-menu-item";
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", item.id === mode ? "true" : "false");
      option.dataset.mode = item.id;

      const check = document.createElement("span");
      check.className = "dashboard-view-menu-check";
      check.textContent = item.id === mode ? "✓" : "";
      const label = document.createElement("span");
      label.textContent = t(`dashboard.${item.labelKey}`, item.fallback);

      option.appendChild(check);
      option.appendChild(label);
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
        if (item.id !== currentMode && onChange) onChange(item.id);
      });
      menu.appendChild(option);
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
  render(currentMode);

  return {
    wrap,
    button,
    setMode(mode) {
      currentMode = mode === "flat" ? "flat" : "grouped";
      render(currentMode);
    },
    close
  };
};
