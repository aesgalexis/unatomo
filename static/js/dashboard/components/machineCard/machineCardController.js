import { buildMachineCardTemplate } from "./machineCardTemplate.js";
import { STATUS_LABELS } from "./machineCardTypes.js";
import { render as renderQuehaceres } from "../../tabs/tasks/tareas.js";
import { render as renderGeneral } from "../../tabs/general/general.js";
import { render as renderHistorial } from "../../tabs/historial.js";
import { render as renderConfiguracion } from "../../tabs/configuracion/index.js";
import { getTaskTiming } from "../../tabs/tasks/tasksTime.js";

const TAB_RENDER = {
  quehaceres: renderQuehaceres,
  general: renderGeneral,
  historial: renderHistorial,
  configuracion: renderConfiguracion
};

export const createMachineCard = (machine, options = {}) => {
  const card = buildMachineCardTemplate();
  card.dataset.machineId = machine.id;
  card.draggable = options.disableDrag ? false : true;
  if (options.mode === "single") card.dataset.expanded = "true";

  const title = card.querySelector(".mc-title");
  const pendingBtn = card.querySelector(".mc-pending");
  const rightWrap = card.querySelector(".mc-right");
  const statusBtn = card.querySelector(".mc-status");
  const header = card.querySelector(".mc-header");
  const headerToggle = card.querySelector(".mc-header-toggle");
  const panel = card.querySelector(".mc-panel");

  title.textContent = machine.title;
  const tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
  const pendingCount = tasks.filter((task) => getTaskTiming(task).pending).length;
  if (pendingBtn) {
    pendingBtn.textContent = String(pendingCount);
    pendingBtn.style.display = pendingCount > 0 ? "inline-flex" : "none";
    pendingBtn.disabled = false;
    const pendingLabel = pendingCount === 1 ? "Tarea pendiente" : "Tareas pendientes";
    pendingBtn.setAttribute("aria-label", pendingLabel);
    pendingBtn.setAttribute("data-tooltip", pendingLabel);
  }
  const statusLabel = STATUS_LABELS[machine.status] || "Operativo";
  statusBtn.textContent = "";
  statusBtn.dataset.label = statusLabel;
  statusBtn.innerHTML = `<span class="mc-status-text">${statusLabel}</span>`;
  statusBtn.classList.remove("is-open");
  statusBtn.dataset.status = machine.status || "operativa";
  if (options.canEditStatus === false) {
    statusBtn.disabled = true;
  }

  const hooks = {
    onToggleExpand: null,
    onSelectTab: null,
    onStatusToggle: null,
    onTitleUpdate: null,
    onUpdateGeneral: null,
    onUpdateLocation: null,
    onConnectTag: null,
    onDisconnectTag: null,
    onCopyTagUrl: null,
    onAddUser: null,
    onUpdateUserRole: null,
    onRemoveUser: null,
    onUpdateUserPassword: null,
    onDownloadLogs: null,
    onRemoveMachine: null,
    onAddTask: null,
    onRemoveTask: null,
    onCompleteTask: null,
    onAddIntervention: null,
    onUpdateNotifications: null,
    onTestNotification: null,
    onUpdateAdmin: null,
    onRemoveAdmin: null,
    onLeaveAdmin: null,
    onSelectConfigSubtab: null,
    onContentResize: null
  };

  const normalizeLocation = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);

  const buildLocationNode = () => {
    const wrap = document.createElement("div");
    wrap.className = "mc-location";
    const canEdit = options.canEditLocation !== false;
    const current = normalizeLocation(machine.location);

    if (!canEdit) {
      const label = document.createElement("span");
      label.className = "mc-location-label";
      label.textContent = current || "Sin ubicación";
      wrap.appendChild(label);
      return wrap;
    }

    const select = document.createElement("select");
    select.className = "mc-location-select";
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("change", (event) => {
      event.stopPropagation();
      const value = select.value;
      if (value === "__add__") {
        showAddInput();
        return;
      }
      if (hooks.onUpdateLocation) hooks.onUpdateLocation(machine.id, value);
    });

    const addOption = (value, label) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      return opt;
    };

    select.appendChild(addOption("", "Sin ubicación"));
    const list = Array.isArray(options.locations) ? options.locations : [];
    list.forEach((loc) => {
      select.appendChild(addOption(loc, loc));
    });
    if (current && !list.includes(current)) {
      select.appendChild(addOption(current, current));
    }
    select.appendChild(addOption("__add__", "+ Añadir nueva…"));
    select.value = current || "";

    const showAddInput = () => {
      wrap.innerHTML = "";
      const input = document.createElement("input");
      input.className = "mc-location-input";
      input.type = "text";
      input.placeholder = "Nueva ubicación";
      input.maxLength = 40;
      input.addEventListener("click", (event) => event.stopPropagation());

      const actions = document.createElement("div");
      actions.className = "mc-location-actions";

      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "mc-location-accept";
      okBtn.textContent = "Aceptar";
      okBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const normalized = normalizeLocation(input.value);
        const locations = Array.isArray(options.locations) ? options.locations : [];
        let finalValue = normalized;
        const match = locations.find(
          (loc) => normalizeLocation(loc).toLowerCase() === normalized.toLowerCase()
        );
        if (match) finalValue = match;
        if (hooks.onUpdateLocation) hooks.onUpdateLocation(machine.id, finalValue);
        wrap.innerHTML = "";
        wrap.appendChild(select);
        select.value = finalValue || "";
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "mc-location-cancel";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        wrap.innerHTML = "";
        wrap.appendChild(select);
        select.value = current || "";
      });

      actions.appendChild(okBtn);
      actions.appendChild(cancelBtn);
      wrap.appendChild(input);
      wrap.appendChild(actions);
      input.focus();
    };

    wrap.appendChild(select);
    return wrap;
  };

  const locationNode = buildLocationNode();
  if (header && rightWrap) {
    header.insertBefore(locationNode, rightWrap);
  }

  const shouldShowShare = (options.role === "admin") || !!machine.adminEmail;
  const shouldShowNfc = !!machine.tagId;
  if (rightWrap && (shouldShowShare || shouldShowNfc)) {
    const iconWrap = document.createElement("span");
    iconWrap.className = "mc-icon-wrap";

    if (shouldShowShare) {
      const share = document.createElement("span");
      share.className = "mc-share-icon";
      const isAdmin = options.role === "admin";
      if (isAdmin) {
        share.classList.add("is-admin");
        share.setAttribute("aria-label", "Administrando");
        share.setAttribute("data-tooltip", "Administrando");
        share.innerHTML =
          '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
          '<path fill="currentColor" d="M5 8l2-3 2 3h10a1 1 0 0 1 .8 1.6L17 13v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3L4.2 9.6A1 1 0 0 1 5 8zm3.4 2-1.2 1.6L9 14.2V15h6v-.8l1.8-2.6L15.6 10h-7.2z"/>' +
          "</svg>";
      } else {
        const adminName = (options.adminDisplayName || "").trim()
          || (machine.adminName || "").trim()
          || (machine.adminEmail || "").trim()
          || "Administrador";
        share.setAttribute("aria-label", `Administrada por ${adminName}`);
        share.setAttribute("data-tooltip", `Administrada por ${adminName}`);
        share.innerHTML =
          '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
          '<path fill="currentColor" d="M12 3 5 6v5c0 4.4 3 8.3 7 9 4-0.7 7-4.6 7-9V6l-7-3zm0 2.2 5 2.1v3.7c0 3.2-2 6.4-5 7-3-0.6-5-3.8-5-7V7.3l5-2.1z"/>' +
          "</svg>";
      }
      share.addEventListener("click", (event) => event.stopPropagation());
      let tipEl = null;
      const showTip = (event) => {
        const label = share.getAttribute("data-tooltip");
        if (!label) return;
        tipEl = document.createElement("div");
        tipEl.className = "mc-tooltip";
        tipEl.textContent = label;
        document.body.appendChild(tipEl);
        const x = (event && event.clientX) || 0;
        const y = (event && event.clientY) || 0;
        const left = x + 12;
        const top = y - tipEl.offsetHeight - 10;
        tipEl.style.top = `${Math.max(8, top)}px`;
        tipEl.style.left = `${Math.max(8, left)}px`;
      };
      const hideTip = () => {
        if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
        tipEl = null;
      };
      share.addEventListener("mouseenter", showTip);
      share.addEventListener("mouseleave", hideTip);
      share.addEventListener("blur", hideTip);
      iconWrap.appendChild(share);
    }

    if (shouldShowNfc) {
      const nfc = document.createElement("span");
      nfc.className = "mc-nfc-icon";
      if (String(machine.tagId).startsWith("G-")) {
        nfc.classList.add("is-generated");
      }
      nfc.setAttribute("aria-label", "Tag NFC enlazado");
      nfc.setAttribute("data-tooltip", "Tag NFC enlazado");
      nfc.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
        '<path fill="currentColor" d="M8 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zm6 1a6 6 0 0 1 6 6v.9a1 1 0 1 1-2 0V12a4 4 0 0 0-4-4 1 1 0 1 1 0-2zm0 4a2 2 0 0 1 2 2v.7a1 1 0 1 1-2 0V12a1 1 0 0 0-1-1 1 1 0 1 1 0-2z"/>' +
        "</svg>";
      nfc.addEventListener("click", (event) => event.stopPropagation());
      let tipEl = null;
      const showTip = (event) => {
        const label = nfc.getAttribute("data-tooltip");
        if (!label) return;
        tipEl = document.createElement("div");
        tipEl.className = "mc-tooltip";
        tipEl.textContent = label;
        document.body.appendChild(tipEl);
        const x = (event && event.clientX) || 0;
        const y = (event && event.clientY) || 0;
        const left = x + 12;
        const top = y - tipEl.offsetHeight - 10;
        tipEl.style.top = `${Math.max(8, top)}px`;
        tipEl.style.left = `${Math.max(8, left)}px`;
      };
      const hideTip = () => {
        if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
        tipEl = null;
      };
      nfc.addEventListener("mouseenter", showTip);
      nfc.addEventListener("mouseleave", hideTip);
      nfc.addEventListener("blur", hideTip);
      iconWrap.appendChild(nfc);
    }

    header.insertBefore(iconWrap, rightWrap);
  }

  if (pendingBtn && statusBtn) {
    statusBtn.insertAdjacentElement("beforebegin", pendingBtn);
  }

  if (options.mode === "single") {
    if (headerToggle) headerToggle.style.display = "none";
  }

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

  hooks.setActiveTab = (tabId, { notify = true } = {}) => {
    const tab = card.querySelector(`.mc-tab[data-tab="${tabId}"]`);
    if (!tab) return;
    card.querySelectorAll(".mc-tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderTab(tabId);
    if (notify && hooks.onSelectTab) hooks.onSelectTab(card, tabId);
  };

  const clearActiveTabs = () => {
    card.querySelectorAll(".mc-tab").forEach((tab) => tab.classList.remove("is-active"));
    panel.dataset.panel = "";
  };

  const activateFirstTab = () => {
    const firstTab = card.querySelector(".mc-tab");
    if (!firstTab) return;
    hooks.setActiveTab(firstTab.dataset.tab, { notify: true });
  };

  if (options.mode === "single") {
    activateFirstTab();
  } else {
    clearActiveTabs();
  }

  if (options.mode !== "single" && headerToggle) {
    headerToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
      if (card.dataset.expanded === "true") {
        if (!card.querySelector(".mc-tab.is-active")) activateFirstTab();
      } else {
        clearActiveTabs();
      }
    });
  }

  if (options.mode !== "single" && header) {
    header.addEventListener("click", (event) => {
      if (
        event.target.closest(
          ".mc-status, .mc-pending, .mc-title, .mc-title-input, .mc-location, .mc-nfc-icon, .mc-header-toggle"
        )
      ) {
        return;
      }
      if (event.target.closest("button, a, input, select, textarea, label")) return;
      if (hooks.onToggleExpand) hooks.onToggleExpand(card);
      if (card.dataset.expanded === "true") {
        if (!card.querySelector(".mc-tab.is-active")) activateFirstTab();
      } else {
        clearActiveTabs();
      }
    });
  }

  if (pendingBtn) {
    let tipEl = null;
    const showTip = (event) => {
      const label = pendingBtn.getAttribute("data-tooltip");
      if (!label) return;
      tipEl = document.createElement("div");
      tipEl.className = "mc-tooltip";
      tipEl.textContent = label;
      document.body.appendChild(tipEl);
      const x = (event && event.clientX) || 0;
      const y = (event && event.clientY) || 0;
      const left = x + 12;
      const top = y - tipEl.offsetHeight - 10;
      tipEl.style.top = `${Math.max(8, top)}px`;
      tipEl.style.left = `${Math.max(8, left)}px`;
    };
    const hideTip = () => {
      if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
      tipEl = null;
    };
    pendingBtn.addEventListener("mouseenter", showTip);
    pendingBtn.addEventListener("mouseleave", hideTip);
    pendingBtn.addEventListener("blur", hideTip);
    pendingBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (card.dataset.expanded !== "true" && hooks.onToggleExpand) {
        hooks.onToggleExpand(card);
        if (!card.querySelector(".mc-tab.is-active")) activateFirstTab();
      }
    });
  }
  statusBtn.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  statusBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (options.canEditStatus === false) return;
    if (hooks.onStatusToggle) hooks.onStatusToggle(card);
    if (document.activeElement === statusBtn) {
      statusBtn.blur();
    }
  });

  const startTitleEdit = () => {
    const current = title.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 24;
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

  card.addEventListener("focusin", (event) => {
    if (event.target.closest("input, textarea, select")) {
      card.draggable = false;
    }
  });

  card.addEventListener("focusout", () => {
    card.draggable = options.disableDrag ? false : true;
  });

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
