import { t } from "/static/js/dashboard/i18n.js";

export const createMachineSearchBar = ({ placeholder, onQuery } = {}) => {
  const input = document.createElement("input");
  input.type = "search";
  input.className = "field add-search";
  input.placeholder = placeholder || t("dashboard.searchPlaceholder", "Buscar por nombre o ubicacion...");
  input.maxLength = 24;
  input.setAttribute("aria-label", t("dashboard.searchAria", "Buscar maquinas"));
  input.addEventListener("input", () => {
    if (onQuery) onQuery(input.value || "");
  });
  return input;
};
