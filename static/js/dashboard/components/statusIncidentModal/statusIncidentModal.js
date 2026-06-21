import { t } from "../../i18n.js";

export const openStatusIncidentModal = ({
  machineTitle = "",
  defaultTitle = ""
} = {}) =>
  new Promise((resolve) => {
    const previousActive = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "status-incident-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "status-incident-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      t("dashboard.incidentModalTitle", "Máquina fuera de servicio")
    );

    const title = document.createElement("h2");
    title.className = "status-incident-title";
    title.textContent = t("dashboard.incidentModalTitle", "Máquina fuera de servicio");

    const machine = document.createElement("p");
    machine.className = "status-incident-machine";
    machine.textContent = machineTitle || t("machine.machine", "Equipo");

    const form = document.createElement("form");
    form.className = "status-incident-form";

    const createField = ({ label, control }) => {
      const wrap = document.createElement("label");
      wrap.className = "status-incident-field";
      const text = document.createElement("span");
      text.textContent = label;
      wrap.appendChild(text);
      wrap.appendChild(control);
      return wrap;
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
    description.rows = 4;
    description.placeholder = t(
      "dashboard.incidentDescriptionPlaceholder",
      "¿Qué le ocurre a la máquina?"
    );
    description.setAttribute(
      "aria-label",
      t("dashboard.incidentDescription", "Descripción")
    );

    const noteWrap = document.createElement("div");
    noteWrap.className = "status-incident-note-wrap";
    noteWrap.hidden = true;

    const note = document.createElement("textarea");
    note.className = "status-incident-textarea status-incident-note";
    note.maxLength = 512;
    note.rows = 3;
    note.placeholder = "";
    note.setAttribute("aria-label", t("dashboard.incidentNote", "Nota"));
    noteWrap.appendChild(createField({
      label: t("dashboard.incidentNote", "Nota"),
      control: note
    }));

    const addNote = document.createElement("button");
    addNote.type = "button";
    addNote.className = "status-incident-add-note";
    addNote.textContent = t("dashboard.incidentAddNote", "Añadir nota");
    addNote.addEventListener("click", () => {
      noteWrap.hidden = false;
      addNote.hidden = true;
      window.requestAnimationFrame(() => note.focus({ preventScroll: true }));
    });

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
    confirm.textContent = t("dashboard.confirm", "Confirmar");

    actions.appendChild(cancel);
    actions.appendChild(confirm);

    form.appendChild(createField({
      label: t("dashboard.incidentTaskTitle", "Título de la tarea"),
      control: taskTitle
    }));
    form.appendChild(createField({
      label: t("dashboard.incidentDescription", "Descripción"),
      control: description
    }));
    form.appendChild(addNote);
    form.appendChild(noteWrap);
    form.appendChild(imageBox);
    form.appendChild(imageInput);
    form.appendChild(actions);

    dialog.appendChild(title);
    dialog.appendChild(machine);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.classList.add("status-incident-open");

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.classList.remove("status-incident-open");
      overlay.remove();
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
      cleanup({
        title: taskTitle.value,
        description: description.value,
        note: note.value,
        images: selectedImages
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
      taskTitle.focus({ preventScroll: true });
      taskTitle.select();
    });
  });
