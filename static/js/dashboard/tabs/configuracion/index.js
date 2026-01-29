import { render as renderTag } from "./tag.js";
import { render as renderUsuarios } from "./usuarios.js";
import { render as renderNotificaciones } from "./notificaciones.js";
export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";

  const tagPanel = document.createElement("div");
  tagPanel.className = "mc-config-panel";
  renderTag(tagPanel, machine, hooks, options);

  const usersPanel = document.createElement("div");
  usersPanel.className = "mc-config-panel";
  renderUsuarios(usersPanel, machine, hooks, options);

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
  removeLink.textContent = "Eliminar equipo";
  removeLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hooks.onRemoveMachine) hooks.onRemoveMachine(machine);
  });
  removeRow.appendChild(removeLink);

  panel.appendChild(tagPanel);
  panel.appendChild(usersPanel);
  panel.appendChild(sep2);
  panel.appendChild(notifsPanel);
  panel.appendChild(sep3);
  panel.appendChild(removeRow);
};
