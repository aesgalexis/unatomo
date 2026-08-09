import { t } from "../../i18n.js";

const ACCEPT_BY_TYPE = {
  image: "image/jpeg,image/png,image/webp",
  manual: "application/pdf",
  other: "application/pdf,image/jpeg,image/png,image/webp"
};

const getUploadError = (error) => {
  const code = `${error?.message || error?.code || ""}`;
  if (code.includes("storage-full")) {
    return t("dashboard.storageFullAction", "Almacenamiento lleno");
  }
  if (code.includes("file-too-large")) {
    return t("dashboard.galleryUploadTooLarge", "El archivo es demasiado grande");
  }
  if (code.includes("file-type")) {
    return t("dashboard.galleryUploadWrongType", "El tipo de archivo no es compatible");
  }
  return t("dashboard.galleryUploadError", "No se pudo subir el archivo");
};

const openGalleryUploadSurface = ({
  machines = [],
  defaultMachineId = "",
  inlineContainer = null,
  onUpload
} = {}) =>
  new Promise((resolve) => {
    const isInline = inlineContainer instanceof HTMLElement;
    const previousActive = document.activeElement;
    const previousScrollY = window.scrollY || 0;
    const overlay = isInline ? null : document.createElement("div");
    if (overlay) {
      overlay.className = "status-incident-overlay";
      overlay.setAttribute("role", "presentation");
    }

    const dialog = document.createElement("section");
    dialog.className = `status-incident-dialog gallery-upload-dialog${isInline ? " is-inline" : ""}`;
    dialog.tabIndex = -1;
    dialog.setAttribute("role", isInline ? "region" : "dialog");
    if (!isInline) dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      t("dashboard.galleryUploadTitle", "Subir archivo a una máquina")
    );

    const header = document.createElement("div");
    header.className = "status-incident-header";
    const heading = document.createElement("div");
    heading.className = "status-incident-heading";
    const title = document.createElement("h2");
    title.className = "status-incident-title";
    title.textContent = t("dashboard.galleryUploadTitle", "Subir archivo a una máquina");
    const subtitle = document.createElement("p");
    subtitle.className = "status-incident-machine";
    subtitle.textContent = t("dashboard.galleryTitle", "Galería");
    heading.appendChild(title);
    heading.appendChild(subtitle);
    const icon = document.createElement("span");
    icon.className = "status-incident-warning-icon gallery-upload-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/>' +
      '<path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>';
    header.appendChild(heading);
    header.appendChild(icon);

    const form = document.createElement("form");
    form.className = "status-incident-form";
    const summary = document.createElement("p");
    summary.className = "status-incident-summary gallery-upload-summary";
    summary.textContent = t(
      "dashboard.galleryUploadSummary",
      "Selecciona la máquina, el tipo de documento y el archivo que quieres subir."
    );

    const createSelectField = (labelText, select) => {
      const label = document.createElement("label");
      label.className = "status-incident-field";
      const text = document.createElement("span");
      text.textContent = labelText;
      label.appendChild(text);
      label.appendChild(select);
      return label;
    };

    const machineSelect = document.createElement("select");
    machineSelect.className = "status-incident-input gallery-upload-select";
    const machinePlaceholder = document.createElement("option");
    machinePlaceholder.value = "";
    machinePlaceholder.textContent = t("dashboard.galleryUploadChooseMachine", "Selecciona una máquina");
    machineSelect.appendChild(machinePlaceholder);
    [...machines]
      .sort((left, right) => String(left.title || "").localeCompare(String(right.title || "")))
      .forEach((machine) => {
        const option = document.createElement("option");
        option.value = machine.id;
        option.textContent = machine.title || machine.id || t("machine.machine", "Máquina");
        machineSelect.appendChild(option);
      });
    if (machines.some((machine) => machine.id === defaultMachineId)) {
      machineSelect.value = defaultMachineId;
    }

    const typeSelect = document.createElement("select");
    typeSelect.className = "status-incident-input gallery-upload-select";
    [
      ["", t("dashboard.galleryUploadChooseType", "Selecciona un tipo")],
      ["image", t("dashboard.galleryUploadImage", "Imagen")],
      ["manual", t("dashboard.galleryUploadManual", "Manual")],
      ["other", t("dashboard.galleryUploadOther", "Otra documentación")]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      typeSelect.appendChild(option);
    });

    const fileBox = document.createElement("div");
    fileBox.className = "status-incident-image-box gallery-upload-file-box is-disabled";
    fileBox.setAttribute("role", "button");
    fileBox.tabIndex = -1;
    fileBox.setAttribute("aria-disabled", "true");
    const fileIcon = document.createElement("span");
    fileIcon.className = "status-incident-image-icon";
    fileIcon.dataset.symbol = "+";
    const fileAction = document.createElement("span");
    fileAction.className = "status-incident-image-action";
    fileAction.textContent = t("dashboard.galleryUploadSelectFile", "Seleccionar archivo");
    const fileInput = document.createElement("input");
    fileInput.className = "status-incident-image-input";
    fileInput.type = "file";
    let selectedFile = null;

    const syncFileBox = () => {
      fileBox.classList.remove("is-disabled");
      fileBox.tabIndex = 0;
      fileBox.setAttribute("aria-disabled", "false");
      fileInput.accept = ACCEPT_BY_TYPE[typeSelect.value] || "";
      if (typeSelect.value && selectedFile && !fileInput.accept.split(",").includes(selectedFile.type)) {
        selectedFile = null;
        fileInput.value = "";
      }
      fileBox.classList.toggle("has-files", !!selectedFile);
      fileAction.textContent = selectedFile?.name ||
        t("dashboard.galleryUploadSelectFile", "Seleccionar archivo");
      confirm.disabled = !(machineSelect.value && typeSelect.value && selectedFile);
    };
    const setSelectedFile = (file) => {
      if (!file) return;
      const allowed = (ACCEPT_BY_TYPE[typeSelect.value] || "").split(",");
      if (typeSelect.value && !allowed.includes(file.type)) {
        selectedFile = null;
        fileInput.value = "";
        fileAction.textContent = t(
          "dashboard.galleryUploadWrongType",
          "El tipo de archivo no es compatible"
        );
        fileBox.classList.remove("has-files");
        syncFileBox();
        return;
      }
      selectedFile = file;
      syncFileBox();
    };
    const openFilePicker = () => {
      fileInput.click();
    };
    fileBox.addEventListener("click", (event) => {
      event.preventDefault();
      openFilePicker();
    });
    fileBox.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openFilePicker();
    });
    fileBox.addEventListener("dragover", (event) => {
      event.preventDefault();
      fileBox.classList.add("is-dragover");
    });
    fileBox.addEventListener("dragleave", () => fileBox.classList.remove("is-dragover"));
    fileBox.addEventListener("drop", (event) => {
      event.preventDefault();
      fileBox.classList.remove("is-dragover");
      setSelectedFile(event.dataTransfer?.files?.[0]);
    });
    fileInput.addEventListener("change", () => setSelectedFile(fileInput.files?.[0]));
    machineSelect.addEventListener("change", syncFileBox);
    typeSelect.addEventListener("change", syncFileBox);
    fileBox.appendChild(fileIcon);
    fileBox.appendChild(fileAction);

    const status = document.createElement("p");
    status.className = "gallery-upload-status";
    status.hidden = true;
    const actions = document.createElement("div");
    actions.className = "status-incident-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "status-incident-cancel";
    cancel.textContent = t("dashboard.cancel", "Cancelar");
    const confirm = document.createElement("button");
    confirm.type = "submit";
    confirm.className = "status-incident-confirm gallery-upload-confirm";
    confirm.textContent = t("dashboard.galleryUploadSubmit", "Subir archivo");
    actions.appendChild(cancel);
    actions.appendChild(confirm);

    form.appendChild(summary);
    form.appendChild(createSelectField(
      t("dashboard.galleryUploadMachine", "Máquina"),
      machineSelect
    ));
    form.appendChild(createSelectField(
      t("dashboard.galleryUploadType", "Tipo"),
      typeSelect
    ));
    form.appendChild(fileBox);
    form.appendChild(fileInput);
    form.appendChild(status);
    form.appendChild(actions);
    dialog.appendChild(header);
    dialog.appendChild(form);
    if (isInline) {
      inlineContainer.prepend(dialog);
    } else {
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      document.body.style.setProperty("--status-incident-scroll-top", `${-previousScrollY}px`);
      document.body.classList.add("status-incident-open");
    }

    let submitting = false;
    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (isInline) {
        dialog.remove();
      } else {
        document.body.classList.remove("status-incident-open");
        document.body.style.removeProperty("--status-incident-scroll-top");
        overlay.remove();
        window.scrollTo(0, previousScrollY);
      }
      previousActive?.focus?.({ preventScroll: true });
      resolve(value);
    };
    function onKeyDown(event) {
      if (event.key !== "Escape" || submitting) return;
      event.preventDefault();
      cleanup(null);
    }
    cancel.addEventListener("click", () => {
      if (!submitting) cleanup(null);
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!machineSelect.value || !typeSelect.value || !selectedFile || submitting) {
        status.hidden = false;
        status.dataset.state = "error";
        status.textContent = t("dashboard.galleryUploadComplete", "Completa todos los campos");
        return;
      }
      submitting = true;
      confirm.disabled = true;
      cancel.disabled = true;
      machineSelect.disabled = true;
      typeSelect.disabled = true;
      fileBox.classList.add("is-disabled");
      status.hidden = false;
      status.dataset.state = "neutral";
      status.textContent = t("dashboard.galleryUploadUploading", "Subiendo...");
      try {
        const kind = typeSelect.value === "manual" ? "manual" : "other";
        const uploaded = await onUpload?.({
          machineId: machineSelect.value,
          kind,
          file: selectedFile
        });
        cleanup(uploaded || true);
      } catch (error) {
        submitting = false;
        confirm.disabled = false;
        cancel.disabled = false;
        machineSelect.disabled = false;
        typeSelect.disabled = false;
        fileBox.classList.remove("is-disabled");
        status.dataset.state = "error";
        status.textContent = getUploadError(error);
      }
    });
    document.addEventListener("keydown", onKeyDown, true);
    syncFileBox();
    window.requestAnimationFrame(() => {
      const coarse = window.matchMedia?.("(max-width: 700px), (pointer: coarse)")?.matches;
      (coarse ? dialog : machineSelect).focus({ preventScroll: true });
    });
  });

export const openGalleryUploadModal = (options = {}) =>
  openGalleryUploadSurface({ ...options, inlineContainer: null });

export const openGalleryUploadBox = ({ container, ...options } = {}) =>
  openGalleryUploadSurface({ ...options, inlineContainer: container });
