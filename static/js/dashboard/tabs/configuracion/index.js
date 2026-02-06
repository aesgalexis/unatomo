import { render as renderTag } from "./tag.js";
import { render as renderUsuarios } from "./usuarios.js";
import { render as renderNotificaciones } from "./notificaciones.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const isAdminView = options.role === "admin";

  const tagPanel = document.createElement("div");
  tagPanel.className = "mc-config-panel";
  renderTag(tagPanel, machine, hooks, options);

  const usersPanel = document.createElement("div");
  usersPanel.className = "mc-config-panel";
  renderUsuarios(usersPanel, machine, hooks, options);

  const adminPanel = document.createElement("div");
  adminPanel.className = "mc-config-panel";
  const adminHeader = document.createElement("div");
  adminHeader.className = "mc-config-row";
  const adminTitle = document.createElement("div");
  adminTitle.className = "mc-config-label";
  adminTitle.textContent = "Administrador";
  const btnPlaceholder = document.createElement("div");
  btnPlaceholder.className = "mc-admin-assign-wrap";

  const adminRow = document.createElement("div");
  adminRow.className = "mc-admin-row";
  const currentEmail = (machine.adminEmail || "").trim();
  const currentStatus = (machine.adminStatus || "").trim();

  const renderAdminForm = () => {
    adminRow.innerHTML = "";
    btnPlaceholder.innerHTML = "";
    const input = document.createElement("input");
    input.type = "email";
    input.className = "mc-admin-input";
    input.placeholder = "Correo electrónico";
    input.addEventListener("click", (event) => event.stopPropagation());

    const actions = document.createElement("div");
    actions.className = "mc-admin-actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "mc-location-accept";
    acceptBtn.textContent = "Aceptar";
    acceptBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const email = input.value.trim();
      if (!email) return;
      if (hooks.onUpdateAdmin) hooks.onUpdateAdmin(machine.id, email);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "mc-location-cancel";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      adminRow.innerHTML = "";
      btnPlaceholder.innerHTML = "";
      renderAdminButton();
    });

    actions.appendChild(acceptBtn);
    actions.appendChild(cancelBtn);
    btnPlaceholder.appendChild(input);
    btnPlaceholder.appendChild(actions);
    input.focus();
  };

  const renderAdminButton = () => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mc-admin-assign";
    btn.textContent = "Asignar";
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      renderAdminForm();
    });
    btnPlaceholder.appendChild(btn);
  };

  if (currentEmail) {
    btnPlaceholder.innerHTML = "";
    const line = document.createElement("div");
    line.className = "mc-user-row mc-admin-line";
    const email = document.createElement("span");
    email.className = "mc-user-name";
    email.textContent = currentEmail;
    const rolePlaceholder = document.createElement("select");
    rolePlaceholder.className = "mc-user-role";
    rolePlaceholder.disabled = true;
    rolePlaceholder.style.visibility = "hidden";
    const roleOpt = document.createElement("option");
    roleOpt.textContent = "Usuario";
    rolePlaceholder.appendChild(roleOpt);

    const pinWrap = document.createElement("div");
    pinWrap.className = "mc-user-pin-wrap";
    pinWrap.style.visibility = "hidden";
    const pinToggle = document.createElement("button");
    pinToggle.type = "button";
    pinToggle.className = "mc-user-pin-toggle";
    pinToggle.setAttribute("aria-label", "Cambiar PIN");
    pinToggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 1 1 8 0v3"></path></svg>`;
    pinWrap.appendChild(pinToggle);

    const remove = document.createElement("a");
    remove.className = "mc-user-remove";
    remove.href = "#";
    remove.textContent = "quitar";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onRemoveAdmin) hooks.onRemoveAdmin(machine.id);
    });
    const pinActions = document.createElement("div");
    pinActions.className = "mc-user-pin-actions";
    pinActions.style.visibility = "hidden";

    line.appendChild(email);
    line.appendChild(rolePlaceholder);
    line.appendChild(pinWrap);
    line.appendChild(remove);
    line.appendChild(pinActions);
    adminRow.appendChild(line);

    const status = document.createElement("div");
    status.className = "mc-admin-status";
    const statusText = (currentStatus || "Pendiente aceptaci\u00f3n").toString();
    const pendingNorm = statusText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    status.dataset.state = pendingNorm.startsWith("pendiente")
      ? "pending"
      : (currentStatus ? "error" : "pending");
    status.textContent = statusText;
    adminRow.appendChild(status);
  } else {
    renderAdminButton();
    if (currentStatus) {
      const status = document.createElement("div");
      status.className = "mc-admin-status";
      const statusText = currentStatus.toString();
      const pendingNorm = statusText
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      status.dataset.state = pendingNorm.startsWith("pendiente")
        ? "pending"
        : "error";
      status.textContent = statusText;
      adminRow.appendChild(status);
    }
  }

  adminHeader.appendChild(adminTitle);
  adminHeader.appendChild(btnPlaceholder);
  adminPanel.appendChild(adminHeader);
  adminPanel.appendChild(adminRow);

  const sepAdmin = document.createElement("hr");
  sepAdmin.className = "mc-sep";

  const sep2 = document.createElement("hr");
  sep2.className = "mc-sep";

  const notifsPanel = document.createElement("div");
  notifsPanel.className = "mc-config-panel";
  renderNotificaciones(notifsPanel, machine, hooks, options);

  const sep3 = document.createElement("hr");
  sep3.className = "mc-sep";

  const removeRow = document.createElement("div");
  const removeLink = document.createElement("a");
  removeLink.className = "mc-log-download mc-danger-link";
  removeLink.href = "#";
  removeLink.textContent = isAdminView
    ? "Dejar de administrar"
    : "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isAdminView) {
      if (hooks.onLeaveAdmin) hooks.onLeaveAdmin(machine);
    } else if (hooks.onRemoveMachine) {
      hooks.onRemoveMachine(machine);
    }
  });
  removeRow.appendChild(removeLink);

  panel.appendChild(tagPanel);
  panel.appendChild(usersPanel);
  panel.appendChild(sepAdmin);
  panel.appendChild(adminPanel);
  panel.appendChild(sep2);
  panel.appendChild(notifsPanel);
  panel.appendChild(sep3);
  panel.appendChild(removeRow);
};
