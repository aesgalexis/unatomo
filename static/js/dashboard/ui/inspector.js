import { actions } from "../state.js";
import { selectSelectedItem } from "../selectors.js";
import { equipmentTypes } from "../types.js";

export const createInspector = (store) => {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.hidden = true;

  const modal = document.createElement("div");
  modal.className = "dashboard-modal";

  const header = document.createElement("div");
  header.className = "dashboard-modal-header";

  const title = document.createElement("div");
  title.className = "dashboard-modal-title";
  title.textContent = "Equipo";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-secondary";
  closeBtn.textContent = "Cerrar";
  closeBtn.addEventListener("click", () => {
    store.dispatch(actions.setModalOpen(false));
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

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

  tabs.appendChild(tabGeneral);
  tabs.appendChild(tabDetails);

  const content = document.createElement("div");
  content.className = "dashboard-tab-content";

  const generalPane = document.createElement("div");
  generalPane.className = "dashboard-pane is-active";

  const detailsPane = document.createElement("div");
  detailsPane.className = "dashboard-pane";

  const form = document.createElement("div");
  form.className = "dashboard-form";

  const capacityLabel = document.createElement("label");
  capacityLabel.textContent = "Capacidad (kg)";

  const capacityInput = document.createElement("input");
  capacityInput.type = "number";
  capacityInput.className = "field";
  capacityInput.placeholder = "0";

  capacityInput.addEventListener("input", () => {
    const item = selectSelectedItem(store.getState());
    if (!item) return;
    store.dispatch(
      actions.updateItem(item.id, {
        params: {
          ...item.params,
          capacityKg: capacityInput.value,
        },
      })
    );
  });

  form.appendChild(capacityLabel);
  form.appendChild(capacityInput);
  generalPane.appendChild(form);
  detailsPane.textContent = "Más parámetros próximamente.";

  content.appendChild(generalPane);
  content.appendChild(detailsPane);

  tabGeneral.addEventListener("click", () => {
    tabGeneral.classList.add("is-active");
    tabDetails.classList.remove("is-active");
    generalPane.classList.add("is-active");
    detailsPane.classList.remove("is-active");
  });

  tabDetails.addEventListener("click", () => {
    tabDetails.classList.add("is-active");
    tabGeneral.classList.remove("is-active");
    detailsPane.classList.add("is-active");
    generalPane.classList.remove("is-active");
  });

  modal.appendChild(header);
  modal.appendChild(tabs);
  modal.appendChild(content);
  overlay.appendChild(modal);

  const render = () => {
    const state = store.getState();
    const item = selectSelectedItem(state);

    if (!state.ui.isModalOpen || !item) {
      overlay.hidden = true;
      return;
    }

    const type = equipmentTypes[item.type];
    title.textContent = type.label;
    capacityInput.value = item.params?.capacityKg ?? "";
    overlay.hidden = false;
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      store.dispatch(actions.setModalOpen(false));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      store.dispatch(actions.setModalOpen(false));
    }
  });

  store.subscribe(render);
  render();

  return overlay;
};
