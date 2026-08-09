import { t } from "../../i18n.js";
import { createStatusFormModalShell } from "../statusFormModal/statusFormModalShell.js";

const USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3.5 19c.8-3.3 2.6-5 5.5-5s4.7 1.7 5.5 5M18 8v6M15 11h6"/></svg>';

export const openUserCreateModal = ({ contextLabel = "", machineCount = 0, onCreate } = {}) => {
  const isEn = document.documentElement.lang?.toLowerCase().startsWith("en");
  const tx = (es, en) => isEn ? en : es;
  const shell = createStatusFormModalShell({
    title: tx("Nuevo usuario local", "New local user"),
    subtitle: contextLabel || t("dashboard.navUsers", "Usuarios"),
    summary: tx(
      `Se añadirá a las ${machineCount} máquinas de este espacio.`,
      `It will be added to all ${machineCount} machines in this space.`
    ),
    iconSvg: USER_ICON,
    className: "user-create-dialog"
  });
  const form = document.createElement("form");
  form.className = "status-incident-form user-create-modal-form";
  const name = document.createElement("input");
  name.className = "status-incident-input";
  name.required = true;
  name.maxLength = 60;
  name.placeholder = tx("Nombre", "Name");
  const pin = document.createElement("input");
  pin.className = "status-incident-input";
  pin.required = true;
  pin.type = "password";
  pin.inputMode = "numeric";
  pin.autocomplete = "new-password";
  pin.placeholder = "PIN";
  const role = document.createElement("select");
  role.className = "status-incident-input gallery-upload-select";
  [["operator", tx("Operario", "Operator")], ["technician", tx("Técnico", "Technician")]]
    .forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      role.appendChild(option);
    });
  const actions = document.createElement("div");
  actions.className = "status-incident-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "status-incident-cancel";
  cancel.textContent = tx("Cancelar", "Cancel");
  cancel.addEventListener("click", shell.close);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "status-incident-confirm user-create-modal-confirm";
  submit.textContent = tx("Crear", "Create");
  submit.disabled = true;
  const status = document.createElement("p");
  status.className = "gallery-upload-status";
  status.hidden = true;
  const syncSubmit = () => {
    submit.disabled = !(name.value.trim() && pin.value && role.value);
  };
  name.addEventListener("input", syncSubmit);
  pin.addEventListener("input", syncSubmit);
  role.addEventListener("change", syncSubmit);
  actions.append(cancel, submit);
  form.append(name, pin, role, status, actions);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    const created = await onCreate?.({ username: name.value, pin: pin.value, role: role.value }, submit);
    if (created !== false) {
      shell.close();
      return;
    }
    status.hidden = false;
    status.dataset.state = "error";
    status.textContent = t("dashboard.usersSaveError", "No se pudo guardar el usuario");
  });
  shell.content.appendChild(form);
  window.requestAnimationFrame(() => name.focus({ preventScroll: true }));
};
