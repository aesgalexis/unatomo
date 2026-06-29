import { createDashboardSectionNav } from "/static/js/dashboard/components/sectionNav.js";
import { createDashboardViewMenu } from "/static/js/dashboard/components/viewMenu/viewMenu.js";
import { createMachineCard } from "/static/js/dashboard/machineCardTemplate.js";
import { filterMachines } from "/static/js/dashboard/components/machineSearch/machineFilter.js";
import { createMachineSearchBar } from "/static/js/dashboard/components/machineSearch/machineSearchBar.js";
import { formatHistoryLog } from "/static/js/dashboard/history/historyEventFormatter.js";
import { renderGlobalRegistryView, GLOBAL_REGISTRY_PAGE_SIZE } from "/static/js/dashboard/views/registry/globalRegistryView.js";
import {
  buildAddTaskNoteUpdate,
  buildAddTaskUpdate,
  buildCompleteTaskUpdate,
  buildEditTaskUpdate,
  buildRemoveTaskUpdate,
  buildStatusToggleUpdate
} from "/static/js/dashboard/tabs/tasks/taskActions.js";
import { normalizeMachine } from "/static/js/dashboard/machineStore.js";
import { normalizeMachineStatus as normalizeStatus, sortFlatMachines } from "/static/js/dashboard/runtime/dashboardSorting.js";
import {
  collapseMachineCard,
  expandMachineCard,
  getCollapsedHeightPx,
  recalcMachineCardHeight,
  scheduleMachineCardHeight
} from "/static/js/dashboard/rendering/machineCardLayout.js";
import { t } from "/static/js/dashboard/i18n.js";
import { buildMachineTagUrl } from "/static/js/dashboard/tags/tagUrl.js";
import { initThemeToggle } from "/static/js/theme/theme-toggle.js";
import { createDemoStore } from "./demoStore.js";

const mount = document.getElementById("dashboard-mount");
const resetBtn = document.getElementById("demoResetBtn");
const store = createDemoStore();
const cardRefs = new Map();
const expandedById = new Set(store.getState().expandedById || []);
let searchQuery = "";
let registryVisibleCount = GLOBAL_REGISTRY_PAGE_SIZE;

const userLabel = "Demo";

const notify = (message) => {
  const status = document.querySelector(".save-status");
  if (!status) return;
  status.textContent = message || "";
  if (message) {
    window.clearTimeout(status.__demoTimer);
    status.__demoTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 1800);
  }
};

const normalizeLocation = (value) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, 40);

