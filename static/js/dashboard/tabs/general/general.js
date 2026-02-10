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
      select.className = "mc-row-input-field mc-year-select";
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
      input.addEventListener("input", () => {
        if (hooks.onUpdateGeneral) {
          hooks.onUpdateGeneral(machine.id, key, input.value, input, error);
        }
      });
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

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  const manualWrap = document.createElement("div");
  manualWrap.className = "mc-manual";

  const createManualRow = (labelText, { withSearch = false } = {}) => {
    const row = document.createElement("div");
    row.className = "mc-manual-row";

    const label = document.createElement("span");
    label.className = "mc-row-label";
    label.textContent = labelText;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf,image/*";
    fileInput.className = "mc-manual-input";
    fileInput.addEventListener("click", (event) => event.stopPropagation());

    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "mc-manual-drop";
    drop.textContent = "Cargar";
    drop.addEventListener("click", (event) => {
      event.stopPropagation();
      fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      const labelText = file ? file.name : "Cargar";
      drop.textContent = labelText;
      drop.classList.toggle("is-file", !!file);
      saveBtn.style.display = file ? "" : "none";
      if (searchBtn) searchBtn.style.display = file ? "none" : "";
      if (hooks.onContentResize) hooks.onContentResize();
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "mc-manual-btn";
    saveBtn.textContent = "Guardar";
    saveBtn.style.display = "none";
    saveBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      status.textContent = "Error al cargar el archivo";
      status.dataset.state = "error";
      if (hooks.onContentResize) hooks.onContentResize();
    });

    let searchBtn = null;
    if (withSearch) {
      searchBtn = document.createElement("button");
      searchBtn.type = "button";
      searchBtn.className = "mc-manual-btn";
      searchBtn.textContent = "Buscar";
      searchBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const hasBrand = !!(machine.brand || "").trim();
        const hasModel = !!(machine.model || "").trim();
        if (!hasBrand || !hasModel) {
          status.textContent = !hasBrand && !hasModel
            ? "Introduce marca y modelo para buscar"
            : !hasBrand
            ? "Introduce marca para buscar"
            : "Introduce modelo para buscar";
          status.dataset.state = "error";
          if (hooks.onContentResize) hooks.onContentResize();
          return;
        }
        const query = `${machine.brand} ${machine.model} manual filetype:pdf`.trim();
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(url, "_blank", "noopener");
      });
    }

    const status = document.createElement("div");
    status.className = "mc-tag-status";

    const actions = document.createElement("div");
    actions.className = "mc-manual-actions";
    if (searchBtn) actions.appendChild(searchBtn);
    actions.appendChild(drop);

    row.appendChild(label);
    row.appendChild(actions);
    row.appendChild(fileInput);
    row.appendChild(saveBtn);
    const wrap = document.createElement("div");
    wrap.appendChild(row);
    wrap.appendChild(status);
    return wrap;
  };

  const docHeader = document.createElement("div");
  docHeader.className = "mc-doc-row";
  const docLabel = document.createElement("span");
  docLabel.className = "mc-row-label";
  docLabel.textContent = "Documentación";
  const docSelect = document.createElement("select");
  docSelect.className = "mc-doc-select";
  const docPlaceholder = document.createElement("option");
  docPlaceholder.value = "";
  docPlaceholder.textContent = "+ Añadir...";
  docSelect.appendChild(docPlaceholder);
  ["Placa", "Manual", "Esquema eléctrico"].forEach((labelText) => {
    const opt = document.createElement("option");
    opt.value = labelText;
    opt.textContent = labelText;
    docSelect.appendChild(opt);
  });
  docHeader.appendChild(docLabel);
  docHeader.appendChild(docSelect);
  manualWrap.appendChild(docHeader);

  const rowsByLabel = {
    Placa: createManualRow("Placa"),
    Manual: createManualRow("Manual", { withSearch: true }),
    "Esquema eléctrico": createManualRow("Esquema eléctrico")
  };

  docSelect.addEventListener("change", () => {
    const value = docSelect.value;
    if (!value || !rowsByLabel[value]) return;
    if (!manualWrap.contains(rowsByLabel[value])) {
      manualWrap.appendChild(rowsByLabel[value]);
    }
    docSelect.value = "";
    if (hooks.onContentResize) hooks.onContentResize();
  });

  panel.appendChild(manualWrap);
};
