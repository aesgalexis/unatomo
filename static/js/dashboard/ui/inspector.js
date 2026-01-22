import { actions } from "../state.js";
import { selectSelectedItem } from "../selectors.js";
import { equipmentTypes } from "../types.js";

export const createInspector = (store) => {
  const modal = document.createElement("div");
  modal.className = "dashboard-modal";
  modal.hidden = true;

  const header = document.createElement("div");
  header.className = "dashboard-modal-header";

  const title = document.createElement("div");
  title.className = "dashboard-modal-title";
  title.textContent = "Equipo";

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "dashboard-modal-actions";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-secondary";
  closeBtn.textContent = "Cancelar";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "Guardar";

  const tryClose = (force) => {
    const item = selectSelectedItem(store.getState());
    if (!force && (!item || !item.params?.capacityKg)) {
      errorText.textContent = "La capacidad es obligatoria.";
      capacityInput.classList.add("is-invalid");
      return;
    }
    store.dispatch(actions.setModalOpen(false));
  };

  closeBtn.addEventListener("click", () => tryClose(true));
  saveBtn.addEventListener("click", () => tryClose(false));

  actionsWrap.appendChild(saveBtn);
  actionsWrap.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(actionsWrap);

  const tabs = document.createElement("div");
  tabs.className = "dashboard-tabs";

  const tabGeneral = document.createElement("button");
  tabGeneral.type = "button";
  tabGeneral.className = "dashboard-tab is-active";
  tabGeneral.textContent = "General";

  const tabDetails = document.createElement("button");
  tabDetails.type = "button";
  tabDetails.className = "dashboard-tab";
  tabDetails.textContent = "Detalles";

  const tabRegister = document.createElement("button");
  tabRegister.type = "button";
  tabRegister.className = "dashboard-tab";
  tabRegister.textContent = "Registro";

  tabs.appendChild(tabGeneral);
  tabs.appendChild(tabDetails);
  tabs.appendChild(tabRegister);

  const content = document.createElement("div");
  content.className = "dashboard-tab-content";

  const generalPane = document.createElement("div");
  generalPane.className = "dashboard-pane is-active";

  const detailsPane = document.createElement("div");
  detailsPane.className = "dashboard-pane";

  const registerPane = document.createElement("div");
  registerPane.className = "dashboard-pane";

  const form = document.createElement("div");
  form.className = "dashboard-form";

  const capacityLabel = document.createElement("label");
  capacityLabel.textContent = "Capacidad (kg)";

  const capacityInput = document.createElement("input");
  capacityInput.type = "number";
  capacityInput.className = "field";
  capacityInput.placeholder = "0";
  capacityInput.required = true;
  capacityInput.maxLength = 4;
  capacityInput.style.width = "6ch";
  capacityInput.inputMode = "numeric";
  capacityInput.pattern = "\\d{0,4}";

  const errorText = document.createElement("div");
  errorText.className = "dashboard-form-error";
  errorText.textContent = "";

  capacityInput.addEventListener("input", () => {
    const item = selectSelectedItem(store.getState());
    if (!item) return;
    capacityInput.value = capacityInput.value.replace(/\D/g, "").slice(0, 4);
    capacityInput.classList.remove("is-invalid");
    errorText.textContent = "";
    store.dispatch(
      actions.updateItem(item.id, {
        params: {
          ...item.params,
          capacityKg: capacityInput.value,
        },
      })
    );
  });

  vaporInput.addEventListener("change", () => {
    const item = selectSelectedItem(store.getState());
    if (!item) return;
    store.dispatch(
      actions.updateItem(item.id, {
        params: {
          ...item.params,
          heatingVapor: vaporInput.checked,
        },
      })
    );
  });

  resistInput.addEventListener("change", () => {
    const item = selectSelectedItem(store.getState());
    if (!item) return;
    store.dispatch(
      actions.updateItem(item.id, {
        params: {
          ...item.params,
          heatingResist: resistInput.checked,
        },
      })
    );
  });

  form.appendChild(capacityLabel);
  form.appendChild(capacityInput);
  form.appendChild(errorText);
  generalPane.appendChild(form);

  const heatingGroup = document.createElement("div");
  heatingGroup.className = "dashboard-form";

  const heatingLabel = document.createElement("label");
  heatingLabel.textContent = "Calefacción";

  const heatingRow = document.createElement("div");
  heatingRow.className = "dashboard-checkbox-row";

  const vaporWrap = document.createElement("label");
  vaporWrap.className = "dashboard-checkbox";
  const vaporInput = document.createElement("input");
  vaporInput.type = "checkbox";
  const vaporText = document.createElement("span");
  vaporText.textContent = "Vapor";
  vaporWrap.appendChild(vaporInput);
  vaporWrap.appendChild(vaporText);

  const resistWrap = document.createElement("label");
  resistWrap.className = "dashboard-checkbox";
  const resistInput = document.createElement("input");
  resistInput.type = "checkbox";
  const resistText = document.createElement("span");
  resistText.textContent = "Resistencias";
  resistWrap.appendChild(resistInput);
  resistWrap.appendChild(resistText);

  heatingRow.appendChild(vaporWrap);
  heatingRow.appendChild(resistWrap);
  heatingGroup.appendChild(heatingLabel);
  heatingGroup.appendChild(heatingRow);

  generalPane.appendChild(heatingGroup);
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "dashboard-link-danger";
  deleteBtn.textContent = "Eliminar equipo";
  deleteBtn.addEventListener("click", () => {
    const item = selectSelectedItem(store.getState());
    if (!item) return;
    if (window.confirm("¿Seguro que quieres eliminar este equipo?")) {
      store.dispatch(actions.removeItem(item.id));
    }
  });

  detailsPane.appendChild(deleteBtn);
  registerPane.textContent = "Registro pendiente.";

  content.appendChild(generalPane);
  content.appendChild(detailsPane);
  content.appendChild(registerPane);

  tabGeneral.addEventListener("click", () => {
    tabGeneral.classList.add("is-active");
    tabDetails.classList.remove("is-active");
    generalPane.classList.add("is-active");
    detailsPane.classList.remove("is-active");
  });

  tabDetails.addEventListener("click", () => {
    tabDetails.classList.add("is-active");
    tabGeneral.classList.remove("is-active");
    tabRegister.classList.remove("is-active");
    detailsPane.classList.add("is-active");
    generalPane.classList.remove("is-active");
    registerPane.classList.remove("is-active");
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("is-active");
    tabGeneral.classList.remove("is-active");
    tabDetails.classList.remove("is-active");
    registerPane.classList.add("is-active");
    generalPane.classList.remove("is-active");
    detailsPane.classList.remove("is-active");
  });

  modal.appendChild(header);
  modal.appendChild(tabs);
  modal.appendChild(content);

  const render = () => {
    const state = store.getState();
    const item = selectSelectedItem(state);

    if (!state.ui.isModalOpen || !item) {
      modal.hidden = true;
      return;
    }

    const type = equipmentTypes[item.type];
    title.textContent = item.name || type.label;
    capacityInput.value = item.params?.capacityKg ?? "";
    const showHeating = item.type === "lavadora";
    heatingGroup.style.display = showHeating ? "grid" : "none";
    if (showHeating) {
      vaporInput.checked = Boolean(item.params?.heatingVapor);
      resistInput.checked = Boolean(item.params?.heatingResist);
    }
    if (!capacityInput.value) {
      errorText.textContent = "La capacidad es obligatoria.";
      capacityInput.classList.add("is-invalid");
    }
    const anchor = state.ui.modalAnchor;
    if (anchor) {
      modal.style.left = `${anchor.x}px`;
      modal.style.top = `${anchor.y}px`;
    }
    modal.hidden = false;
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      tryClose(true);
    }
  });

  store.subscribe(render);
  render();

  return modal;
};
