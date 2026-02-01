export const createMachineSearchBar = ({ placeholder, onQuery } = {}) => {
  const input = document.createElement("input");
  input.type = "search";
  input.className = "field add-search";
  input.placeholder = placeholder || "Buscar por nombre o ubicacion...";
  input.maxLength = 24;
  input.setAttribute("aria-label", "Buscar maquinas");
  input.addEventListener("input", () => {
    if (onQuery) onQuery(input.value || "");
  });
  return input;
};
