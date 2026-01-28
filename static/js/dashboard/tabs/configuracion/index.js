import { render as renderTag } from "./tag.js";
import { render as renderUsuarios } from "./usuarios.js";
import { render as renderNotificaciones } from "./notificaciones.js";
export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";

  const tagPanel = document.createElement("div");
  tagPanel.className = "mc-config-panel";
  renderTag(tagPanel, machine, hooks, options);

  const sep1 = document.createElement("hr");
  sep1.className = "mc-sep";

  const usersPanel = document.createElement("div");
  usersPanel.className = "mc-config-panel";
  renderUsuarios(usersPanel, machine, hooks, options);

  const sep2 = document.createElement("hr");
  sep2.className = "mc-sep";

  const notifsPanel = document.createElement("div");
  notifsPanel.className = "mc-config-panel";
  renderNotificaciones(notifsPanel, machine, hooks, options);

  panel.appendChild(tagPanel);
  panel.appendChild(sep1);
  panel.appendChild(usersPanel);
  panel.appendChild(sep2);
  panel.appendChild(notifsPanel);
};
