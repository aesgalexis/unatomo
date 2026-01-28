export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;

  const row = document.createElement("div");
  row.className = "mc-row mc-row-input mc-row-stack";

  const fields = [
    { key: "brand", label: "Marca", value: machine.brand || "", type: "text" },
    { key: "model", label: "Modelo", value: machine.model || "", type: "text" },
    { key: "year", label: "Año", value: machine.year || "", type: "number" }
  ];

  const error = document.createElement("div");
  error.className = "mc-field-error";

  fields.forEach(({ key, label, value, type }) => {
    const wrap = document.createElement("div");
    wrap.className = "mc-field";

    const name = document.createElement("span");
    name.className = "mc-row-label";
    name.textContent = label;

    const input = document.createElement("input");
    input.className = "mc-row-input-field";
    input.type = type;
    if (key === "year") {
      input.inputMode = "numeric";
      input.placeholder = "YYYY";
    }
    input.value = value;
    if (!canEditGeneral) {
      input.readOnly = true;
      input.setAttribute("aria-readonly", "true");
    }
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("blur", () => {
      if (hooks.onUpdateGeneral) {
        hooks.onUpdateGeneral(machine.id, key, input.value, input, error);
      }
    });

    wrap.appendChild(name);
    wrap.appendChild(input);
    row.appendChild(wrap);
  });

  panel.appendChild(row);
  panel.appendChild(error);
};
