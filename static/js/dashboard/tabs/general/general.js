export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;

  const rowTop = document.createElement("div");
  rowTop.className = "mc-row mc-row-input mc-row-inline";

  const rowBottom = document.createElement("div");
  rowBottom.className = "mc-row mc-row-input mc-row-inline";

  const fieldsTop = [
    { key: "brand", label: "Marca", value: machine.brand || "", type: "text" },
    { key: "model", label: "Modelo", value: machine.model || "", type: "text" }
  ];

  const fieldsBottom = [
    { key: "serial", label: "N. Serie", value: machine.serial || "", type: "text" },
    { key: "year", label: "A\u00f1o", value: machine.year || "", type: "number" }
  ];

  const error = document.createElement("div");
  error.className = "mc-field-error";

  const buildField = ({ key, label, value, type }, container) => {
    const wrap = document.createElement("div");
    wrap.className = "mc-field mc-field-inline";

    const name = document.createElement("span");
    name.className = "mc-row-label";
    name.textContent = label;

    let fieldEl;
    if (key === "year") {
      const select = document.createElement("select");
      select.className = "mc-row-input-field";
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Seleccionar";
      select.appendChild(empty);
      const currentYear = new Date().getFullYear();
      for (let y = currentYear; y >= currentYear - 50; y -= 1) {
        const opt = document.createElement("option");
        opt.value = String(y);
        opt.textContent = String(y);
        select.appendChild(opt);
      }
      select.value = value ? String(value) : "";
      if (!canEditGeneral) {
        select.disabled = true;
        select.setAttribute("aria-readonly", "true");
      }
      select.addEventListener("click", (event) => event.stopPropagation());
      select.addEventListener("change", () => {
        if (hooks.onUpdateGeneral) {
          hooks.onUpdateGeneral(machine.id, key, select.value, select, error);
        }
      });
      fieldEl = select;
    } else {
      const input = document.createElement("input");
      input.className = "mc-row-input-field";
      input.type = type;
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
      fieldEl = input;
    }

    wrap.appendChild(name);
    wrap.appendChild(fieldEl);
    container.appendChild(wrap);
  };

  fieldsTop.forEach((field) => buildField(field, rowTop));
  fieldsBottom.forEach((field) => buildField(field, rowBottom));

  panel.appendChild(rowTop);
  panel.appendChild(rowBottom);
  panel.appendChild(error);
};
