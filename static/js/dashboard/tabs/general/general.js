import { t } from "/static/js/dashboard/i18n.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;

  const rowTop = document.createElement("div");
  rowTop.className = "mc-row mc-row-input mc-row-inline";

  const rowBottom = document.createElement("div");
  rowBottom.className = "mc-row mc-row-input mc-row-inline";

  const fieldsTop = [
    { key: "brand", label: t("general.brand", "Marca"), value: machine.brand || "", type: "text" },
    { key: "model", label: t("general.model", "Modelo"), value: machine.model || "", type: "text" },
  ];

  const fieldsBottom = [
    { key: "serial", label: t("general.serial", "N. Serie"), value: machine.serial || "", type: "text" },
    { key: "year", label: t("general.year", "Año"), value: machine.year || "", type: "number" },
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
      empty.textContent = t("general.select", "Seleccionar");
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

  const docHeader = document.createElement("div");
  docHeader.className = "mc-doc-row";
  const docLabel = document.createElement("span");
  docLabel.className = "mc-row-label";
  docLabel.textContent = t("general.documentation", "Documentación");
  docHeader.appendChild(docLabel);
  manualWrap.appendChild(docHeader);

  const createDocumentTile = (kind, labelText) => {
    const savedDoc = machine.documents?.[kind] || null;
    const canUpload = canEditGeneral && ["plate", "manual"].includes(kind);
    let currentUrl = savedDoc?.url || "";

    const wrap = document.createElement("div");
    wrap.className = "mc-doc-tile-wrap";

    const tile = document.createElement("div");
    tile.className = "mc-doc-tile";
    tile.classList.toggle("is-file", !!savedDoc);
    tile.classList.toggle("is-disabled", !canUpload && !currentUrl);
    tile.classList.toggle("is-unavailable", kind === "other");
    if (kind === "plate" && currentUrl) {
      tile.classList.add("has-preview");
      tile.style.setProperty("--mc-doc-preview", `url("${currentUrl.replace(/"/g, "%22")}")`);
    }
    tile.setAttribute("role", canUpload || currentUrl ? "button" : "group");
    if (canUpload || currentUrl) tile.tabIndex = 0;

    const icon = document.createElement("span");
    icon.className = "mc-doc-tile-icon";
    icon.dataset.symbol = savedDoc ? "✓" : "+";

    const label = document.createElement("span");
    label.className = "mc-doc-tile-label";
    label.textContent = labelText;

    const fileName = document.createElement("span");
    fileName.className = "mc-doc-tile-file";
    fileName.textContent = savedDoc?.name || t("general.upload", "Cargar");

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = kind === "plate" ? "image/jpeg,image/png,image/webp" : "application/pdf";
    fileInput.className = "mc-manual-input";
    fileInput.addEventListener("click", (event) => event.stopPropagation());

    const status = document.createElement("div");
    status.className = "mc-tag-status mc-doc-status";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "mc-manual-btn";
    saveBtn.textContent = t("general.save", "Guardar");
    saveBtn.hidden = true;

    const openFilePicker = () => {
      if (canUpload) fileInput.click();
    };

    const openSavedDocument = () => {
      if (currentUrl) window.open(currentUrl, "_blank", "noopener");
    };

    const uploadFile = async (file) => {
      if (!file || !canUpload) return;
      if (!hooks.onUploadMachineDocument) {
        status.textContent = t("general.uploadError", "Error al cargar el archivo");
        status.dataset.state = "error";
        if (hooks.onContentResize) hooks.onContentResize();
        return;
      }

      saveBtn.disabled = true;
      tile.classList.add("is-uploading");
      status.textContent = t("general.uploading", "Subiendo...");
      status.dataset.state = "neutral";
      if (hooks.onContentResize) hooks.onContentResize();

      try {
        const doc = await hooks.onUploadMachineDocument(machine.id, kind, file, status);
        fileName.textContent = doc?.name || file.name;
        tile.classList.add("is-file");
        icon.dataset.symbol = "✓";
        saveBtn.hidden = true;
        currentUrl = doc?.url || currentUrl;
        if (kind === "plate" && currentUrl) {
          tile.classList.add("has-preview");
          tile.style.setProperty("--mc-doc-preview", `url("${currentUrl.replace(/"/g, "%22")}")`);
        }
        fileInput.value = "";
        window.setTimeout(() => {
          status.textContent = "";
          status.dataset.state = "";
          if (hooks.onContentResize) hooks.onContentResize();
        }, 2200);
      } catch (err) {
        const code = err?.message || "";
        status.textContent =
          code === "file-type"
            ? kind === "manual"
              ? t("general.uploadPdfTypeError", "Usa un archivo PDF")
              : t("general.uploadTypeError", "Usa una imagen JPG, PNG o WebP")
            : code === "file-too-large"
            ? kind === "manual"
              ? t("general.uploadPdfSizeError", "El PDF es demasiado grande")
              : t("general.uploadSizeError", "La imagen es demasiado grande")
            : t("general.uploadError", "Error al cargar el archivo");
        status.dataset.state = "error";
      } finally {
        saveBtn.disabled = false;
        tile.classList.remove("is-uploading");
        if (hooks.onContentResize) hooks.onContentResize();
      }
    };

    const clearSavedState = () => {
      currentUrl = "";
      tile.classList.remove("is-file", "has-preview");
      tile.style.removeProperty("--mc-doc-preview");
      tile.classList.toggle("is-disabled", !canUpload);
      tile.setAttribute("role", canUpload ? "button" : "group");
      if (canUpload) tile.tabIndex = 0;
      else tile.removeAttribute("tabindex");
      icon.dataset.symbol = "+";
      fileName.textContent = t("general.upload", "Cargar");
      saveBtn.hidden = true;
    };

    const deleteDocument = async () => {
      if (!savedDoc || !hooks.onDeleteMachineDocument) return;
      const confirmed = window.confirm(
        t(
          "general.deleteConfirm",
          "Esta acción es irreversible. Se eliminará el archivo de la base de datos. ¿Quieres continuar?"
        )
      );
      if (!confirmed) return;
      try {
        tile.classList.add("is-uploading");
        await hooks.onDeleteMachineDocument(machine.id, kind, status);
        clearSavedState();
        menu?.remove();
        window.setTimeout(() => {
          status.textContent = "";
          status.dataset.state = "";
          if (hooks.onContentResize) hooks.onContentResize();
        }, 2200);
      } catch {
        status.textContent = t("general.deleteError", "No se pudo eliminar el archivo");
        status.dataset.state = "error";
      } finally {
        tile.classList.remove("is-uploading");
        if (hooks.onContentResize) hooks.onContentResize();
      }
    };

    tile.addEventListener("click", (event) => {
      event.stopPropagation();
      if (currentUrl) openSavedDocument();
      else openFilePicker();
    });

    tile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      if (currentUrl) openSavedDocument();
      else openFilePicker();
    });

    tile.addEventListener("dragover", (event) => {
      if (!canUpload || currentUrl) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.add("is-dragover");
    });

    tile.addEventListener("dragleave", (event) => {
      if (!canUpload || currentUrl) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.remove("is-dragover");
    });

    tile.addEventListener("drop", async (event) => {
      if (!canUpload || currentUrl) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.remove("is-dragover");
      const file = event.dataTransfer?.files?.[0];
      if (file) await uploadFile(file);
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      fileName.textContent = file ? file.name : savedDoc?.name || t("general.upload", "Cargar");
      tile.classList.toggle("is-file", !!file || !!savedDoc);
      saveBtn.hidden = !file;
      if (hooks.onContentResize) hooks.onContentResize();
    });

    saveBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await uploadFile(fileInput.files && fileInput.files[0]);
    });

    const actions = document.createElement("div");
    actions.className = "mc-manual-actions mc-doc-actions";

    let menu = null;
    if (canUpload && savedDoc) {
      menu = document.createElement("div");
      menu.className = "mc-doc-menu";
      const dots = document.createElement("button");
      dots.type = "button";
      dots.className = "mc-doc-menu-dots";
      dots.setAttribute("aria-label", t("general.moreOptions", "Más opciones"));
      dots.textContent = "...";
      dots.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      const deleteLink = document.createElement("a");
      deleteLink.href = "#";
      deleteLink.className = "mc-doc-menu-link";
      deleteLink.textContent = t("general.delete", "Eliminar");
      deleteLink.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await deleteDocument();
      });

      menu.appendChild(dots);
      menu.appendChild(deleteLink);
      tile.appendChild(menu);
    }

    actions.appendChild(saveBtn);
    tile.appendChild(icon);
    tile.appendChild(label);
    tile.appendChild(fileName);
    wrap.appendChild(tile);
    wrap.appendChild(fileInput);
    wrap.appendChild(actions);
    wrap.appendChild(status);
    return wrap;
  };

  const tiles = document.createElement("div");
  tiles.className = "mc-doc-tiles";
  tiles.appendChild(createDocumentTile("plate", t("general.plate", "Placa")));
  tiles.appendChild(createDocumentTile("manual", t("general.manual", "Manual")));
  tiles.appendChild(createDocumentTile("other", t("general.otherDocumentation", "Otra documentación")));
  manualWrap.appendChild(tiles);

  panel.appendChild(manualWrap);
};