const computeLocations = (machines) =>
  Array.from(
    new Set(
      machines
        .map((machine) => normalizeLocation(machine.location))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

const knownUsers = () =>
  Array.from(
    new Set(
      store
        .getState()
        .machines.flatMap((machine) => machine.users || [])
        .map((user) => (user.username || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

const getSelectedTabById = () => store.getState().selectedTabById || {};

const saveExpanded = () => {
  store.updateUiState({ expandedById: Array.from(expandedById) });
};

const saveSelectedTab = (id, tabId) => {
  const selectedTabById = { ...getSelectedTabById(), [id]: tabId || "quehaceres" };
  store.updateUiState({ selectedTabById });
};

const updateAndRender = (id, patch, message = "") => {
  store.updateMachine(id, patch);
  render();
  if (message) notify(message);
};

const updateTopbarStatus = (message = "") => {
  const status = document.getElementById("topbar-status");
  if (!status) return;
  status.textContent = message;
  if (message) {
    window.clearTimeout(status.__demoTimer);
    status.__demoTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 1800);
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });

const createHooks = (machine, card, hooks) => {
  card.addEventListener("click", (event) => {
    const qrLink = event.target.closest(".mc-qr-download");
    if (!qrLink) return;
    event.stopPropagation();
    qrLink.href = `/demo/qr-print.html?machineId=${encodeURIComponent(machine.id)}`;
  }, true);

  hooks.onToggleExpand = (node) => {
    const isExpanded = node.dataset.expanded === "true";
    if (isExpanded) {
      expandedById.delete(machine.id);
      collapseMachineCard(node);
    } else {
      expandedById.clear();
      expandedById.add(machine.id);
      document.querySelectorAll(".machine-card").forEach((cardEl) => {
        if (cardEl !== node) collapseMachineCard(cardEl);
      });
      expandMachineCard(node);
      if (!node.querySelector(".mc-tab.is-active")) {
        hooks.setActiveTab(getSelectedTabById()[machine.id] || "quehaceres", { notify: false });
      }
      scheduleMachineCardHeight(machine.id, () => recalcMachineCardHeight(node));
    }
    saveExpanded();
  };

  hooks.onSelectTab = (node, tabId) => {
    saveSelectedTab(machine.id, tabId);
    if (node.dataset.expanded === "true") {
      scheduleMachineCardHeight(machine.id, () => recalcMachineCardHeight(node));
    }
  };

  hooks.onContentResize = () => {
    if (card.dataset.expanded === "true") {
      scheduleMachineCardHeight(machine.id, () => recalcMachineCardHeight(card));
    }
  };

  hooks.onStatusToggle = () => {
    const current = store.getMachine(machine.id);
    if (!current) return;
    const currentStatus = normalizeStatus(current.status);
    const nextStatus = currentStatus === "fuera_de_servicio" ? "operativa" : "fuera_de_servicio";
    const updates = buildStatusToggleUpdate(machine.id, current, nextStatus, userLabel, {
      normalizeStatus,
      restoreTitle: t("tasks.restoreOperation", "Volver a poner la maquina en operatividad"),
      restoreDescription: nextStatus === "fuera_de_servicio" ? "Incidencia creada desde la demo" : ""
    });
    updateAndRender(machine.id, updates, t("dashboard.stateUpdated", "Estado actualizado"));
  };

  hooks.onTitleUpdate = (node, nextTitle) => {
    const title = (nextTitle || "").trim();
    if (!title) return false;
    const duplicate = store
      .getState()
      .machines.some((item) => item.id !== machine.id && item.title.toLowerCase() === title.toLowerCase());
    if (duplicate) {
      notify(t("dashboard.duplicateName", "Nombre duplicado"));
      return false;
    }
    updateAndRender(machine.id, { title }, t("dashboard.saved", "Guardado"));
    return true;
  };

  hooks.onUpdateGeneral = (id, field, value, input, errorEl) => {
    const patch = {};
    if (field === "year") {
      const year = value ? Number(value) : null;
      const currentYear = new Date().getFullYear();
      if (year && (Number.isNaN(year) || year < currentYear - 50 || year > currentYear)) {
        if (errorEl) errorEl.textContent = t("dashboard.invalidYear", "Ano invalido");
        if (input) input.setAttribute("aria-invalid", "true");
        return;
      }
      if (errorEl) errorEl.textContent = "";
      if (input) input.removeAttribute("aria-invalid");
      patch.year = year;
    } else {
      patch[field] = value;
    }
    store.updateMachine(id, patch);
  };

  hooks.onUpdateLocation = (id, nextValue) => {
    const current = store.getMachine(id);
    if (!current) return;
    const value = normalizeLocation(nextValue);
    const logs = [
      ...(current.logs || []),
      { ts: new Date().toISOString(), type: "location", value, user: userLabel }
    ];
    updateAndRender(id, { location: value, logs }, t("dashboard.saved", "Guardado"));
  };

  hooks.onAddTask = (id, task) => {
    const current = store.getMachine(id);
    if (!current) return;
    updateAndRender(id, buildAddTaskUpdate(current, task, userLabel), t("dashboard.taskCreated", "Tarea creada"));
  };

  hooks.onRemoveTask = (id, taskId) => {
    const current = store.getMachine(id);
    if (!current) return;
    updateAndRender(id, buildRemoveTaskUpdate(current, taskId, userLabel), t("tasks.remove", "Eliminar"));
  };

  hooks.onAddTaskNote = (id, taskId, text) => {
    const current = store.getMachine(id);
    const updates = current ? buildAddTaskNoteUpdate(current, taskId, text, userLabel) : null;
    if (updates) updateAndRender(id, updates, t("general.save", "Guardar"));
  };

  hooks.onEditTask = (id, taskId, patch) => {
    const current = store.getMachine(id);
    if (!current) return;
    updateAndRender(id, buildEditTaskUpdate(current, taskId, patch, userLabel), t("dashboard.saved", "Guardado"));
  };

  hooks.onCompleteTask = (id, taskId) => {
    const current = store.getMachine(id);
    const updates = current ? buildCompleteTaskUpdate(id, current, taskId, userLabel, { normalizeStatus }) : null;
    if (updates) updateAndRender(id, updates, t("dashboard.taskCompleted", "Tarea completada"));
  };

  hooks.onAddTaskImages = () => {
    notify("En demo, las imagenes de incidencias no se suben a Storage.");
  };

  hooks.onAddIntervention = (targetMachine, message) => {
    const current = store.getMachine(targetMachine.id);
    if (!current) return;
    updateAndRender(targetMachine.id, {
      logs: [
        ...(current.logs || []),
        { ts: new Date().toISOString(), type: "intervencion", message, user: userLabel }
      ]
    }, t("dashboard.interventionDone", "Intervencion registrada"));
  };

  hooks.onDownloadLogs = (targetMachine) => {
    const rows = (targetMachine.logs || [])
      .map((log) => `${log.ts || ""} - ${formatHistoryLog(log)}`)
      .join("\n");
    const blob = new Blob([rows], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${targetMachine.title || "machine"}-demo-log.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  hooks.onUploadMachineDocument = async (id, kind, file, statusEl, options = {}) => {
    if (!file) return null;
    const url = await fileToDataUrl(file);
    const doc = {
      id: `demo-doc-${Date.now().toString(36)}`,
      name: file.name,
      displayName: file.name,
      url,
      contentType: file.type || "",
      size: file.size || 0,
      uploadedAt: new Date().toISOString()
    };
    const current = store.getMachine(id);
    const documents = { ...(current.documents || {}) };
    if (kind === "other") {
      documents.other = [...(documents.other || []), doc];
    } else {
      documents[kind] = doc;
    }
    store.updateMachine(id, { documents });
    if (statusEl) {
      statusEl.textContent = t("general.uploadSaved", "Archivo guardado");
      statusEl.dataset.state = "ok";
    }
    if (!options.deferRender) render();
    return doc;
  };

  hooks.onDeleteMachineDocument = async (id, kind, statusEl, documentId = "") => {
    const current = store.getMachine(id);
    const documents = { ...(current?.documents || {}) };
    if (kind === "other") {
      documents.other = (documents.other || []).filter(
        (doc) => doc.id !== documentId && doc.storagePath !== documentId
      );
    } else {
      delete documents[kind];
    }
    updateAndRender(id, { documents }, t("general.deleted", "Archivo eliminado"));
    if (statusEl) statusEl.textContent = t("general.deleted", "Archivo eliminado");
  };

  hooks.onRenameMachineDocument = async (id, documentId, displayName) => {
    const current = store.getMachine(id);
    const documents = { ...(current?.documents || {}) };
    documents.other = (documents.other || []).map((doc) =>
      doc.id === documentId || doc.storagePath === documentId ? { ...doc, displayName } : doc
    );
    updateAndRender(id, { documents }, t("general.renamed", "Nombre actualizado"));
  };

  hooks.onGenerateTag = (id) => {
    const tagId = `G-DEMO-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    store.updateMachine(id, { tagId });
    return tagId;
  };

  hooks.onConnectTag = async (id, input, statusEl) => {
    const tagId = (input?.value || "").trim();
    if (!tagId) return false;
    updateAndRender(id, {
      tagId,
      tagUrl: buildMachineTagUrl(tagId)
    }, t("dashboard.tagLinked", "Tag enlazado"));
    if (statusEl) {
      statusEl.textContent = t("config.tagLinked", "Tag enlazado");
      statusEl.dataset.state = "ok";
    }
    return true;
  };

  hooks.onGenerateTagQr = async (id, statusEl) => {
    store.updateMachine(id, { tagQrUrl: "demo", tagQrPath: "demo/local" });
    if (statusEl) {
      statusEl.textContent = "QR demo generado localmente";
      statusEl.dataset.state = "ok";
    }
  };

  hooks.onDisconnectTag = async (id, input, statusEl) => {
    updateAndRender(id, {
      tagId: "",
      tagUrl: "",
      tagQrUrl: "",
      tagQrPath: ""
    }, t("dashboard.tagDisconnected", "Tag desconectado"));
    if (input) input.value = "";
    if (statusEl) {
      statusEl.textContent = t("config.tagDisconnected", "Tag desconectado");
      statusEl.dataset.state = "ok";
    }
  };

  hooks.onCopyTagUrl = async (id, button, input) => {
    const value = input?.value || "";
    try {
      await navigator.clipboard?.writeText(value);
    } catch {}
    if (button) button.dataset.copied = "true";
    notify(t("config.copied", "Copiado"));
  };

  hooks.onAddUser = (id, userInput, passInput, addBtn, statusEl) => {
    const username = (userInput?.value || "").trim();
    if (!username) return;
    const current = store.getMachine(id);
    const exists = (current.users || []).some((user) => user.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      if (statusEl) statusEl.textContent = t("dashboard.userExists", "Usuario ya existe");
      return;
    }
    updateAndRender(id, {
      users: [
        ...(current.users || []),
        { id: `demo-user-${Date.now().toString(36)}`, username, role: "usuario", hasPin: !!passInput?.value }
      ]
    }, t("dashboard.userCreated", "Usuario creado"));
    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    if (statusEl) statusEl.textContent = t("dashboard.userCreated", "Usuario creado");
  };

  hooks.onUpdateUserRole = (id, userId, role) => {
    const current = store.getMachine(id);
    updateAndRender(id, {
      users: (current.users || []).map((user) => user.id === userId ? { ...user, role } : user)
    }, t("dashboard.saved", "Guardado"));
  };

  hooks.onRemoveUser = (id, userId) => {
    const current = store.getMachine(id);
    updateAndRender(id, {
      users: (current.users || []).filter((user) => user.id !== userId)
    }, t("general.deleted", "Archivo eliminado"));
  };

  hooks.onUpdateUserPassword = (id, userId) => {
    const current = store.getMachine(id);
    updateAndRender(id, {
      users: (current.users || []).map((user) => user.id === userId ? { ...user, hasPin: true } : user)
    }, t("dashboard.saved", "Guardado"));
  };

  hooks.onUpdateAdmin = (id, email) => {
    updateAndRender(id, {
      adminEmail: email,
      adminStatus: t("config.pendingAcceptance", "Pendiente aceptacion")
    }, "Administrador demo asignado");
  };

  hooks.onRemoveAdmin = (id) => {
    updateAndRender(id, { adminEmail: "", adminStatus: "" }, "Administrador demo retirado");
  };

  hooks.onTransferOwnership = () => notify("La transferencia de propiedad esta bloqueada en demo.");
  hooks.onCancelOwnershipTransfer = () => notify("La transferencia de propiedad esta bloqueada en demo.");
  hooks.onRemoveMachine = () => notify("Eliminar maquinas reales esta bloqueado en demo.");

  hooks.onUpdateNotifications = (id, notifications) => {
    store.updateMachine(id, { notifications });
    notify(t("dashboard.saved", "Guardado"));
  };
};

const renderRegistry = (list) => {
  renderGlobalRegistryView(list, store.getState().machines, {
    query: searchQuery,
    visibleCount: registryVisibleCount,
    onLoadMore: () => {
      registryVisibleCount += GLOBAL_REGISTRY_PAGE_SIZE;
      render();
    }
  });
};

const render = () => {
  if (!mount) return;
  const state = store.getState();
  const activeView = (window.location.hash || "#/dashboard").includes("registro")
    ? "registro"
    : "dashboard";
  mount.innerHTML = "";
  cardRefs.clear();

  const nav = createDashboardSectionNav({
    labels: {
      dashboard: t("dashboard.navDashboard", "Dashboard"),
      registry: t("dashboard.navRegistry", "Registro"),
      qrPrint: t("dashboard.navQrPrint", "Impresion QR")
    },
    qrPrintHref: "/demo/qr-print.html",
    active: activeView
  });
  mount.appendChild(nav.sectionNav);

  const addBar = document.createElement("div");
  addBar.className = activeView === "registro" ? "add-bar is-registry-view" : "add-bar";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add";
  addBtn.innerHTML = '<span class="btn-add-icon">+</span>';
  addBtn.setAttribute("aria-label", t("dashboard.addAria", "Anadir"));
  addBtn.addEventListener("click", () => {
    const machine = store.addMachine();
    expandedById.clear();
    expandedById.add(machine.id);
    searchQuery = "";
    render();
    notify("Maquina demo creada");
    updateTopbarStatus("Guardado local");
  });
  const layout = state.layout || {};
  const viewMenu = createDashboardViewMenu({
    currentMode: layout.machineViewMode || "flat",
    currentSort: layout.machineSortMode || "manual",
    onChange: (mode) => {
      store.updateUiState({
        layout: {
          ...store.getState().layout,
          machineViewMode: mode,
          machineSortMode: mode === "grouped" ? "manual" : store.getState().layout.machineSortMode
        }
      });
      render();
    },
    onSortChange: (mode) => {
      store.updateUiState({
        layout: {
          ...store.getState().layout,
          machineViewMode: "flat",
          machineSortMode: mode
        }
      });
      render();
    }
  });
  const searchInput = createMachineSearchBar({
    placeholder: activeView === "registro"
      ? t("dashboard.registrySearchPlaceholder", "Buscar en registro...")
      : t("dashboard.searchPlaceholder", "Buscar por nombre o ubicacion..."),
    onQuery: (value) => {
      searchQuery = value || "";
      render();
    }
  });
  searchInput.value = searchQuery;
  searchInput.classList.toggle("is-active-search", !!searchQuery);
  const status = document.createElement("div");
  status.className = "save-status";
  addBar.appendChild(addBtn);
  addBar.appendChild(viewMenu.wrap);
  addBar.appendChild(searchInput);
  addBar.appendChild(status);
  mount.appendChild(addBar);

  const list = document.createElement("div");
  list.id = "machineList";
  mount.appendChild(list);

  if (activeView === "registro") {
    renderRegistry(list);
    return;
  }

  const filtered = filterMachines(state.machines, searchQuery);
  const visible = sortFlatMachines(filtered, state.layout.machineSortMode || "manual");
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "global-registry-empty";
    empty.textContent = searchQuery
      ? t("dashboard.noResults", (query) => `Sin resultados para "${query}".`)(searchQuery)
      : t("dashboard.noMachines", "Todavia no hay maquinas.");
    list.appendChild(empty);
    return;
  }

  const locations = computeLocations(state.machines);
  visible.forEach((rawMachine, index) => {
    const machine = normalizeMachine(rawMachine, index);
    const isExpanded = expandedById.has(machine.id);
    const { card, hooks } = createMachineCard(machine, {
      mode: "dashboard",
      role: machine.role || "owner",
      disableDrag: true,
      canEditTasks: true,
      canCompleteTasks: true,
      canEditStatus: true,
      canEditGeneral: true,
      canEditLocation: true,
      canDownloadHistory: true,
      canEditConfig: true,
      visibleTabs: ["quehaceres", "historial", "general", "configuracion"],
      tabOrder: state.layout.tabOrder,
      userRoles: ["usuario", "tecnico", "externo"],
      createdBy: userLabel,
      operationalSource: "demo",
      locations,
      knownUsers: knownUsers()
    });
    createHooks(machine, card, hooks);
    card.style.maxHeight = `${getCollapsedHeightPx()}px`;
    if (isExpanded) {
      card.dataset.expanded = "true";
      card.classList.add("mc-no-anim");
      card.style.maxHeight = "none";
    }
    list.appendChild(card);
    cardRefs.set(machine.id, { card, hooks });
    if (isExpanded) {
      hooks.setActiveTab(getSelectedTabById()[machine.id] || "quehaceres", { notify: false });
      scheduleMachineCardHeight(machine.id, () => {
        recalcMachineCardHeight(card);
        requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
      });
    } else {
      collapseMachineCard(card, { suppressAnimation: true });
    }
  });
};

resetBtn?.addEventListener("click", () => {
  expandedById.clear();
  store.reset();
  searchQuery = "";
  render();
  notify("Demo restablecida");
});

window.addEventListener("hashchange", render);

initThemeToggle();
window.__unatomoStylesReady?.finally(render) || render();
