import { t } from "/static/js/dashboard/i18n.js";

export const createMachineSearchBar = ({ placeholder, onQuery } = {}) => {
  const input = document.createElement("input");
  input.type = "text";
  input.role = "searchbox";
  input.className = "field add-search";
  input.name = `machine-filter-${Date.now().toString(36)}`;
  input.autocomplete = "new-password";
  input.autocapitalize = "off";
  input.inputMode = "search";
  input.spellcheck = false;
  input.placeholder = placeholder || t("dashboard.searchPlaceholder", "Buscar por nombre o ubicacion...");
  input.maxLength = 80;
  input.setAttribute("aria-label", t("dashboard.searchAria", "Buscar maquinas"));
  let acceptedValue = "";
  const handleQueryChange = () => {
    if (document.activeElement !== input) {
      input.value = acceptedValue;
      return;
    }
    acceptedValue = input.value || "";
    if (onQuery) onQuery(acceptedValue);
  };
  input.addEventListener("input", handleQueryChange);
  input.addEventListener("change", handleQueryChange);
  return input;
};
