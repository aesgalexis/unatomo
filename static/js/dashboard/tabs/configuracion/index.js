import { render as renderTag } from "./tag.js";
import { render as renderUsuarios } from "./usuarios.js";
import { render as renderNotificaciones } from "./notificaciones.js";
import { render as renderOtros } from "./otros.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";

  const subTabs = document.createElement("div");
  subTabs.className = "mc-config-tabs";

  const subTabTag = document.createElement("button");
  subTabTag.type = "button";
  subTabTag.className = "mc-config-tab";
  subTabTag.textContent = "Tag";

  const subTabUsers = document.createElement("button");
  subTabUsers.type = "button";
  subTabUsers.className = "mc-config-tab";
  subTabUsers.textContent = "Usuarios";

  const subTabNotifs = document.createElement("button");
  subTabNotifs.type = "button";
  subTabNotifs.className = "mc-config-tab";
  subTabNotifs.textContent = "Notificaciones";

  const subTabOtros = document.createElement("button");
  subTabOtros.type = "button";
  subTabOtros.className = "mc-config-tab";
  subTabOtros.textContent = "Otros";

  subTabs.appendChild(subTabTag);
  subTabs.appendChild(subTabUsers);
  subTabs.appendChild(subTabNotifs);
  subTabs.appendChild(subTabOtros);

  const tagPanel = document.createElement("div");
  tagPanel.className = "mc-config-panel";
  tagPanel.dataset.subpanel = "tag";

  const usersPanel = document.createElement("div");
  usersPanel.className = "mc-config-panel";
  usersPanel.dataset.subpanel = "usuarios";

  const notifsPanel = document.createElement("div");
  notifsPanel.className = "mc-config-panel";
  notifsPanel.dataset.subpanel = "notificaciones";

  const otrosPanel = document.createElement("div");
  otrosPanel.className = "mc-config-panel";
  otrosPanel.dataset.subpanel = "otros";

  renderTag(tagPanel, machine, hooks, options);
  renderUsuarios(usersPanel, machine, hooks, options);
  renderNotificaciones(notifsPanel, machine, hooks, options);
  renderOtros(otrosPanel, machine, hooks, options);

  panel.appendChild(subTabs);
  panel.appendChild(tagPanel);
  panel.appendChild(usersPanel);
  panel.appendChild(notifsPanel);
  panel.appendChild(otrosPanel);

  const setSubtab = (key) => {
    const tabs = [subTabTag, subTabUsers, subTabNotifs, subTabOtros];
    tabs.forEach((t) => t.classList.remove("is-active"));
    if (key === "usuarios") subTabUsers.classList.add("is-active");
    else if (key === "notificaciones") subTabNotifs.classList.add("is-active");
    else if (key === "otros") subTabOtros.classList.add("is-active");
    else subTabTag.classList.add("is-active");

    tagPanel.style.display = key === "tag"  "" : "none";
    usersPanel.style.display = key === "usuarios"  "" : "none";
    notifsPanel.style.display = key === "notificaciones"  "" : "none";
    otrosPanel.style.display = key === "otros"  "" : "none";
    if (hooks.onSelectConfigSubtab) hooks.onSelectConfigSubtab(machine.id, key);
  };

  const initialSubtab = options.configSubtab || "tag";
  setSubtab(initialSubtab);

  subTabTag.addEventListener("click", (event) => {
    event.stopPropagation();
    setSubtab("tag");
  });
  subTabUsers.addEventListener("click", (event) => {
    event.stopPropagation();
    setSubtab("usuarios");
  });
  subTabNotifs.addEventListener("click", (event) => {
    event.stopPropagation();
    setSubtab("notificaciones");
  });
  subTabOtros.addEventListener("click", (event) => {
    event.stopPropagation();
    setSubtab("otros");
  });
};
