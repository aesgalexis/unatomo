import { buildMachineCardTemplate } from "./machineCardTemplate.js";
import { STATUS_LABELS } from "./machineCardTypes.js";
import { render as renderQuehaceres } from "../../tabs/tareas.js";
import { render as renderGeneral } from "../../tabs/general.js";
import { render as renderHistorial } from "../../tabs/historial.js";
import { render as renderConfiguracion } from "../../tabs/configuracion/index.js";

const TAB_RENDER = {
  quehaceres: renderQuehaceres,
  general: renderGeneral,
  historial: renderHistorial,
  configuracion: renderConfiguracion
};

export const createMachineCard = (machine, options = {}) => {
  const card = buildMachineCardTemplate();
  card.dataset.machineId = machine.id;
  if (options.disableDrag) card.draggable = false;
  if (options.mode === "single") card.dataset.expanded = "true";

  const title = card.querySelector(".mc-title");
  const statusBtn = card.querySelector(".mc-status");
  const header = card.querySelector(".mc-header");
  const headerToggle = card.querySelector(".mc-header-toggle");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.title;
  statusBtn.textContent = STATUS_LABELS[machine.status] || "Operativo";
  statusBtn.dataset.status = machine.status || "operativa";
  if (options.canEditStatus === false) {
    statusBtn.disabled = true;
  }

  if (options.mode === "single") {
    const chevron = card.querySelector(".mc-chevron");
    if (chevron) chevron.style.display = "none";
    if (headerToggle) headerToggle.style.display = "none";
  }

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null,
    onStatusToggle: null,
    onTitleUpdate: null,
    onUpdateGeneral: null,
    onConnectTag: null,
    onDisconnectTag: null,
    onCopyTagUrl: null,
    onAddUser: null,
    onUpdateUserRole: null,
    onRemoveUser: null,
    onDownloadLogs: null,
    onRemoveMachine: null,
    onAddTask: null,
    onRemoveTask: null,
    onCompleteTask: null,
    onUpdateNotifications: null,
    onTestNotification: null,
    onSelectConfigSubtab: null
  };

  const visibleTabs = Array.isArray(options.visibleTabs) ? options.visibleTabs : null;
  if (visibleTabs) {
    card.querySelectorAll(".mc-tab").forEach((tab) => {
      if (!visibleTabs.includes(tab.dataset.tab)) tab.remove();
    });
  }
  if (options.hideConfig) {
    const configTab = card.querySelector('.mc-tab[data-tab="configuracion"]');
    if (configTab) configTab.remove();
  } else if (options.mode !== "single") {
    const configTab = card.querySelector('.mc-tab[data-tab="configuracion"]');
    if (!configTab) {
      console.debug("[dashboard] Config tab missing", {
        id: machine.id,
        visibleTabs: options.visibleTabs,
        hideConfig: options.hideConfig
      });
      const tabs = card.querySelector(".mc-tabs");
      if (tabs) {
        const btn = document.createElement("button");
        btn.className = "mc-tab";
        btn.type = "button";
        btn.dataset.tab = "configuracion";
        btn.textContent = "Configuración";
        tabs.appendChild(btn);
      }
    }
  }

  const renderTab = (key) => {
    const render = TAB_RENDER[key] || TAB_RENDER.general;
    render(panel, machine, hooks, options);
    panel.dataset.panel = key;
  };

  hooks.renderTab = renderTab;

  const firstTab = card.querySelector(".mc-tab");
  if (firstTab) {
    card.querySelectorAll(".mc-tab").forEach((tab) => tab.classList.remove("is-active"));
    firstTab.classList.add("is-active");
    renderTab(firstTab.dataset.tab);
  }

  if (options.mode !== "single" && headerToggle) {
    headerToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    });
  }

  if (options.mode !== "single" && header) {
    header.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea, label")) return;
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
    });
  }

  statusBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (options.canEditStatus === false) return;
    if (hooks.onStatusToggle) hooks.onStatusToggle(card);
  });

  const startTitleEdit = () => {
    const current = title.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.className = "mc-title-input";
    input.value = current;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        input.value = current;
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      const next = input.value.trim();
      let nextTitle = next || current;
      if (hooks.onTitleUpdate) {
        const ok = hooks.onTitleUpdate(card, nextTitle);
        if (ok === false) {
          nextTitle = current;
        }
      }
      title.textContent = nextTitle;
      title.style.display = "";
      input.remove();
    });
    title.style.display = "none";
    title.parentNode.insertBefore(input, title);
    input.focus();
    input.select();
  };

  if (!options.disableTitleEdit) {
    title.addEventListener("click", (event) => {
      event.stopPropagation();
      startTitleEdit();
    });
  }

  hooks.setActiveTab = (tabId, { notify = true } = {}) => {
    const tab = card.querySelector(`.mc-tab[data-tab="${tabId}"]`);
    if (!tab) return;
    card.querySelectorAll(".mc-tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderTab(tabId);
    if (notify && hooks.onSelectTab) hooks.onSelectTab(card, tabId);
  };

  card.querySelectorAll(".mc-tab").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = tab.dataset.tab;
      if (card.dataset.expanded !== "true" && hooks.onToggleExpand) {
        hooks.onToggleExpand(card);
      }
      hooks.setActiveTab(key, { notify: true });
    });
  });

  return { card, hooks };
};
