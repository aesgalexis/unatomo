import { t } from "/static/js/dashboard/i18n.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const canEditGeneral = options.canEditGeneral !== false;
  const maxOtherDocDisplayName = 40;

  const closeDocMenus = () => {
    panel.querySelectorAll(".mc-doc-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      const dots = menu.querySelector(".mc-doc-menu-dots");
      if (dots) dots.setAttribute("aria-expanded", "false");
    });
  };

  if (panel.__unatomoDocMenuHandler) {
    panel.removeEventListener("click", panel.__unatomoDocMenuHandler);
  }
  panel.__unatomoDocMenuHandler = (event) => {
    if (!event.target.closest(".mc-doc-menu")) closeDocMenus();
  };
  panel.addEventListener("click", panel.__unatomoDocMenuHandler);

  const setupDocMenu = (menu, dots) => {
    dots.setAttribute("aria-expanded", "false");
    menu.addEventListener("mouseleave", () => {
      menu.classList.remove("is-hover-suppressed");
    });
    dots.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = menu.classList.contains("is-open");
      closeDocMenus();
      if (!isOpen) {
        menu.classList.remove("is-hover-suppressed");
        menu.classList.add("is-open");
        dots.setAttribute("aria-expanded", "true");
      } else {
        menu.classList.add("is-hover-suppressed");
        try {
          dots.blur({ preventScroll: true });
        } catch {
          dots.blur();
        }
      }
    });
  };

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

  let otherDocsList = null;
  const appendOtherDocRow = (doc) => {
    if (!otherDocsList || !doc?.url) return;
    const row = document.createElement("div");
    row.className = "mc-other-doc-row";

    const link = document.createElement("a");
    link.className = "mc-other-doc-link";
    link.href = doc.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = doc.displayName || doc.name || t("general.otherDocumentation", "Otra documentación");
    link.addEventListener("click", (event) => event.stopPropagation());

    row.appendChild(link);

    if (canEditGeneral && hooks.onDeleteMachineDocument) {
      const menu = document.createElement("div");
      menu.className = "mc-doc-menu mc-other-doc-menu";

      const dots = document.createElement("button");
      dots.type = "button";
      dots.className = "mc-doc-menu-dots";
      dots.setAttribute("aria-label", t("general.moreOptions", "Más opciones"));
      dots.textContent = "...";

      const rename = document.createElement("a");
      rename.className = "mc-doc-menu-link mc-other-doc-rename";
      rename.href = "#";
      rename.textContent = t("general.rename", "Renombrar");
      rename.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeDocMenus();
        const currentName = doc.displayName || doc.name || "";
        const nextName = window.prompt(
          t("general.renamePrompt", "Nombre para mostrar"),
          currentName.slice(0, maxOtherDocDisplayName)
        );
        if (nextName === null) return;
        const cleanName = nextName.trim().replace(/\s+/g, " ").slice(0, maxOtherDocDisplayName);
        if (cleanName === currentName) return;
        if (!hooks.onRenameMachineDocument) return;
        await hooks.onRenameMachineDocument(machine.id, doc.id || doc.storagePath || "", cleanName);
        link.textContent = cleanName || doc.name || t("general.otherDocumentation", "Otra documentación");
      });

      const remove = document.createElement("a");
      remove.className = "mc-doc-menu-link mc-doc-menu-delete mc-other-doc-remove";
      remove.href = "#";
      remove.textContent = t("general.delete", "Eliminar");
      remove.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeDocMenus();
        const confirmed = window.confirm(
          t(
            "general.deleteConfirm",
            "Esta acción es irreversible. Se eliminará el archivo de la base de datos. ¿Quieres continuar?"
          )
        );
        if (!confirmed) return;
        await hooks.onDeleteMachineDocument(machine.id, "other", null, doc.id || doc.storagePath || "");
      });
      setupDocMenu(menu, dots);
      menu.appendChild(dots);
      menu.appendChild(remove);
      menu.appendChild(rename);
      row.appendChild(menu);
    }

    otherDocsList.appendChild(row);
  };

  const createDocumentTile = (kind, labelText) => {
    const savedDoc = kind === "other" ? null : machine.documents?.[kind] || null;
    const canUpload = canEditGeneral && ["plate", "manual", "other"].includes(kind);
    const isMultiDocument = kind === "other";
    const maxBatchFiles = 10;
    let currentUrl = savedDoc?.url || "";

    const wrap = document.createElement("div");
    wrap.className = "mc-doc-tile-wrap";

    const tile = document.createElement("div");
    tile.className = "mc-doc-tile";
    tile.classList.toggle("is-file", !!savedDoc);
    tile.classList.toggle("is-disabled", !canUpload && !currentUrl);
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
    fileInput.accept =
      kind === "plate"
        ? "image/jpeg,image/png,image/webp"
        : kind === "manual"
          ? "application/pdf"
          : "application/pdf,image/jpeg,image/png,image/webp";
    fileInput.multiple = isMultiDocument;
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

    const uploadFile = async (file, options = {}) => {
      if (!file || !canUpload) return;
      if (!hooks.onUploadMachineDocument) {
        status.textContent = t("general.uploadError", "Error al cargar el archivo");
        status.dataset.state = "error";
        if (hooks.onContentResize) hooks.onContentResize();
        return;
      }

      saveBtn.disabled = true;
      tile.classList.add("is-uploading");
      if (!options.silent) {
        status.textContent = t("general.uploading", "Subiendo...");
        status.dataset.state = "neutral";
      }
      if (hooks.onContentResize) hooks.onContentResize();

      try {
        const doc = await hooks.onUploadMachineDocument(machine.id, kind, file, status, options);
        fileName.textContent = isMultiDocument
          ? t("general.upload", "Cargar")
          : doc?.name || file.name;
        tile.classList.toggle("is-file", !isMultiDocument);
        icon.dataset.symbol = isMultiDocument ? "+" : "✓";
        saveBtn.hidden = true;
        currentUrl = isMultiDocument ? "" : doc?.url || currentUrl;
        if (kind === "plate" && currentUrl) {
          tile.classList.add("has-preview");
          tile.style.setProperty("--mc-doc-preview", `url("${currentUrl.replace(/"/g, "%22")}")`);
        }
        fileInput.value = "";
        if (!options.silent) {
          window.setTimeout(() => {
            status.textContent = "";
            status.dataset.state = "";
            if (hooks.onContentResize) hooks.onContentResize();
          }, 2200);
        }
        return doc;
      } catch (err) {
        const code = err?.message || "";
        status.textContent =
          code === "file-type"
            ? kind === "manual"
              ? t("general.uploadPdfTypeError", "Usa un archivo PDF")
              : kind === "other"
                ? t("general.uploadDocumentTypeError", "Usa un PDF o una imagen JPG, PNG o WebP")
                : t("general.uploadTypeError", "Usa una imagen JPG, PNG o WebP")
            : code === "file-too-large"
            ? kind === "manual"
              ? t("general.uploadPdfSizeError", "El PDF es demasiado grande")
              : kind === "other"
                ? t("general.uploadDocumentSizeError", "El archivo es demasiado grande")
                : t("general.uploadSizeError", "La imagen es demasiado grande")
            : code === "storage-full"
            ? t("dashboard.storageFullAction", "Almacenamiento lleno")
            : t("general.uploadError", "Error al cargar el archivo");
        status.dataset.state = "error";
        if (options.rethrow) throw err;
      } finally {
        saveBtn.disabled = false;
        tile.classList.remove("is-uploading");
        if (hooks.onContentResize) hooks.onContentResize();
      }
    };

    const uploadFiles = async (files) => {
      const selectedFiles = Array.from(files || []).filter(Boolean);
      if (!selectedFiles.length) return;
      if (!isMultiDocument) {
        await uploadFile(selectedFiles[0]);
        return;
      }
      if (selectedFiles.length > maxBatchFiles) {
        status.textContent = t("general.uploadBatchLimitError", "Puedes subir hasta 10 archivos a la vez");
        status.dataset.state = "error";
        saveBtn.hidden = true;
        fileInput.value = "";
        if (hooks.onContentResize) hooks.onContentResize();
        return;
      }

      saveBtn.disabled = true;
      tile.classList.add("is-uploading");
      try {
        const uploadedDocs = [];
        for (let index = 0; index < selectedFiles.length; index += 1) {
          status.textContent = t(
            "general.uploadingMany",
            (current, total) => `Subiendo ${current}/${total}...`
          )(index + 1, selectedFiles.length);
          status.dataset.state = "neutral";
          const uploadedDoc = await uploadFile(selectedFiles[index], {
            silent: true,
            deferRender: true,
            rethrow: true
          });
          if (uploadedDoc) uploadedDocs.push(uploadedDoc);
        }
        uploadedDocs.forEach(appendOtherDocRow);
        fileName.textContent = t("general.upload", "Cargar");
        saveBtn.hidden = true;
        fileInput.value = "";
        status.textContent = t("general.uploadSaved", "Archivo guardado");
        status.dataset.state = "ok";
        window.setTimeout(() => {
          status.textContent = "";
          status.dataset.state = "";
          if (hooks.onRefreshMachineDocuments) {
            hooks.onRefreshMachineDocuments();
          }
          if (hooks.onContentResize) hooks.onContentResize();
        }, 2200);
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
      if (!canUpload || (!isMultiDocument && currentUrl)) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.add("is-dragover");
    });

    tile.addEventListener("dragleave", (event) => {
      if (!canUpload || (!isMultiDocument && currentUrl)) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.remove("is-dragover");
    });

    tile.addEventListener("drop", async (event) => {
      if (!canUpload || (!isMultiDocument && currentUrl)) return;
      event.preventDefault();
      event.stopPropagation();
      tile.classList.remove("is-dragover");
      const files = event.dataTransfer?.files || [];
      await uploadFiles(files);
    });

    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      const file = files[0];
      fileName.textContent = isMultiDocument && files.length > 1
        ? t("general.filesSelected", (count) => `${count} archivos seleccionados`)(files.length)
        : file
          ? file.name
          : savedDoc?.name || t("general.upload", "Cargar");
      tile.classList.toggle("is-file", !isMultiDocument && (!!file || !!savedDoc));
      saveBtn.hidden = !files.length;
      if (hooks.onContentResize) hooks.onContentResize();
    });

    saveBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await uploadFiles(fileInput.files || []);
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

      const deleteLink = document.createElement("a");
      deleteLink.href = "#";
      deleteLink.className = "mc-doc-menu-link mc-doc-menu-delete";
      deleteLink.textContent = t("general.delete", "Eliminar");
      deleteLink.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeDocMenus();
        await deleteDocument();
      });

      setupDocMenu(menu, dots);
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

  const otherDocs = Array.isArray(machine.documents?.other) ? machine.documents.other : [];
  const otherDocsSep = document.createElement("hr");
  otherDocsSep.className = "mc-doc-list-sep";
  manualWrap.appendChild(otherDocsSep);

  otherDocsList = document.createElement("div");
  otherDocsList.className = "mc-other-doc-list";
  if (otherDocs.length) {
    otherDocs.forEach(appendOtherDocRow);
  }
  manualWrap.appendChild(otherDocsList);

  panel.appendChild(manualWrap);
};
