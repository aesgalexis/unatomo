import { t } from "../../i18n.js";

export const openOperationalReturnModal = ({
  machineTitle = "",
  completesTask = true,
  changesStatus = true
} = {}) =>
  new Promise((resolve) => {
    const previousActive = document.activeElement;
    const previousScrollY = window.scrollY || 0;
    const overlay = document.createElement("div");
    overlay.className = "status-incident-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "status-incident-dialog status-return-dialog";
    dialog.tabIndex = -1;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      t("dashboard.returnModalTitle", "Volver a poner la máquina operativa")
    );

    const title = document.createElement("h2");
    title.className = "status-incident-title";
    title.textContent = t(
      "dashboard.returnModalTitle",
      "Volver a poner la máquina operativa"
    );

    const machine = document.createElement("p");
    machine.className = "status-incident-machine";
    machine.textContent = machineTitle || t("machine.machine", "Equipo");

    const header = document.createElement("div");
    header.className = "status-incident-header";
    const heading = document.createElement("div");
    heading.className = "status-incident-heading";
    const statusIcon = document.createElement("span");
    statusIcon.className = "status-incident-warning-icon";
    statusIcon.setAttribute("aria-hidden", "true");
    statusIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>';
    heading.appendChild(title);
    heading.appendChild(machine);
    header.appendChild(heading);
    header.appendChild(statusIcon);

    const form = document.createElement("form");
    form.className = "status-incident-form";

    const summary = document.createElement("p");
    summary.className = "status-incident-summary";
    if (changesStatus && completesTask) {
      summary.textContent = t(
        "dashboard.returnModalSummary",
        "La máquina volverá a estar operativa y se completará su tarea de reactivación."
      );
    } else if (completesTask) {
      summary.textContent = t(
        "dashboard.returnModalTaskSummary",
        "Se completará la tarea de reactivación pendiente."
      );
    } else {
      summary.textContent = t(
        "dashboard.returnModalStatusSummary",
        "La máquina volverá a estar operativa."
      );
    }

    const field = document.createElement("label");
    field.className = "status-incident-field";
    const fieldLabel = document.createElement("span");
    fieldLabel.textContent = t("dashboard.returnModalNote", "Nota");
    const note = document.createElement("textarea");
    note.className = "status-incident-textarea";
    note.maxLength = 512;
    note.rows = 2;
    note.placeholder = t(
      "dashboard.returnModalNotePlaceholder",
      "¿Qué se hizo para volver a poner la máquina operativa?"
    );
    note.setAttribute("aria-label", t("dashboard.returnModalNote", "Nota"));
    const resizeNote = () => {
      note.style.height = "auto";
      const borderHeight = note.offsetHeight - note.clientHeight;
      note.style.height = `${note.scrollHeight + borderHeight}px`;
    };
    note.addEventListener("input", resizeNote);
    field.appendChild(fieldLabel);
    field.appendChild(note);

    const imageBox = document.createElement("div");
    imageBox.className = "status-incident-image-box";
    imageBox.setAttribute("role", "button");
    imageBox.tabIndex = 0;
    imageBox.setAttribute(
      "aria-label",
      t("dashboard.incidentAddImages", "Añadir imágenes")
    );
    const imageIcon = document.createElement("span");
    imageIcon.className = "status-incident-image-icon";
    imageIcon.dataset.symbol = "+";
    const imageAction = document.createElement("span");
    imageAction.className = "status-incident-image-action";
    imageAction.textContent = t("dashboard.incidentAddImages", "Añadir imágenes");
    const imageInput = document.createElement("input");
    imageInput.className = "status-incident-image-input";
    imageInput.type = "file";
    imageInput.accept = "image/jpeg,image/png,image/webp";
    imageInput.multiple = true;
    let selectedImages = [];

    const setSelectedImages = (files) => {
      selectedImages = Array.from(files || [])
        .filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type))
        .slice(0, 10);
      imageAction.textContent = selectedImages.length
        ? t(
            "dashboard.incidentImagesSelected",
            (count) => `${count} imágenes seleccionadas`
          )(selectedImages.length)
        : t("dashboard.incidentAddImages", "Añadir imágenes");
      imageBox.classList.toggle("has-files", selectedImages.length > 0);
    };
    const openImagePicker = () => imageInput.click();
    imageBox.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openImagePicker();
    });
    imageBox.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      openImagePicker();
    });
    imageBox.addEventListener("dragover", (event) => {
      event.preventDefault();
      imageBox.classList.add("is-dragover");
    });
    imageBox.addEventListener("dragleave", () => imageBox.classList.remove("is-dragover"));
    imageBox.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageBox.classList.remove("is-dragover");
      setSelectedImages(event.dataTransfer?.files || []);
    });
    imageInput.addEventListener("change", () => setSelectedImages(imageInput.files || []));
    imageBox.appendChild(imageIcon);
    imageBox.appendChild(imageAction);

    const actions = document.createElement("div");
    actions.className = "status-incident-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "status-incident-cancel";
    cancel.textContent = t("dashboard.cancel", "Cancelar");
    const confirm = document.createElement("button");
    confirm.type = "submit";
    confirm.className = "status-incident-confirm status-return-confirm";
    confirm.textContent = t("dashboard.confirm", "Confirmar");
    actions.appendChild(cancel);
    actions.appendChild(confirm);

    form.appendChild(summary);
    form.appendChild(field);
    form.appendChild(imageBox);
    form.appendChild(imageInput);
    form.appendChild(actions);
    dialog.appendChild(header);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.setProperty("--status-incident-scroll-top", `${-previousScrollY}px`);
    document.body.classList.add("status-incident-open");

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.classList.remove("status-incident-open");
      document.body.style.removeProperty("--status-incident-scroll-top");
      overlay.remove();
      window.scrollTo(0, previousScrollY);
      if (previousActive && typeof previousActive.focus === "function") {
        try {
          previousActive.focus({ preventScroll: true });
        } catch {
          previousActive.focus();
        }
      }
      resolve(value);
    };
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cleanup(null);
    }
    cancel.addEventListener("click", () => cleanup(null));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      cleanup({ note: note.value, images: selectedImages });
    });
    document.addEventListener("keydown", onKeyDown, true);
    window.requestAnimationFrame(() => {
      resizeNote();
      const avoidEditableAutofocus = window.matchMedia?.(
        "(max-width: 700px), (pointer: coarse)"
      )?.matches;
      if (avoidEditableAutofocus) {
        overlay.scrollTop = 0;
        dialog.scrollTop = 0;
        dialog.focus({ preventScroll: true });
        window.requestAnimationFrame(() => {
          overlay.scrollTop = 0;
          dialog.scrollTop = 0;
        });
        return;
      }
      note.focus({ preventScroll: true });
    });
  });
