import { t } from "../../i18n.js";

export const openStatusIncidentModal = ({
  machineTitle = "",
  defaultTitle = "",
  defaultDescription = "",
  hasPendingTask = false
} = {}) =>
  new Promise((resolve) => {
    const previousActive = document.activeElement;
    const previousScrollY = window.scrollY || 0;
    const overlay = document.createElement("div");
    overlay.className = "status-incident-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "status-incident-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      t("dashboard.incidentModalTitle", "Poner máquina fuera de servicio")
    );

    const title = document.createElement("h2");
    title.className = "status-incident-title";
    title.textContent = t(
      "dashboard.incidentModalTitle",
      "Poner máquina fuera de servicio"
    );

    const machine = document.createElement("p");
    machine.className = "status-incident-machine";
    machine.textContent = machineTitle || t("machine.machine", "Equipo");

    const summary = document.createElement("p");
    summary.className = "status-incident-summary";
    const incidentSummary = hasPendingTask
      ? t(
          "dashboard.incidentModalSummaryExisting",
          "La máquina se marcará como fuera de servicio y conservará su tarea de reactivación pendiente. Al completarla, volverá a estar operativa."
        )
      : t(
          "dashboard.incidentModalSummary",
          "La máquina se marcará como fuera de servicio. También se creará una tarea de reactivación que, al completarse, volverá a ponerla operativa."
        );
    summary.textContent = incidentSummary;

    const header = document.createElement("div");
    header.className = "status-incident-header";
    const heading = document.createElement("div");
    heading.className = "status-incident-heading";
    const warningIcon = document.createElement("span");
    warningIcon.className = "status-incident-warning-icon";
    warningIcon.setAttribute("aria-hidden", "true");
    warningIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21.73 18 13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>' +
      '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
    heading.appendChild(title);
    heading.appendChild(machine);
    header.appendChild(heading);
    header.appendChild(warningIcon);

    const form = document.createElement("form");
    form.className = "status-incident-form";

    const disconnectChoice = document.createElement("label");
    disconnectChoice.className = "status-incident-disconnect-choice";
    const disconnectInput = document.createElement("input");
    disconnectInput.type = "checkbox";
    disconnectInput.className = "status-incident-disconnect-input";
    const disconnectText = document.createElement("span");
    disconnectText.textContent = t(
      "dashboard.incidentDisconnectChoice",
      "Desconectar"
    );
    disconnectChoice.appendChild(disconnectInput);
    disconnectChoice.appendChild(disconnectText);

    const details = document.createElement("div");
    details.className = "status-incident-details";

    const createField = ({ label, control }) => {
      const wrap = document.createElement("label");
      wrap.className = "status-incident-field";
      const text = document.createElement("span");
      text.textContent = label;
      wrap.appendChild(text);
      wrap.appendChild(control);
      return wrap;
    };

    const enableAutoGrow = (textarea) => {
      const resize = () => {
        textarea.style.height = "auto";
        const borderHeight = textarea.offsetHeight - textarea.clientHeight;
        textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
      };
      textarea.addEventListener("input", resize);
      return resize;
    };

    const taskTitle = document.createElement("input");
    taskTitle.className = "status-incident-input";
    taskTitle.type = "text";
    taskTitle.maxLength = 64;
    taskTitle.value =
      defaultTitle || t("tasks.restoreOperation", "Volver a poner la máquina en operatividad");
    taskTitle.setAttribute(
      "aria-label",
      t("dashboard.incidentTaskTitle", "Título de la tarea")
    );

    const description = document.createElement("textarea");
    description.className = "status-incident-textarea";
    description.maxLength = 1024;
    description.rows = 2;
    description.value = defaultDescription;
    description.placeholder = t(
      "dashboard.incidentDescriptionPlaceholder",
      "¿Qué le ocurre a la máquina?"
    );
    description.setAttribute(
      "aria-label",
      t("dashboard.incidentDescription", "Motivo")
    );

    const followup = document.createElement("div");
    followup.className = "status-incident-followup";
    const followupTitle = document.createElement("h3");
    followupTitle.className = "status-incident-followup-title";
    followupTitle.textContent = t(
      "dashboard.incidentFollowupTitle",
      "Tarea de reactivación"
    );
    const followupHelp = document.createElement("p");
    followupHelp.className = "status-incident-followup-help";
    followupHelp.textContent = hasPendingTask
      ? t(
          "dashboard.incidentFollowupHelpExisting",
          "Se conservarán sus notas e imágenes. Al completar la tarea, la máquina volverá a estar operativa."
        )
      : t(
          "dashboard.incidentFollowupHelp",
          "Esta tarea se crea automáticamente. Al completarla, la máquina volverá a estar operativa."
        );
    followup.appendChild(followupTitle);
    followup.appendChild(followupHelp);

    const note = document.createElement("textarea");
    note.className = "status-incident-textarea status-incident-note";
    note.maxLength = 512;
    note.rows = 2;
    note.placeholder = "";
    note.setAttribute(
      "aria-label",
      t("dashboard.incidentNote", "Nota")
    );
    const resizeDescription = enableAutoGrow(description);
    const resizeNote = enableAutoGrow(note);
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
    imageBox.addEventListener("dragleave", () => {
      imageBox.classList.remove("is-dragover");
    });
    imageBox.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageBox.classList.remove("is-dragover");
      setSelectedImages(event.dataTransfer?.files || []);
    });
    imageInput.addEventListener("change", () => {
      setSelectedImages(imageInput.files || []);
    });
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
    confirm.className = "status-incident-confirm";
    confirm.textContent = t("dashboard.incidentConfirm", "Poner fuera de servicio");

    disconnectInput.addEventListener("change", () => {
      const disconnected = disconnectInput.checked;
      details.hidden = disconnected;
      dialog.classList.toggle("is-disconnected", disconnected);
      const modalTitle = disconnected
        ? t("dashboard.incidentDisconnectTitle", "Marcar máquina como desconectada")
        : t("dashboard.incidentModalTitle", "Poner máquina fuera de servicio");
      title.textContent = modalTitle;
      dialog.setAttribute("aria-label", modalTitle);
      summary.textContent = disconnected
        ? t(
            "dashboard.incidentDisconnectSummary",
            "La máquina se registrará como desconectada. No se creará ninguna tarea."
          )
        : incidentSummary;
      confirm.textContent = disconnected
        ? t("dashboard.incidentDisconnectConfirm", "Desconectar")
        : t("dashboard.incidentConfirm", "Poner fuera de servicio");
      confirm.classList.toggle("status-incident-confirm-disconnected", disconnected);
    });

    actions.appendChild(cancel);
    actions.appendChild(confirm);

    form.appendChild(summary);
    details.appendChild(createField({
      label: t("dashboard.incidentDescription", "Motivo"),
      control: description
    }));
    details.appendChild(followup);
    details.appendChild(createField({
      label: t("dashboard.incidentTaskTitle", "Título de la tarea"),
      control: taskTitle
    }));
    details.appendChild(createField({
      label: t("dashboard.incidentNote", "Nota"),
      control: note
    }));
    details.appendChild(imageBox);
    details.appendChild(imageInput);
    form.appendChild(details);
    form.appendChild(disconnectChoice);
    form.appendChild(actions);

    dialog.appendChild(header);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.setProperty(
      "--status-incident-scroll-top",
      `${-previousScrollY}px`
    );
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

    const submit = () => {
      const disconnected = disconnectInput.checked;
      cleanup({
        disconnected,
        title: disconnected ? "" : taskTitle.value,
        description: disconnected ? "" : description.value,
        note: disconnected ? "" : note.value,
        images: disconnected ? [] : selectedImages
      });
    };

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      }
    }

    cancel.addEventListener("click", () => cleanup(null));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit();
    });
    document.addEventListener("keydown", onKeyDown, true);

    window.requestAnimationFrame(() => {
      resizeDescription();
      resizeNote();
      description.focus({ preventScroll: true });
    });
  });
