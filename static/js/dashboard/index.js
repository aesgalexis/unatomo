import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, db, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, fetchLegacyMachines, migrateLegacyMachines, fetchMachine, upsertMachine, deleteMachine, addUserWithRegistry, deleteUserRegistry, fetchDashboardLayout, upsertDashboardLayout } from "./firestoreRepo.js";
import { upsertAccountDirectory, normalizeEmail, getDisplayNameByEmail } from "./admin/accountDirectoryRepo.js";
import { fetchInvitesForAdmin } from "./admin/adminInvitesRepo.js";
import { fetchLinksForAdmin } from "./admin/adminLinksRepo.js";
import { createAdminInvite, respondAdminInvite, leaveAdminRole, revokeAdminInvite, ensureAdminLink } from "./admin/adminFunctionsRepo.js";
import { validateTag, assignTag } from "./tagRepo.js";
import { createTagToken } from "/static/js/tokens/tagTokens.js";
import { upsertMachineAccessFromMachine, fetchMachineAccess } from "./machineAccessRepo.js";
import { buildMachineTagUrl, generateMachineTagQr, disconnectMachineTag } from "./tags/tagAssetsRepo.js";
import {
  deleteMachineDocumentFile,
  uploadManualDocument,
  uploadOtherDocument,
  uploadPlateDocument
} from "./documents/machineDocumentsRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initGroupedDragAndDrop } from "./dragAndDrop.js";
import { cloneMachines, normalizeMachine, createDraftMachine } from "./machineStore.js";
import { generateSaltBase64, hashPassword } from "/static/js/utils/crypto.js";
import { initAutoSave } from "./autoSave.js";
import { normalizeTasks } from "/static/js/dashboard/tabs/tasks/tasksModel.js";
import { getTaskTiming, getOverdueDuration, getCompletionDuration } from "/static/js/dashboard/tabs/tasks/tasksTime.js";
import { filterMachines } from "./components/machineSearch/machineFilter.js";
import { createMachineSearchBar } from "./components/machineSearch/machineSearchBar.js";
import { createDashboardLoading } from "./components/loading/dashboardLoading.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import { calculateStorageUsage, STORAGE_LIMIT_BYTES } from "/static/js/configuracion/storageUsage.js";
import { getAppBasePrefix, getCurrentLang, setSavedLang } from "/static/js/site/locale.js";
import { t } from "./i18n.js";
import {
  doc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const DEFAULT_COLLAPSED_HEIGHT = 108;
const EXPAND_FACTOR = 2.5;
const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const mount = document.getElementById("dashboard-mount");
const appBasePrefix = getAppBasePrefix();
const lang = getCurrentLang();
const redirectToEntry = () => {
  setSavedLang(lang);
  window.location.href = `${appBasePrefix || ""}/`;
};
const getPublicSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();
const isPublicSectionHash = () =>
  ["faqs", "tags", "contacto"].includes(getPublicSectionFromHash());

if (mount) {
  const state = {
    uid: null,
    adminLabel: "",
    adminEmail: "",
    remoteMachines: [],
    ownerMachines: [],
    adminMachines: [],
    draftMachines: [],
    expandedById: [],
    selectedTabById: {},
    configSubtabById: {},
    tagStatusById: {},
    dashboardLayout: { groups: [], placements: {}, tabOrder: [] },
    searchQuery: "",
    pendingInvites: [],
    mobileFocusedMachineId: "",
    mobileDetailJustEntered: false,
    loading: true,
    ownerReady: false,
    adminReady: false,
    loadingGuardTimer: null,
    ownerUnsub: null,
    adminLinksUnsub: null,
    adminMachineUnsubs: new Map(),
    inviteUnsub: null,
    storageFull: false,
    nextScrollRestoreY: null,
    nextScrollAnchor: null,
    initialGroupPriorityOrder: {},
    initialGroupPriorityReady: false
  };

  const cardRefs = new Map();
  const ORDER_CACHE_KEY = "unatomo_order_v1";
  const loadOrderCache = () => {
    try {
      const raw = localStorage.getItem(ORDER_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };
  const saveOrderCache = (list) => {
    try {
      const map = {};
      (list || []).forEach((m) => {
        if (m && m.id) map[m.id] = m.order ?? 0;
      });
      localStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };
  const tagUnsubs = new Map();
  const tagIdByMachineId = new Map();
  const machineIdByTagId = new Map();
  let rebuildToken = 0;
  let rebuildTimer = null;
  let pendingRebuildOptions = null;

  const clearDashboardTooltips = () => {
    document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
  };

  ["pointerdown", "dragstart", "scroll", "resize"].forEach((eventName) => {
    window.addEventListener(eventName, clearDashboardTooltips, true);
  });
  window.addEventListener("blur", clearDashboardTooltips);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearDashboardTooltips();
  });

  const statusLabels = {
    operativa: t("dashboard.statusByValue.operativa", "Operativo"),
    fuera_de_servicio: t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio")
  };

  const normalizeStatus = (value) =>
    value === "desconectada" ? "fuera_de_servicio" : value || "operativa";

  const createRestoreOperationTask = (createdBy) => ({
    id:
      (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
      `restore_${Date.now().toString(36)}`,
    title: t("tasks.restoreOperation", "Volver a poner la máquina en operatividad"),
    description: "",
    frequency: "puntual",
    createdAt: new Date().toISOString(),
    lastCompletedAt: null,
    createdBy: createdBy || null,
    source: RESTORE_OPERATION_TASK_SOURCE,
    automated: true,
    statusTarget: "operativa"
  });

  const hasPendingRestoreOperationTask = (tasks = []) =>
    normalizeTasks(tasks).some(
      (task) =>
        task.source === RESTORE_OPERATION_TASK_SOURCE &&
        task.frequency === "puntual" &&
        getTaskTiming(task).pending
    );

  const normalizeLocation = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);

  const getCollapsedHeightPx = () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--mc-collapsed-height")
      .trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : DEFAULT_COLLAPSED_HEIGHT;
  };

  const computeLocations = (machines) => {
    const map = new Map();
    (machines || []).forEach((m) => {
      const raw = normalizeLocation(m.location);
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), "es")
    );
  };

  const adminNameCache = new Map();
  const adminNamePending = new Set();
  const getAdminDisplayName = (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return "";
    if (adminNameCache.has(normalized)) return adminNameCache.get(normalized) || "";
    if (adminNamePending.has(normalized)) return "";
    adminNamePending.add(normalized);
    getDisplayNameByEmail(normalized)
      .then((name) => {
        const safeName = (name || "").trim();
        adminNameCache.set(normalized, safeName);
        adminNamePending.delete(normalized);
        if (safeName) renderCards({ preserveScroll: true });
      })
      .catch(() => {
        adminNameCache.set(normalized, "");
        adminNamePending.delete(normalized);
      });
    return "";
  };

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const { wrap: loadingEl, setProgress: setLoadingProgress } = createDashboardLoading();

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.innerHTML = "<span class=\"btn-add-icon\">+</span>";
  addBtn.setAttribute("aria-label", t("dashboard.addAria", "Añadir"));

  const searchInput = createMachineSearchBar({
    placeholder: t("dashboard.searchPlaceholder", "Buscar por nombre o ubicación..."),
    onQuery: (value) => {
      state.searchQuery = value || "";
      renderCards({ preserveScroll: true });
    }
  });
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim()) {
      searchInput.classList.add("is-active-search");
    } else {
      searchInput.classList.remove("is-active-search");
    }
  });
  searchInput.addEventListener("change", () => {
    if (searchInput.value.trim()) {
      searchInput.classList.add("is-active-search");
    } else {
      searchInput.classList.remove("is-active-search");
    }
  });
  const syncSearchVisualState = () => {
    const query = (state.searchQuery || "").trim();
    if (document.activeElement !== searchInput) {
      searchInput.value = query;
      if (!query) searchInput.blur();
    }
    searchInput.classList.toggle("is-active-search", !!query);
  };
  const orderBtn = document.createElement("button");
  orderBtn.type = "button";
  orderBtn.className = "btn-order";
  orderBtn.setAttribute("aria-label", t("dashboard.orderAria", "Ordenar"));
  orderBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path fill="currentColor" d="M7 6h10a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h6a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h2a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zM4 5l2 2 2-2H4zm0 7l2 2 2-2H4zm0 7l2 2 2-2H4z"/>' +
    '</svg>';
  orderBtn.addEventListener("click", () => {
    const pendingCount = (machine) => {
      const tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
      return tasks.filter((task) => getTaskTiming(task).pending).length;
    };
    const sorted = state.draftMachines
      .slice()
      .sort((a, b) => {
        const aDown = a.status === "fuera_de_servicio" ? 0 : 1;
        const bDown = b.status === "fuera_de_servicio" ? 0 : 1;
        if (aDown !== bDown) return aDown - bDown;
        const aPending = pendingCount(a);
        const bPending = pendingCount(b);
        if (aPending !== bPending) return bPending - aPending;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    const updated = sorted.map((m, index) => ({ ...m, order: index }));
    state.draftMachines = updated;
    saveOrderCache(updated);
    renderCards({ preserveScroll: true });
    updated.forEach((m) => autoSave.scheduleSave(m.id, "order"));
  });


  addBar.appendChild(addBtn);
  addBar.appendChild(searchInput);
  addBar.appendChild(orderBtn);

  const filterInfo = document.createElement("div");
  filterInfo.className = "filter-info";
  filterInfo.style.display = "none";

  const mobileBackBtn = document.createElement("button");
  mobileBackBtn.type = "button";
  mobileBackBtn.className = "dashboard-mobile-back";
  mobileBackBtn.textContent = t("dashboard.mobileBack", "Volver");
  mobileBackBtn.hidden = true;

  const list = document.createElement("div");
  list.id = "machineList";

  const inviteBanner = document.createElement("div");
  inviteBanner.className = "admin-invite-banner";
  inviteBanner.style.display = "none";

  addBar.appendChild(loadingEl);
  mount.appendChild(addBar);
  mount.appendChild(mobileBackBtn);
  mount.appendChild(inviteBanner);
  mount.appendChild(filterInfo);
  mount.appendChild(list);

  const updateSaveState = (message = "") => {
    setTopbarSaveStatus(message);
  };
  const notifyTopbar = (message = "") => {
    setTopbarSaveStatus(message);
  };

  const isMobileDashboardViewport = () =>
    !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

  const clearMobileDetailState = () => {
    state.mobileFocusedMachineId = "";
    state.mobileDetailJustEntered = false;
  };

  const syncMobileDetailUI = () => {
    const focusedId = state.mobileFocusedMachineId || "";
    const enabled = isMobileDashboardViewport() && !!focusedId;
    mount.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileDetail = enabled ? "true" : "false";
    list.dataset.mobileFocusedId = enabled ? focusedId : "";
    mobileBackBtn.hidden = !enabled;

    Array.from(list.querySelectorAll(".machine-card")).forEach((card) => {
      const isFocused = enabled && card.dataset.machineId === focusedId;
      card.classList.toggle("is-mobile-focus", isFocused);
      card.classList.toggle("is-mobile-detail-enter", isFocused && state.mobileDetailJustEntered);
    });
    Array.from(list.querySelectorAll(".machine-group")).forEach((group) => {
      const containsFocused = enabled && !!group.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      group.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    Array.from(list.querySelectorAll(".machine-card-wrap")).forEach((wrap) => {
      const containsFocused = enabled && !!wrap.querySelector(`.machine-card[data-machine-id="${focusedId}"]`);
      wrap.classList.toggle("is-mobile-focus-path", containsFocused);
    });
    state.mobileDetailJustEntered = false;
  };

  mobileBackBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    mobileBackBtn.blur();
    searchInput.blur();
    state.expandedById = [];
    clearMobileDetailState();
    Array.from(list.querySelectorAll(".machine-card")).forEach((card) =>
      collapseCard(card, { suppressAnimation: true })
    );
    syncMobileDetailUI();
  });

  if (window.matchMedia) {
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const handleMobileViewportChange = () => {
      if (!mobileMedia.matches) {
        clearMobileDetailState();
      } else if (!state.mobileFocusedMachineId && Array.isArray(state.expandedById) && state.expandedById[0]) {
        state.mobileFocusedMachineId = state.expandedById[0];
      }
      syncMobileDetailUI();
    };
    if (typeof mobileMedia.addEventListener === "function") {
      mobileMedia.addEventListener("change", handleMobileViewportChange);
    } else if (typeof mobileMedia.addListener === "function") {
      mobileMedia.addListener(handleMobileViewportChange);
    }
  }

  const updateLoading = () => {
    const total = 2;
    const ready = (state.ownerReady ? 1 : 0) + (state.adminReady ? 1 : 0);
    const pct = Math.round((ready / total) * 100);
    setLoadingProgress(pct);
    if (ready >= total && state.loading) {
      state.loading = false;
      if (state.loadingGuardTimer) {
        clearTimeout(state.loadingGuardTimer);
        state.loadingGuardTimer = null;
      }
      addBtn.disabled = false;
      searchInput.disabled = false;
      orderBtn.disabled = false;
      setTimeout(() => {
        loadingEl.style.display = "none";
      }, 2000);
    }
  };

  const armLoadingGuard = () => {
    if (state.loadingGuardTimer) {
      clearTimeout(state.loadingGuardTimer);
      state.loadingGuardTimer = null;
    }
    state.loadingGuardTimer = setTimeout(() => {
      let changed = false;
      if (!state.ownerReady) {
        state.ownerReady = true;
        changed = true;
      }
      if (!state.adminReady) {
        state.adminReady = true;
        changed = true;
      }
      if (changed) {
        updateLoading();
        renderCards({ preserveScroll: true });
      }
    }, 8000);
  };

  addBtn.disabled = true;
  searchInput.disabled = true;
  orderBtn.disabled = true;

  const renderPlaceholder = () => {
    list.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "machine-placeholder";
    placeholder.textContent =
      t("dashboard.noMachines", "Todavía no hay máquinas. Pulsa 'Añadir' para crear la primera.");
    list.appendChild(placeholder);
  };

  const createGroupSection = (group, pendingTasksCount = 0, downMachinesCount = 0) => {
    const section = document.createElement("section");
    section.className = "machine-group";
    section.classList.toggle("machine-subgroup", !!group.parentGroupId);
    section.dataset.groupId = group.id || "";
    section.dataset.parentGroupId = group.parentGroupId || "";
    section.dataset.collapsed = group.collapsed ? "true" : "false";
    section.draggable = true;

    const header = document.createElement("button");
    header.type = "button";
    header.className = "machine-group-header";
    header.draggable = true;
    const caret = document.createElement("span");
    caret.className = "machine-group-caret";
    caret.textContent = group.collapsed ? "+" : "−";
    const title = document.createElement("span");
    title.className = "machine-group-title";
    title.textContent = group.title || t("dashboard.groupUntitled", "Grupo");
    const pendingCount = document.createElement("span");
    pendingCount.className = "machine-group-count machine-group-pending-count";
    pendingCount.textContent = String(pendingTasksCount);
    pendingCount.title = t("dashboard.groupPendingCountTooltip", "Tareas pendientes en este grupo");
    pendingCount.hidden = pendingTasksCount <= 0;
    const downCount = document.createElement("span");
    downCount.className = "machine-group-count machine-group-down-count";
    downCount.textContent = String(downMachinesCount);
    downCount.title = t("dashboard.groupDownCountTooltip", "Máquinas fuera de servicio en este grupo");
    downCount.hidden = downMachinesCount <= 0;
    header.appendChild(caret);
    header.appendChild(title);
    header.appendChild(downCount);
    header.appendChild(pendingCount);
    header.addEventListener("click", (event) => {
      event.preventDefault();
      try {
        header.blur({ preventScroll: true });
      } catch {
        header.blur();
      }
      state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
      const target = state.dashboardLayout.groups.find((entry) => entry.id === group.id);
      if (!target) return;
      target.collapsed = !target.collapsed;
      if (target.collapsed && !target.parentGroupId) {
        state.dashboardLayout.groups.forEach((entry) => {
          if (entry.parentGroupId === target.id) entry.collapsed = true;
        });
      }
      saveDashboardLayout();
      renderCards();
    });

    const body = document.createElement("div");
    body.className = "machine-group-body";
    if (group.collapsed) body.hidden = true;
    section.appendChild(header);
    section.appendChild(body);
    return { section, body };
  };

  const recalcHeight = (card) => {
    const header = card.querySelector(".mc-header");
    const expand = card.querySelector(".mc-expand");
    const headerH = header.offsetHeight;
    const contentH = expand.scrollHeight;
    const minH = getCollapsedHeightPx() * EXPAND_FACTOR;
    const target = Math.max(minH, headerH + contentH);
    card.style.maxHeight = `${target}px`;
  };

  const collapseCard = (card, options = {}) => {
    card.dataset.expanded = "false";
    card.style.maxHeight = `${getCollapsedHeightPx()}px`;
    if (options.suppressAnimation) {
      card.classList.add("mc-no-anim");
      requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
    }
  };

  const expandCard = (card, options = {}) => {
    card.dataset.expanded = "true";
    recalcHeight(card);
    if (options.suppressAnimation) {
      card.classList.add("mc-no-anim");
      requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
    }
  };

  const setRemote = (remote) => {
    state.remoteMachines = cloneMachines(remote);
    state.draftMachines = cloneMachines(remote);
    state.tagStatusById = {};
  };

  const mergeOperationalFromTag = async (machines) => {
    const merged = await Promise.all(
      machines.map(async (machine) => {
        if (!machine.tagId) return { ...machine, _operationalSource: "local" };
        try {
          const access = await fetchMachineAccess(machine.tagId);
          if (!access) return { ...machine, _operationalSource: "local" };
          return {
            ...machine,
            status: access.status ?? machine.status,
            tasks: access.tasks ?? machine.tasks,
            logs: access.logs ?? machine.logs,
            _operationalSource: "tag"
          };
        } catch {
          return { ...machine, _operationalSource: "local" };
        }
      })
    );
    return merged;
  };

  const syncMachineAccessListeners = (machines) => {
    const nextTagIds = new Set();
    tagIdByMachineId.clear();
    machineIdByTagId.clear();

    machines.forEach((machine) => {
      if (!machine.tagId) return;
      nextTagIds.add(machine.tagId);
      tagIdByMachineId.set(machine.id, machine.tagId);
      machineIdByTagId.set(machine.tagId, machine.id);
      if (!tagUnsubs.has(machine.tagId)) {
        const ref = doc(db, "machine_access", machine.tagId);
        const unsub = onSnapshot(ref, (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() || {};
          const targetId = machineIdByTagId.get(machine.tagId);
          if (!targetId) return;
          applyOperationalPatch(targetId, data);
        });
        tagUnsubs.set(machine.tagId, unsub);
      }
    });

    Array.from(tagUnsubs.keys()).forEach((tagId) => {
      if (!nextTagIds.has(tagId)) {
        const unsub = tagUnsubs.get(tagId);
        if (unsub) unsub();
        tagUnsubs.delete(tagId);
      }
    });
  };

  const applyOperationalPatch = (machineId, operational) => {
    const current = getDraftById(machineId);
    if (!current) return;
    current.status = normalizeStatus(operational.status ?? current.status);
    current.tasks = operational.tasks ?? current.tasks;
    current.logs = operational.logs ?? current.logs;
    current._operationalSource = "tag";

    const ref = cardRefs.get(machineId);
    const card = (ref && ref.card) || list.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
    if (!card) return;
    const hooks = ref && ref.hooks ? ref.hooks : null;
    const statusBtn = card.querySelector(".mc-status");
    if (statusBtn) {
      const status = normalizeStatus(current.status);
      const label = statusLabels[status] || status;
      statusBtn.textContent = "";
      statusBtn.innerHTML = `<span class="mc-status-text">${label}</span>`;
      statusBtn.dataset.status = status;
    }

    const activeTab = state.selectedTabById?.[machineId] || card.querySelector(".mc-panel")?.dataset?.panel;
    if (hooks && hooks.setActiveTab && (activeTab === "quehaceres" || activeTab === "historial")) {
      hooks.setActiveTab(activeTab, { notify: false });
      if (card.dataset.expanded === "true") {
        scheduleHeightSync(machineId, () => recalcHeight(card));
      }
    }
  };

  const getDraftIndex = (id) => state.draftMachines.findIndex((m) => m.id === id);
  const getDraftById = (id) => state.draftMachines.find((m) => m.id === id);
  const DEFAULT_TAB_ORDER = ["quehaceres", "historial", "general", "configuracion"];
  const normalizeTabOrder = (value) => {
    const seen = new Set();
    const ordered = Array.isArray(value)
      ? value.filter((id) => {
          if (!DEFAULT_TAB_ORDER.includes(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
      : [];
    DEFAULT_TAB_ORDER.forEach((id) => {
      if (!seen.has(id)) ordered.push(id);
    });
    return ordered;
  };

  const normalizeDashboardLayout = (layout = {}) => {
    const groups = Array.isArray(layout.groups)
      ? layout.groups
          .filter((group) => group && group.id)
          .map((group, index) => ({
            id: String(group.id),
            title: (group.title || t("dashboard.groupUntitled", "Grupo")).toString().trim() || t("dashboard.groupUntitled", "Grupo"),
            order: typeof group.order === "number" ? group.order : index,
            parentGroupId: group.parentGroupId ? String(group.parentGroupId) : "",
            collapsed: !!group.collapsed
          }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    const knownGroupIds = new Set(groups.map((group) => group.id));
    groups.forEach((group) => {
      if (!knownGroupIds.has(group.parentGroupId) || group.parentGroupId === group.id) {
        group.parentGroupId = "";
      }
    });
    const groupById = new Map(groups.map((group) => [group.id, group]));
    groups.forEach((group) => {
      const parent = groupById.get(group.parentGroupId);
      if (parent?.parentGroupId) group.parentGroupId = "";
    });
    const placements = {};
    const rawPlacements =
      layout.placements && typeof layout.placements === "object" && !Array.isArray(layout.placements)
        ? layout.placements
        : {};
    Object.entries(rawPlacements).forEach(([machineId, placement]) => {
      if (!machineId || !placement || typeof placement !== "object") return;
      const groupId = knownGroupIds.has(placement.groupId) ? placement.groupId : "";
      placements[machineId] = {
        groupId,
        order: typeof placement.order === "number" ? placement.order : 0
      };
    });
    return { groups, placements, tabOrder: normalizeTabOrder(layout.tabOrder) };
  };

  const saveDashboardLayout = async () => {
    if (!state.uid) return;
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    try {
      await upsertDashboardLayout(state.uid, state.dashboardLayout);
    } catch {
      notifyTopbar(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const createGroupId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `g_${Math.random().toString(36).slice(2, 10)}`;
  };

  const getNextGroupTitle = () => {
    const base = t("dashboard.groupUntitled", "Grupo");
    const existing = new Set(
      (state.dashboardLayout?.groups || [])
        .map((group) => (group.title || "").trim().toLowerCase())
        .filter(Boolean)
    );
    let index = 1;
    let title = `${base} ${index}`;
    while (existing.has(title.toLowerCase())) {
      index += 1;
      title = `${base} ${index}`;
    }
    return title;
  };

  const getPendingTaskCount = (machine) => {
    const tasks = Array.isArray(machine?.tasks) ? machine.tasks : [];
    return tasks.filter((task) => getTaskTiming(task).pending).length;
  };

  const compareMachineDefaultPriority = (a, b) => {
    const aDown = normalizeStatus(a.status) === "fuera_de_servicio" ? 0 : 1;
    const bDown = normalizeStatus(b.status) === "fuera_de_servicio" ? 0 : 1;
    if (aDown !== bDown) return aDown - bDown;
    const aPending = getPendingTaskCount(a);
    const bPending = getPendingTaskCount(b);
    if (aPending !== bPending) return bPending - aPending;
    return 0;
  };

  const buildInitialGroupPriorityOrder = (machines) => {
    const layout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = layout.groups || [];
    const placements = layout.placements || {};
    const validGroupIds = new Set(groups.map((group) => group.id));
    const grouped = new Map();
    (machines || []).forEach((machine) => {
      const groupId = placements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) return;
      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(machine);
    });
    const orderByGroup = {};
    grouped.forEach((groupMachines, groupId) => {
      orderByGroup[groupId] = {};
      groupMachines
        .slice()
        .sort((a, b) => {
          const priority = compareMachineDefaultPriority(a, b);
          if (priority !== 0) return priority;
          const aPlacement = placements[a.id] || {};
          const bPlacement = placements[b.id] || {};
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        })
        .forEach((machine, index) => {
          orderByGroup[groupId][machine.id] = index;
        });
    });
    state.initialGroupPriorityOrder = orderByGroup;
    state.initialGroupPriorityReady = true;
  };

  const clearInitialGroupPriorityOrder = (groupId = "") => {
    if (!state.initialGroupPriorityOrder) return;
    if (groupId) {
      delete state.initialGroupPriorityOrder[groupId];
      return;
    }
    state.initialGroupPriorityOrder = {};
  };

  const localWriteAt = new Map();
  const markLocalWrite = (machineId) => {
    if (!machineId) return;
    localWriteAt.set(machineId, Date.now());
  };
  const isRecentLocalWrite = (machineId, windowMs = 1500) => {
    if (!machineId) return false;
    const ts = localWriteAt.get(machineId);
    return typeof ts === "number" && Date.now() - ts < windowMs;
  };

  const rebuildCombined = async ({ preserveScroll = true } = {}) => {
    const token = ++rebuildToken;
    const combined = [...(state.ownerMachines || []), ...(state.adminMachines || [])];
    const orderCache = loadOrderCache();
    const withOrder = combined.map((m) =>
      Object.prototype.hasOwnProperty.call(orderCache, m.id)
        ? { ...m, order: orderCache[m.id] }
        : m
    );
    const merged = await mergeOperationalFromTag(withOrder);
    if (token !== rebuildToken) return;
    if (!state.initialGroupPriorityReady) {
      buildInitialGroupPriorityOrder(merged);
    }
    setRemote(merged);
    renderCards({ preserveScroll });
  };

  const scheduleRebuild = (options = {}) => {
    pendingRebuildOptions = options;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      rebuildCombined(pendingRebuildOptions);
    }, 160);
  };

  const subscribeOwnerMachines = (uid) => {
    if (state.ownerUnsub) state.ownerUnsub();
    const q = query(collection(db, "machines"), where("ownerUid", "==", uid));
    state.ownerUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (!state.ownerReady) {
          state.ownerReady = true;
          updateLoading();
        }
        const changedIds = snap.docChanges().map((change) => change.doc.id);
        if (changedIds.length && changedIds.every((id) => isRecentLocalWrite(id))) {
          return;
        }
        const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const normalized = list
          .map((m, idx) => normalizeMachine(m, idx))
          .filter(Boolean)
          .map((m) => ({
            ...m,
            tenantId: uid,
            role: "owner",
            ownerEmail: state.adminEmail || ""
          }));
        state.ownerMachines = normalized;
        scheduleRebuild({ preserveScroll: true });
      },
      () => {
        if (!state.ownerReady) {
          state.ownerReady = true;
          updateLoading();
        }
        renderCards({ preserveScroll: true });
      }
    );
  };

  const syncAdminMachineListeners = (links) => {
    const nextIds = new Set();
    (links || []).forEach((link) => {
      if (!link || !link.machineId || !link.ownerUid) return;
      if (link.status && link.status !== "accepted") return;
      nextIds.add(link.machineId);
      if (state.adminMachineUnsubs.has(link.machineId)) return;
      const ref = doc(db, "machines", link.machineId);
      const unsub = onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (isRecentLocalWrite(link.machineId)) return;
        if (!snap.exists()) return;
        const data = snap.data() || {};
        if (data.ownerUid && data.ownerUid !== link.ownerUid) return;
        const normalized = normalizeMachine({ id: snap.id, ...data }, state.draftMachines.length);
        normalized.tenantId = link.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = link.ownerEmail || "";
        state.adminMachines = (state.adminMachines || []).filter((m) => m.id !== link.machineId);
        state.adminMachines = [normalized, ...state.adminMachines];
        scheduleRebuild({ preserveScroll: true });
      });
      state.adminMachineUnsubs.set(link.machineId, unsub);
    });

    Array.from(state.adminMachineUnsubs.keys()).forEach((id) => {
      if (!nextIds.has(id)) {
        const unsub = state.adminMachineUnsubs.get(id);
        if (unsub) unsub();
        state.adminMachineUnsubs.delete(id);
        state.adminMachines = (state.adminMachines || []).filter((m) => m.id !== id);
      }
    });
  };

  const subscribeAdminLinks = (uid) => {
    if (state.adminLinksUnsub) state.adminLinksUnsub();
    const q = query(
      collection(db, "admin_machine_links"),
      where("adminUid", "==", uid)
    );
    state.adminLinksUnsub = onSnapshot(
      q,
      (snap) => {
        if (!state.adminReady) {
          state.adminReady = true;
          updateLoading();
        }
        const links = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        state.adminLinks = links;
        const activeLinks = links.filter((link) => link.status !== "left" && link.status !== "rejected");
        syncAdminMachineListeners(activeLinks);
        scheduleRebuild({ preserveScroll: true });
      },
      () => {
        if (!state.adminReady) {
          state.adminReady = true;
          updateLoading();
        }
        renderCards({ preserveScroll: true });
      }
    );
  };

  const subscribePendingInvites = (emailLower) => {
    if (state.inviteUnsub) state.inviteUnsub();
    if (!emailLower) {
      state.pendingInvites = [];
      renderInviteBanner();
      return;
    }
    const q = query(
      collection(db, "admin_machine_invites"),
      where("adminEmailLower", "==", emailLower),
      where("status", "==", "pending")
    );
    state.inviteUnsub = onSnapshot(q, (snap) => {
      state.pendingInvites = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      renderInviteBanner();
    });
  };

  const updateMachine = (id, patch) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = { ...state.draftMachines[idx], ...patch };
  };

  const replaceMachine = (id, next) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = next;
  };

  const removeMachineFromState = (id) => {
    state.draftMachines = state.draftMachines.filter((m) => m.id !== id);
  };

  const computeNextOrder = () => {
    const maxOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order > acc ? m.order : acc),
      -1
    );
    return maxOrder + 1;
  };

  const computePrevOrder = () => {
    const minOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order < acc ? m.order : acc),
      0
    );
    return state.draftMachines.length ? minOrder - 1 : 0;
  };

  const updateTagStatusUI = (id) => {
    const status = state.tagStatusById[id];
    const card = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
    if (!card) return;
    const statusEl = card.querySelector('.mc-panel[data-panel="configuracion"] .mc-tag-status');
    if (!statusEl) return;
    statusEl.textContent = status.text || "";
    statusEl.dataset.state = status.state || "";
    if (card.dataset.expanded === "true") {
      requestAnimationFrame(() => recalcHeight(card));
    }
  };

  const getMachineTenantId = (machine) => machine.tenantId || state.uid;
  const isOwnerMachine = (machine) => (machine.role || "owner") === "owner";

  const getStorageFullText = () =>
    t(
      "dashboard.storageFullNotification",
      "Almacenamiento lleno. Libera espacio para subir documentos o generar nuevos Tag ID/QR."
    );

  const renderTopbarNotifications = () => {
    const items = [];
    if (state.storageFull) {
      items.push({
        id: "storage-full",
        persistent: true,
        text: getStorageFullText()
      });
    }
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );
    invites.forEach((invite) => {
      items.push({
        text: formatInviteText(invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario"), 1),
        actions: [
          { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleInviteDecision(invite, "accepted") },
          { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleInviteDecision(invite, "rejected") }
        ]
      });
    });
    setTopbarNotifications(items);
  };

  const refreshStorageFullState = async (uid = state.uid) => {
    if (!uid) return false;
    try {
      const usage = await calculateStorageUsage(uid);
      state.storageFull = usage.totalBytes >= usage.limitBytes;
      renderTopbarNotifications();
      return state.storageFull;
    } catch {
      return state.storageFull;
    }
  };

  const assertStorageAvailable = async (uid = state.uid, additionalBytes = 0) => {
    if (!uid) throw new Error("no-auth");
    const usage = await calculateStorageUsage(uid);
    const full = usage.totalBytes + Math.max(0, Number(additionalBytes) || 0) >= STORAGE_LIMIT_BYTES;
    state.storageFull = usage.totalBytes >= usage.limitBytes;
    if (full) {
      state.storageFull = true;
      renderTopbarNotifications();
      notifyTopbar(t("dashboard.storageFullAction", "Almacenamiento lleno"));
      throw new Error("storage-full");
    }
    renderTopbarNotifications();
    return usage;
  };

  const renderInviteBanner = () => {
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    if (!invites.length) {
      inviteBanner.innerHTML = "";
      inviteBanner.style.display = "none";
      renderTopbarNotifications();
      return;
    }
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );

    inviteBanner.innerHTML = "";
    inviteBanner.style.display = "flex";
    const grouped = new Map();
    invites.forEach((invite) => {
      const ownerLabel = invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario");
      const key = `${invite.ownerUid || ""}|${ownerLabel}`;
      if (!grouped.has(key)) {
        grouped.set(key, { ownerLabel, invites: [] });
      }
      grouped.get(key).invites.push(invite);
    });
    grouped.forEach(({ ownerLabel, invites: groupInvites }) => {
      const row = document.createElement("div");
      row.className = "invite-row";
      const text = document.createElement("div");
      text.className = "invite-text";
      text.textContent = formatInviteText(ownerLabel, groupInvites.length);
      const actions = document.createElement("div");
      actions.className = "invite-actions";
      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "mc-location-accept";
      acceptBtn.textContent = t("card.accept", "Aceptar");
      acceptBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "accepted");
        }
      });
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "mc-location-cancel";
      rejectBtn.textContent = t("dashboard.reject", "Rechazar");
      rejectBtn.addEventListener("click", async () => {
        for (const invite of groupInvites) {
          await handleInviteDecision(invite, "rejected");
        }
      });
      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      row.appendChild(text);
      row.appendChild(actions);
      inviteBanner.appendChild(row);
    });
    renderTopbarNotifications();
  };

  const handleInviteDecision = async (invite, decision) => {
    if (!invite || !invite.ownerUid || !invite.machineId) return;
    try {
      await respondAdminInvite(invite.id, decision);
    } catch {
      notifyTopbar(
        `Permisos: ownerUid=${invite.ownerUid} admin=${normalizeEmail(state.adminEmail || "")}`
      );
      throw new Error("admin-link-update-denied");
    }

    if (decision === "accepted") {
      const ownerMachine = await fetchMachine(null, invite.machineId);
      if (ownerMachine) {
        const user = state.adminLabel || state.adminEmail || t("dashboard.admin", "Administrador");
        const logs = [
          ...(ownerMachine.logs || []),
          {
            ts: new Date().toISOString(),
            type: "admin_accept",
            admin: state.adminEmail || "",
            user
          }
        ];
        try {
          await upsertMachine(invite.ownerUid, {
            ...ownerMachine,
            adminName: state.adminLabel || "",
            logs,
            tenantId: invite.ownerUid
          });
        } catch {
          // ignore log failures
        }
        const normalized = normalizeMachine(ownerMachine, state.draftMachines.length);
        normalized.tenantId = invite.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = invite.ownerEmail || "";
        state.draftMachines = [normalized, ...state.draftMachines];
        renderCards({ preserveScroll: true });
      }
    }

    state.pendingInvites = state.pendingInvites.filter((i) => i.id !== invite.id);
    renderInviteBanner();
  };

  const autoSave = initAutoSave({
    notify: updateSaveState,
    saveFn: async (machineId, reason) => {
      if (!state.uid) throw new Error("no-auth");
      const machine = getDraftById(machineId);
      if (!machine) return;
      const tenantId = machine.tenantId || state.uid;
      const skipTagSync = typeof reason === "string" && reason.startsWith("admin");
      if (machine.tagId && !skipTagSync) {
        const res = await validateTag(machine.tagId);
        if (!res.exists) {
          state.tagStatusById[machine.id] = { text: t("config.tagNotFound", "El Tag ID introducido no existe"), state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-missing");
        }
        if (res.machineId && res.machineId !== machine.id) {
          state.tagStatusById[machine.id] = { text: t("config.tagAlreadyAssigned", "Tag ya está asignado"), state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-assigned");
        }
      }
      await upsertMachine(tenantId, machine);
      machine.isNew = false;
      if (machine.tagId && !skipTagSync) {
        try {
          await assignTag(machine.tagId, tenantId, machine.id);
          await upsertMachineAccessFromMachine(tenantId, machine, state.uid);
          state.tagStatusById[machine.id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
        } catch {
          state.tagStatusById[machine.id] = {
            text: t("dashboard.savedTagPending", "Guardado. Tag pendiente de sincronizar"),
            state: "error"
          };
        }
      }
      updateTagStatusUI(machine.id);
    },
    onSaveStart: (machineId) => markLocalWrite(machineId)
  });

  const heightRAF = new Map();
  const scheduleHeightSync = (id, fn) => {
    if (heightRAF.has(id)) cancelAnimationFrame(heightRAF.get(id));
    heightRAF.set(id, requestAnimationFrame(fn));
  };

  const captureViewportAnchor = () => {
    const cards = Array.from(list.querySelectorAll(".machine-card"));
    if (!cards.length) return null;
    const expanded = state.expandedById?.[0]
      ? list.querySelector(`.machine-card[data-machine-id="${state.expandedById[0]}"]`)
      : null;
    const candidates = expanded ? [expanded, ...cards.filter((card) => card !== expanded)] : cards;
    const viewportTop = 96;
    const target =
      candidates.find((card) => card.getBoundingClientRect().bottom > viewportTop) ||
      candidates[0];
    if (!target) return null;
    return {
      id: target.dataset.machineId || "",
      top: target.getBoundingClientRect().top
    };
  };

  const restoreViewport = (scrollY, anchor) => {
    requestAnimationFrame(() => {
      if (anchor?.id) {
        const anchoredCard = list.querySelector(`.machine-card[data-machine-id="${anchor.id}"]`);
        if (anchoredCard) {
          const nextTop = anchoredCard.getBoundingClientRect().top;
          window.scrollBy(0, nextTop - anchor.top);
          syncSearchVisualState();
          return;
        }
      }
      window.scrollTo(0, scrollY || 0);
      syncSearchVisualState();
    });
  };

  const renderCards = ({ preserveScroll = false } = {}) => {
    const capturedAnchor = preserveScroll ? captureViewportAnchor() : null;
    const prevScrollY = preserveScroll
      ? (typeof state.nextScrollRestoreY === "number" ? state.nextScrollRestoreY : window.scrollY)
      : null;
    const renderAnchor = state.nextScrollAnchor || capturedAnchor;
    state.nextScrollRestoreY = null;
    const activeEl = document.activeElement;
    if (activeEl && list.contains(activeEl) && typeof activeEl.blur === "function") {
      try {
        activeEl.blur({ preventScroll: true });
      } catch {
        activeEl.blur();
      }
    }
    clearDashboardTooltips();
    list.innerHTML = "";
    const machines = Array.isArray(state.draftMachines) ? state.draftMachines : [];
    const query = (state.searchQuery || "").trim();
    const visibleMachines = filterMachines(machines, query);
    state.knownUsers = Array.from(
      new Set(
        machines
          .flatMap((m) => (Array.isArray(m.users) ? m.users : []))
          .map((u) => (u.username || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
    if (query) {
      filterInfo.textContent = t(
        "dashboard.showingResults",
        (visible, total) => `Showing ${visible}/${total} machines`
      )(visibleMachines.length, machines.length);
      filterInfo.style.display = "block";
    } else {
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
    }
    if (!machines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      renderPlaceholder();
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }
    if (!visibleMachines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      list.innerHTML = "";
      const placeholder = document.createElement("div");
      placeholder.className = "machine-placeholder";
      placeholder.textContent = t("dashboard.noResults", (value) => `No results for "${value}".`)(query);
      list.appendChild(placeholder);
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }

    const expandedById = new Set(state.expandedById || []);
    if (expandedById.size > 1) {
      const [first] = expandedById;
      expandedById.clear();
      expandedById.add(first);
      state.expandedById = [first];
    }

    const selectedTabById = state.selectedTabById || {};

    cardRefs.clear();
    state.locations = computeLocations(state.draftMachines);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const layoutGroups = state.dashboardLayout.groups || [];
    const layoutPlacements = state.dashboardLayout.placements || {};
    const useGroupedLayout = layoutGroups.length > 0 && !query;
    const validGroupIds = new Set(layoutGroups.map((group) => group.id));
    const hasUngroupedMachines = useGroupedLayout && visibleMachines.some((machine) => {
      const groupId = layoutPlacements[machine.id]?.groupId || "";
      return !validGroupIds.has(groupId);
    });
    list.dataset.hasUngrouped = hasUngroupedMachines ? "true" : "false";
    const groupById = new Map(layoutGroups.map((group) => [group.id, group]));
    const getTopGroupId = (groupId) => {
      const group = groupById.get(groupId);
      return group?.parentGroupId || groupId || "";
    };
    const groupAnchorOrder = new Map();
    layoutGroups.forEach((group) => {
      if (group.parentGroupId) return;
      groupAnchorOrder.set(group.id, typeof group.order === "number" ? group.order : 0);
    });
    visibleMachines.forEach((machine) => {
      const groupId = layoutPlacements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) return;
      const topGroupId = getTopGroupId(groupId);
      const current = groupAnchorOrder.get(topGroupId);
      const next = machine.order ?? 0;
      if (typeof current !== "number") groupAnchorOrder.set(topGroupId, next);
    });
    const sortedVisibleMachines = visibleMachines
      .slice()
      .sort((a, b) => {
        if (!useGroupedLayout) return (a.order ?? 0) - (b.order ?? 0);
        const aPlacement = layoutPlacements[a.id] || {};
        const bPlacement = layoutPlacements[b.id] || {};
        const aGroupId = validGroupIds.has(aPlacement.groupId) ? aPlacement.groupId : "";
        const bGroupId = validGroupIds.has(bPlacement.groupId) ? bPlacement.groupId : "";
        const aTopGroupId = getTopGroupId(aGroupId);
        const bTopGroupId = getTopGroupId(bGroupId);
        if (!!aTopGroupId !== !!bTopGroupId) return aTopGroupId ? -1 : 1;
        const aAnchor = aTopGroupId ? groupAnchorOrder.get(aTopGroupId) ?? a.order ?? 0 : a.order ?? 0;
        const bAnchor = bTopGroupId ? groupAnchorOrder.get(bTopGroupId) ?? b.order ?? 0 : b.order ?? 0;
        if (aAnchor !== bAnchor) return aAnchor - bAnchor;
        if (aGroupId && aGroupId === bGroupId) {
          const priorityOrder = state.initialGroupPriorityOrder?.[aGroupId] || {};
          const aPriorityOrder = priorityOrder[a.id];
          const bPriorityOrder = priorityOrder[b.id];
          const aOrder = Number.isFinite(aPriorityOrder)
            ? aPriorityOrder
            : aPlacement.order ?? a.order ?? 0;
          const bOrder = Number.isFinite(bPriorityOrder)
            ? bPriorityOrder
            : bPlacement.order ?? b.order ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        }
        if (aTopGroupId && aTopGroupId === bTopGroupId) {
          const aGroup = groupById.get(aGroupId);
          const bGroup = groupById.get(bGroupId);
          if (!!aGroup?.parentGroupId !== !!bGroup?.parentGroupId) {
            return aGroup?.parentGroupId ? -1 : 1;
          }
          const aLocalOrder = aGroup?.parentGroupId
            ? aGroup.order ?? 0
            : aPlacement.order ?? a.order ?? 0;
          const bLocalOrder = bGroup?.parentGroupId
            ? bGroup.order ?? 0
            : bPlacement.order ?? b.order ?? 0;
          if (aLocalOrder !== bLocalOrder) return aLocalOrder - bLocalOrder;
        }
        return (a.order ?? 0) - (b.order ?? 0);
      });
    const groupTargets = new Map();
    const renderedGroups = new Set();
    const groupCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupTotalCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupPendingCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupDownCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    if (useGroupedLayout) {
      sortedVisibleMachines.forEach((machine) => {
        const groupId = layoutPlacements[machine.id]?.groupId || "";
        if (!groupCounts.has(groupId)) return;
        const machinePendingCount = getPendingTaskCount(machine);
        const machineDownCount = normalizeStatus(machine.status) === "fuera_de_servicio" ? 1 : 0;
        groupCounts.set(groupId, (groupCounts.get(groupId) || 0) + 1);
        groupTotalCounts.set(groupId, (groupTotalCounts.get(groupId) || 0) + 1);
        groupPendingCounts.set(groupId, (groupPendingCounts.get(groupId) || 0) + machinePendingCount);
        groupDownCounts.set(groupId, (groupDownCounts.get(groupId) || 0) + machineDownCount);
        const parentGroupId = groupById.get(groupId)?.parentGroupId || "";
        if (parentGroupId) {
          groupTotalCounts.set(parentGroupId, (groupTotalCounts.get(parentGroupId) || 0) + 1);
          groupPendingCounts.set(parentGroupId, (groupPendingCounts.get(parentGroupId) || 0) + machinePendingCount);
          groupDownCounts.set(parentGroupId, (groupDownCounts.get(parentGroupId) || 0) + machineDownCount);
        }
      });
      groupTargets.set("", list);
    } else {
      groupTargets.set("", list);
    }
    const renderGroup = (groupId) => {
      if (!useGroupedLayout || !groupId || groupTargets.has(groupId) || renderedGroups.has(groupId)) return;
      const group = groupById.get(groupId);
      if (!group) return;
      const parentGroupId = group.parentGroupId || "";
      if (parentGroupId) renderGroup(parentGroupId);
      const parentTarget = parentGroupId ? groupTargets.get(parentGroupId) : list;
      if (!parentTarget) return;
      const showGroupCounts = !!group.collapsed;
      const { section, body } = createGroupSection(
        group,
        showGroupCounts ? groupPendingCounts.get(groupId) || 0 : 0,
        showGroupCounts ? groupDownCounts.get(groupId) || 0 : 0
      );
      parentTarget.appendChild(section);
      groupTargets.set(groupId, body);
      renderedGroups.add(groupId);
    };
    sortedVisibleMachines.forEach((machine) => {
        if (machine.tagId && !state.tagStatusById[machine.id]) {
          state.tagStatusById[machine.id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
        }
        if ((machine.role || "owner") === "admin") {
          const nextAdminName = (state.adminLabel || "").trim();
          if (nextAdminName && machine.adminName !== nextAdminName) {
            updateMachine(machine.id, { adminName: nextAdminName });
            machine.adminName = nextAdminName;
            autoSave.scheduleSave(machine.id, "admin-name");
          }
        }
        const adminDisplayName = machine.adminName
          ? machine.adminName
          : machine.adminEmail
            ? getAdminDisplayName(machine.adminEmail)
            : "";
        const ownerDisplayName = machine.ownerEmail
          ? getAdminDisplayName(machine.ownerEmail)
          : "";
        const isExpanded = expandedById.has(machine.id);
        const { card, hooks } = createMachineCard(machine, {
          tagStatus: state.tagStatusById[machine.id],
          adminLabel: state.adminLabel,
          adminDisplayName,
          ownerDisplayName,
          mode: "dashboard",
          role: machine.role || "owner",
          disableDrag: query.length > 0,
          canEditTasks: true,
          canCompleteTasks: true,
          canEditStatus: true,
          canEditGeneral: true,
          canEditLocation: true,
          canDownloadHistory: true,
          canEditConfig: true,
          visibleTabs: ["quehaceres", "historial", "general", "configuracion"],
          tabOrder: state.dashboardLayout.tabOrder,
          userRoles: ["usuario", "tecnico", "externo"],
          createdBy: state.adminLabel || null,
          operationalSource: machine._operationalSource || "local",
          locations: state.locations,
          knownUsers: state.knownUsers
        });
        if (isExpanded) {
          card.dataset.expanded = "true";
          card.classList.add("mc-no-anim");
          card.style.maxHeight = "none";
        } else {
          card.style.maxHeight = `${getCollapsedHeightPx()}px`;
        }

        hooks.onToggleExpand = (node) => {
          if (node.classList.contains("is-dragging")) return;
          const isExpanded = node.dataset.expanded === "true";
          if (isExpanded) {
            expandedById.delete(machine.id);
            if (state.mobileFocusedMachineId === machine.id) clearMobileDetailState();
            collapseCard(node);
          } else {
            expandedById.clear();
            expandedById.add(machine.id);
            if (isMobileDashboardViewport()) {
              state.mobileFocusedMachineId = machine.id;
              state.mobileDetailJustEntered = true;
            }
            list.querySelectorAll(".machine-card").forEach((cardEl) => {
              if (cardEl !== node) collapseCard(cardEl);
            });
            expandCard(node);
          }
          state.expandedById = Array.from(expandedById);
          syncMobileDetailUI();
        };

        hooks.onSelectTab = (node, tabId) => {
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machine.id] = tabId || "quehaceres";
          if (node.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(node));
          }
        };

        hooks.onStatusToggle = (node) => {
          const statusOrder = ["operativa", "fuera_de_servicio"];
          const current = getDraftById(machine.id);
          const currentStatus = normalizeStatus(current.status);
          const idx = statusOrder.indexOf(currentStatus);
          const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
          const keepExpanded = node.dataset.expanded === "true";
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const now = new Date().toISOString();
          let nextTasks = normalizeTasks(current.tasks || []);
          const nextLogs = [
            ...(current.logs || []),
            { ts: now, type: "status", value: nextStatus, user }
          ];
          if (currentStatus !== "fuera_de_servicio" && nextStatus === "fuera_de_servicio") {
            if (!hasPendingRestoreOperationTask(nextTasks)) {
              const restoreTask = createRestoreOperationTask(user);
              nextTasks = [restoreTask, ...nextTasks];
              nextLogs.push({
                ts: now,
                type: "task_created",
                title: restoreTask.title,
                description: restoreTask.description || "",
                user
              });
            }
          } else if (currentStatus === "fuera_de_servicio" && nextStatus === "operativa") {
            const restoreTask = nextTasks.find(
              (task) => task.source === RESTORE_OPERATION_TASK_SOURCE && task.frequency === "puntual"
            );
            if (restoreTask) {
              nextTasks = nextTasks.filter((task) => task.id !== restoreTask.id);
              nextLogs.push({
                ts: now,
                type: "task",
                title: restoreTask.title || t("tasks.restoreOperation", "Volver a poner la máquina en operatividad"),
                user,
                overdue: false,
                overdueDuration: "",
                punctual: true,
                completionDuration: getCompletionDuration(restoreTask)
              });
            }
          }
          replaceMachine(machine.id, {
            ...current,
            status: nextStatus,
            tasks: nextTasks,
            logs: nextLogs
          });
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machine.id, "status");
          if (keepExpanded) {
            expandedById.add(machine.id);
            state.expandedById = Array.from(expandedById);
          }
        };

        hooks.onTitleUpdate = (node, nextTitle) => {
          const trimmed = (nextTitle || "").trim();
          const normalized = trimmed.toLowerCase();
          if (!normalized) return false;
          const duplicate = state.draftMachines.some(
            (m) => m.id !== machine.id && (m.title || "").trim().toLowerCase() === normalized
          );
          if (duplicate) {
            updateSaveState(t("dashboard.duplicateName", "Nombre duplicado"));
            return false;
          }
          updateMachine(machine.id, { title: trimmed });
          autoSave.scheduleSave(machine.id, "title");
          return true;
        };

        hooks.onUpdateGeneral = (id, field, value, input, errorEl) => {
          if (field === "year") {
            const currentYear = new Date().getFullYear();
            const parsed = value ? Number(value) : null;
            if (parsed !== null && (Number.isNaN(parsed) || parsed > currentYear || parsed < currentYear - 50)) {
              if (errorEl) {
                errorEl.textContent = t("dashboard.invalidYear", (min, max) => `Año inválido (entre ${min} y ${max}).`)(currentYear - 50, currentYear);
                errorEl.dataset.state = "error";
              }
              if (input) input.setAttribute("aria-invalid", "true");
              return;
            }
            if (errorEl) {
              errorEl.textContent = "";
              errorEl.dataset.state = "";
            }
            if (input) input.removeAttribute("aria-invalid");
            updateMachine(id, { year: parsed });
            machine.year = parsed;
          } else {
            updateMachine(id, { [field]: value });
            machine[field] = value;
          }
          autoSave.scheduleSave(id, `general:${field}`);
        };

        hooks.onUploadMachineDocument = async (id, kind, file, statusEl, options = {}) => {
          if (!["plate", "manual", "other"].includes(kind)) throw new Error("unsupported-document");
          const current = getDraftById(id);
          if (!current || !state.uid) throw new Error("missing-context");
          const tenantId = current.tenantId || current.ownerUid || state.uid;
          const previousSize = kind === "other" ? 0 : Number(current.documents?.[kind]?.size || 0);
          await assertStorageAvailable(tenantId, Math.max(0, Number(file?.size || 0) - previousSize));
          const machineForUpload = { ...current, tenantId };
          if (current.isNew) {
            await upsertMachine(tenantId, machineForUpload);
            current.isNew = false;
          }
          const uploadDocument =
            kind === "manual"
              ? uploadManualDocument
              : kind === "other"
                ? uploadOtherDocument
                : uploadPlateDocument;
          const uploaded = await uploadDocument({
            machine: machineForUpload,
            file,
            uploadedBy: state.uid
          });
          const currentDocuments = current.documents || {};
          const documents =
            kind === "other"
              ? {
                  ...currentDocuments,
                  other: [
                    ...(Array.isArray(currentDocuments.other) ? currentDocuments.other : []),
                    uploaded
                  ]
                }
              : {
                  ...currentDocuments,
                  [kind]: uploaded
                };
          updateMachine(id, { documents, isNew: false });
          current.documents = documents;
          current.isNew = false;
          if (statusEl) {
            statusEl.textContent = t("general.uploadSaved", "Archivo guardado");
            statusEl.dataset.state = "ok";
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "general";
          state.expandedById = Array.from(expandedById);
          await upsertMachine(tenantId, getDraftById(id));
          await refreshStorageFullState(tenantId);
          if (!options.silent) {
            notifyTopbar(t("general.uploadSaved", "Archivo guardado"));
          }
          if (kind === "other" && !options.deferRender) {
            window.setTimeout(() => renderCards({ preserveScroll: true }), 0);
          }
          return uploaded;
        };

        hooks.onRefreshMachineDocuments = () => {
          renderCards({ preserveScroll: true });
        };

        hooks.onRenameMachineDocument = async (id, documentId = "", displayName = "") => {
          const current = getDraftById(id);
          if (!current || !state.uid) throw new Error("missing-context");
          const tenantId = current.tenantId || current.ownerUid || state.uid;
          const cleanName = (displayName || "").toString().trim().replace(/\s+/g, " ").slice(0, 40);
          const documents = { ...(current.documents || {}) };
          const otherDocs = Array.isArray(documents.other) ? documents.other : [];
          const nextOtherDocs = otherDocs.map((entry) => {
            if (entry?.id !== documentId && entry?.storagePath !== documentId) return entry;
            const nextEntry = { ...entry };
            if (cleanName) nextEntry.displayName = cleanName;
            else delete nextEntry.displayName;
            return nextEntry;
          });
          documents.other = nextOtherDocs;
          updateMachine(id, { documents });
          current.documents = documents;
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "general";
          state.expandedById = Array.from(expandedById);
          await upsertMachine(tenantId, getDraftById(id));
          notifyTopbar(t("general.renamed", "Nombre actualizado"));
          return nextOtherDocs.find((entry) => entry?.id === documentId || entry?.storagePath === documentId) || null;
        };

        hooks.onDeleteMachineDocument = async (id, kind, statusEl, documentId = "") => {
          if (!["plate", "manual", "other"].includes(kind)) throw new Error("unsupported-document");
          const current = getDraftById(id);
          if (!current || !state.uid) throw new Error("missing-context");
          const doc = kind === "other"
            ? (Array.isArray(current.documents?.other)
                ? current.documents.other.find((entry) =>
                    entry?.id === documentId || entry?.storagePath === documentId
                  )
                : null)
            : current.documents?.[kind] || null;
          if (!doc) return null;
          const tenantId = current.tenantId || current.ownerUid || state.uid;
          if (statusEl) {
            statusEl.textContent = t("general.deleting", "Eliminando...");
            statusEl.dataset.state = "neutral";
          }
          await deleteMachineDocumentFile(doc.storagePath).catch((error) => {
            if (error?.code !== "storage/object-not-found") throw error;
          });
          const documents = { ...(current.documents || {}) };
          if (kind === "other") {
            documents.other = (Array.isArray(documents.other) ? documents.other : [])
              .filter((entry) => entry?.id !== documentId && entry?.storagePath !== documentId);
            if (!documents.other.length) delete documents.other;
          } else {
            delete documents[kind];
          }
          updateMachine(id, { documents });
          current.documents = documents;
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "general";
          state.expandedById = Array.from(expandedById);
          await upsertMachine(tenantId, getDraftById(id));
          await refreshStorageFullState(tenantId);
          notifyTopbar(t("general.deleted", "Archivo eliminado"));
          if (statusEl) {
            statusEl.textContent = t("general.deleted", "Archivo eliminado");
            statusEl.dataset.state = "ok";
          }
          if (kind === "other") {
            window.setTimeout(() => renderCards({ preserveScroll: true }), 0);
          }
          return doc;
        };

        hooks.onUpdateLocation = (id, nextValue) => {
          const current = getDraftById(id);
          const normalized = normalizeLocation(nextValue);
          const prev = normalizeLocation(current.location);
          if (normalized === prev) return;
          updateMachine(id, { location: normalized });
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "location",
              value: normalized || ""
            }
          ];
          updateMachine(id, { logs });
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "location");
        };

        hooks.onConnectTag = async (id, tagInput, statusEl) => {
          const tagId = tagInput.value.trim();
          if (!tagId) return false;
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || current.ownerUid || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          statusEl.textContent = t("dashboard.checking", "Comprobando...");
          statusEl.dataset.state = "neutral";
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            const res = await validateTag(tagId);
            if (!res.exists) {
              statusEl.textContent = t("config.tagNotFound", "El Tag ID introducido no existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            if (res.machineId && res.machineId !== id) {
              statusEl.textContent = t("config.tagAlreadyAssigned", "Tag ya est\u00e1 asignado");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            updateMachine(id, {
              tagId,
              tagUrl: buildMachineTagUrl(tagId),
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
            notifyTopbar(t("dashboard.tagLinked", "Tag enlazado"));
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "tag");
            return true;
          } catch {
            statusEl.textContent = t("dashboard.tagValidateError", "Error al validar el tag");
            statusEl.dataset.state = "error";
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
            return false;
          }
        };

        hooks.onDisconnectTag = async (id, _tagInput, statusEl) => {
          const current = getDraftById(id);
          if (!current?.tagId) return;
          const confirmed = window.confirm(
            t(
              "config.disconnectTagConfirm",
              "\u00bfSeguro que quieres desconectar este Tag ID? Se eliminar\u00e1n el Tag ID, la URL asociada y el QR. Este cambio no se puede deshacer."
            )
          );
          if (!confirmed) return;
          if (statusEl) {
            statusEl.textContent = t("config.disconnecting", "Desconectando...");
            statusEl.dataset.state = "neutral";
          }
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            markLocalWrite(id);
            await disconnectMachineTag(id);
            updateMachine(id, {
              tagId: null,
              tagUrl: "",
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = {
              text: t("dashboard.tagDisconnected", "Tag desconectado"),
              state: "error"
            };
            notifyTopbar(t("dashboard.tagDisconnected", "Tag desconectado"));
            await refreshStorageFullState(current.tenantId || current.ownerUid || state.uid);
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
          } catch {
            if (statusEl) {
              statusEl.textContent = t(
                "config.disconnectError",
                "No se pudo desconectar el Tag ID"
              );
              statusEl.dataset.state = "error";
            }
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
          }
        };

        hooks.onGenerateTag = async (id) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          if (current?.isNew) {
            await upsertMachine(tenantId, current);
            current.isNew = false;
          }
          const newId = await createTagToken(tenantId, id);
          notifyTopbar(t("dashboard.tagGenerated", "Tag ID generado"));
          return newId;
        };

        hooks.onCopyTagUrl = (id, btn, input) => {
          if (!input.value) return;
          navigator.clipboard
            .writeText(input.value)
            .catch(() => {
              input.select();
              document.execCommand("copy");
            })
            .finally(() => {
              const prev = btn.textContent;
              btn.textContent = t("config.copied", "Copiado");
              setTimeout(() => (btn.textContent = prev), 1000);
            });
        };

        hooks.onGenerateTagQr = async (id, statusEl) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          if (!current?.tagId) throw new Error("tag-missing");
          const tenantId = current.tenantId || state.uid;
          await assertStorageAvailable(tenantId);
          const tagUrl = current.tagUrl || buildMachineTagUrl(current.tagId);
          const machineForSave = {
            ...current,
            tagUrl,
            tagQrUrl: "",
            tagQrPath: "",
            tagQrSize: 0
          };
          markLocalWrite(id);
          updateMachine(id, { tagUrl, isNew: false });
          if (statusEl) {
            statusEl.textContent = t("config.generatingQr", "Generando QR...");
            statusEl.dataset.state = "neutral";
          }
          try {
            await upsertMachine(tenantId, machineForSave);
            machineForSave.isNew = false;
            await assignTag(machineForSave.tagId, tenantId, machineForSave.id);
            await upsertMachineAccessFromMachine(tenantId, machineForSave, state.uid);
            const result = await generateMachineTagQr(id, getCurrentLang());
            const qrUrl = (result.qrUrl || "").toString().trim();
            if (!qrUrl) throw new Error("qr-missing");
            updateMachine(id, {
              tagUrl: result.tagUrl || tagUrl,
              tagQrUrl: qrUrl,
              tagQrPath: result.qrPath || "",
              tagQrSize: Number(result.qrSize || 0),
              isNew: false
            });
            state.tagStatusById[id] = { text: t("config.qrGenerated", "QR generado"), state: "ok" };
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerated", "QR generado");
              statusEl.dataset.state = "ok";
            }
            renderCards({ preserveScroll: true });
            await refreshStorageFullState(tenantId);
            notifyTopbar(t("config.qrGenerated", "QR generado"));
            return result;
          } catch (error) {
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerateError", "Error al generar QR");
              statusEl.dataset.state = "error";
            }
            throw error;
          }
        };

        hooks.onAddUser = async (id, userInput, passInput, addBtn) => {
          const normalizeName = (value) =>
            (value || "")
              .trim()
              .replace(/\s+/g, " ")
              .toLowerCase();
          const rawName = userInput.value;
          const username = (rawName || "").trim().replace(/\s+/g, " ");
          const normalizedUser = normalizeName(username);
          const password = passInput.value.trim();
          const usingExisting = passInput.disabled && normalizedUser;
          const globalUsers = state.draftMachines
            .flatMap((m) => m.users || [])
            .filter((u) => u && u.username);
          const existingGlobal = globalUsers.find(
            (u) => normalizeName(u.username) === normalizedUser
          );
          const isKnown = !!existingGlobal;
          if (!username || (!password && !isKnown)) {
            userInput.setAttribute("aria-invalid", "true");
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = current.tenantId || state.uid;
          const users = Array.isArray(current.users) ? [...current.users] : [];
          if (users.some((u) => normalizeName(u.username) === normalizedUser)) {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            return;
          }
          try {
            let saltBase64 = "";
            let passwordHashBase64 = "";
            if (isKnown) {
              saltBase64 = existingGlobal ? existingGlobal.saltBase64 || "" : "";
              passwordHashBase64 = existingGlobal ? existingGlobal.passwordHashBase64 || "" : "";
            } else {
              saltBase64 = generateSaltBase64();
              passwordHashBase64 = await hashPassword(password, saltBase64);
            }
            if (!passwordHashBase64 || !saltBase64) {
              if (addBtn) {
                const prev = addBtn.textContent;
                addBtn.textContent = t("dashboard.genericError", "Error");
                setTimeout(() => (addBtn.textContent = prev), 1000);
              }
              return;
            }
            const newUser = {
              id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
              username: existingGlobal ? existingGlobal.username : username,
              role: "usuario",
              createdAt: new Date().toISOString(),
              saltBase64,
              passwordHashBase64
            };
            updateSaveState(t("dashboard.saving", "Guardando..."));
            const updatedUsers = await addUserWithRegistry(tenantId, id, newUser, {
              normalizeName,
              allowExisting: usingExisting
            });
            updateMachine(id, { users: updatedUsers });
            if (current.tagId) {
              await upsertMachineAccessFromMachine(tenantId, {
                ...current,
                users: updatedUsers
              }, state.uid);
            }
            updateSaveState(
              usingExisting
                ? t("dashboard.userAssigned", "Usuario asignado")
                : t("dashboard.userCreated", "Usuario creado")
            );
            userInput.value = "";
            passInput.value = "";
          } catch {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            updateSaveState(t("dashboard.saveError", "Error al guardar"));
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
        };

        hooks.onUpdateUserRole = (id, userId, role) => {
          const current = getDraftById(id);
          const users = (current.users || []).map((u) =>
            u.id === userId ? { ...u, role } : u
          );
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "role");
        };

        hooks.onRemoveUser = (id, userId) => {
          const current = getDraftById(id);
          const users = (current.users || []).filter((u) => u.id !== userId);
          const removedUser = (current.users || []).find((u) => u.id === userId);
          const normalizedRemoved = removedUser
            ? (removedUser.username || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase()
            : "";
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "remove-user");
          const tenantId = current.tenantId || state.uid;
          if (tenantId && normalizedRemoved) {
            const stillAssignedLocal = state.draftMachines
              .flatMap((m) => m.users || [])
              .some(
                (u) =>
                  (u.username || "")
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase() === normalizedRemoved
              );
            if (!stillAssignedLocal) {
              (async () => {
                try {
                  const remoteMachines = await fetchMachines(tenantId);
                  const stillAssignedRemote = remoteMachines
                    .flatMap((m) => m.users || [])
                    .some(
                      (u) =>
                        (u.username || "")
                          .trim()
                          .replace(/\s+/g, " ")
                          .toLowerCase() === normalizedRemoved
                    );
                  if (!stillAssignedRemote) {
                    await deleteUserRegistry(tenantId, normalizedRemoved);
                  }
                } catch {
                  // ignore cleanup errors
                }
              })();
            }
          }
        };

        hooks.onUpdateUserPassword = async (id, userId, nextPassword, input) => {
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = current.tenantId || state.uid;
          try {
            const saltBase64 = generateSaltBase64();
            const passwordHashBase64 = await hashPassword(nextPassword, saltBase64);
            const users = (current.users || []).map((u) =>
              u.id === userId ? { ...u, saltBase64, passwordHashBase64 } : u
            );
            updateMachine(id, { users });
            if (input) input.setAttribute("aria-invalid", "false");
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "user-pin");
          } catch {
            if (input) input.setAttribute("aria-invalid", "true");
          }
        };

        hooks.onDownloadLogs = (machineData) => {
          const logs = machineData.logs || [];
          const historyLocale = document.documentElement.lang === "en" ? "en-GB" : "es-ES";
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString(historyLocale);
            if (log.type === "task") {
              const title = log.title || t("history.task", "Tarea");
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              if (log.punctual) {
                const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
                return `[${time}] ${t("history.oneOffCompleted", "Tarea puntual completada")}${duration}: ${title}${user}`;
              }
              const overdueText = log.overdueDuration
                ? t("history.lateSuffix", (text) => `, ${text} tarde`)(log.overdueDuration)
                : "";
              const prefix = log.overdue
                ? t("history.completedLate", (text) => `Tarea completada fuera de plazo${text}: `)(overdueText)
                : t("history.completed", "Tarea completada: ");
              return `[${time}] ${prefix}${title}${user}`;
            }
            if (log.type === "location") {
              const value = log.value ? log.value : t("history.noLocation", "Sin ubicación");
              return `[${time}] ${t("history.location", "Ubicación")} -> ${value}`;
            }
            if (log.type === "intervencion") {
              const message = log.message || "";
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              return `[${time}] ${t("history.interventionLog", "Intervención")}: ${message}${user}`;
            }
            const value =
              log.value === "operativa"
                ? t("dashboard.statusByValue.operativa", "Operativo")
                : t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio");
            return `[${time}] ${t("history.status", "Estado")} -> ${value}`;
          });
          const blob = new Blob([lines.join("\n")], {
            type: "text/plain;charset=utf-8"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const safeTitle = (machineData.title || machineData.id || "registro")
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");
          a.href = url;
          a.download = `registro_${safeTitle}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };

        hooks.onRemoveMachine = (machineData) => {
          if (!isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(`\u00bfSeguro que quieres eliminar ${title}?, Esta acci\u00f3n no se puede deshacer.`);
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          autoSave.saveNow(machineData.id, "delete", async () => {
            const tenantId = machineData.tenantId || state.uid;
            try {
              await deleteMachine(tenantId, machineData.id);
            } catch {
              notifyTopbar("No se pudo eliminar el equipo");
              const restored = await fetchMachine(tenantId, machineData.id);
              if (restored) {
                const normalized = normalizeMachine(restored, state.draftMachines.length);
                normalized.tenantId = tenantId;
                normalized.role = "owner";
                normalized.ownerEmail = state.adminEmail || "";
                state.draftMachines = [normalized, ...state.draftMachines];
                renderCards({ preserveScroll: true });
              }
            }
          });
        };

        hooks.onLeaveAdmin = (machineData) => {
          if (isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(
            `\u00bfSeguro que quieres dejar de administrar ${title}?`
          );
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          leaveAdminRole(machineData.id).catch(() => {});
        };

        hooks.onAddIntervention = (machineData, message) => {
          const current = getDraftById(machineData.id) || machineData;
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            { ts: new Date().toISOString(), type: "intervencion", message, user }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "historial";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar(t("dashboard.interventionDone", "Intervención realizada"));
          autoSave.saveNow(machineData.id, "intervencion");
        };

        hooks.onAddTask = (id, task) => {
          const current = getDraftById(id);
          const tasks = Array.isArray(current.tasks) ? [...current.tasks] : [];
          tasks.unshift(task);
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "task_created",
              title: task.title || "Tarea",
              description: task.description || "",
              user
            }
          ];
          updateMachine(id, { tasks, logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar(t("dashboard.taskCreated", "Tarea creada"));
          autoSave.saveNow(id, "add-task");
        };

        hooks.onRemoveTask = (id, taskId) => {
          const current = getDraftById(id);
          const removed = (current.tasks || []).find((t) => t.id === taskId);
          const tasks = (current.tasks || []).filter((t) => t.id !== taskId);
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "task_removed",
              title: (removed && removed.title) || "Tarea",
              description: (removed && removed.description) || "",
              user
            }
          ];
          updateMachine(id, { tasks, logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "remove-task");
        };

        hooks.onUpdateNotifications = (id, next) => {
          updateMachine(id, { notifications: next });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "notifications");
        };

        hooks.onUpdateAdmin = async (id, email) => {
          const current = getDraftById(id);
          if (!current) return;
          const ownerEmail = (current.ownerEmail || state.adminEmail || "").trim();
          if (!isOwnerMachine(current)) {
            notifyTopbar("Solo el propietario puede asignar administrador");
            return;
          }
          const nextEmail = normalizeEmail(email);
          const ownerNormalized = normalizeEmail(ownerEmail);
          const tenantId = state.uid;

          if (!nextEmail) {
            updateMachine(id, { adminEmail: "", adminStatus: "" });
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.scheduleSave(id, "admin");
            return;
          }
          if (ownerNormalized && nextEmail === ownerNormalized) {
            updateMachine(id, {
              adminEmail: "",
              adminStatus: t("dashboard.adminOwnEmail", "Introduce otra dirección de correo que no sea la tuya")
            });
            state.selectedTabById = { ...(state.selectedTabById || {}), [id]: "configuracion" };
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
          }
          const restoreY = window.scrollY;
          const anchorCard = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
          state.nextScrollAnchor = anchorCard
            ? { id, top: anchorCard.getBoundingClientRect().top }
            : null;
          state.nextScrollRestoreY = restoreY;
          setTimeout(() => {
            if (state.nextScrollRestoreY === restoreY) state.nextScrollRestoreY = null;
            if (state.nextScrollAnchor?.id === id) state.nextScrollAnchor = null;
          }, 3000);
          try {
            await createAdminInvite(id, nextEmail);
          } catch {
            state.nextScrollRestoreY = null;
            state.nextScrollAnchor = null;
            notifyTopbar(t("dashboard.adminAssignNoPermission", "No tienes permisos para asignar administrador"));
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          notifyTopbar(t("dashboard.adminPending", "Pendiente aceptación"));
        };

        hooks.onRemoveAdmin = async (id) => {
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = getMachineTenantId(current);
          updateMachine(id, { adminEmail: "", adminStatus: "" });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await revokeAdminInvite(id, current.adminEmail || "");
          } catch {
            // ignore link update failures
          }
          autoSave.scheduleSave(id, "admin");
        };

        hooks.onTestNotification = (machineData) => {
          const logs = [
            ...(machineData.logs || []),
            {
              ts: new Date().toISOString(),
              type: "notification",
              message: t("dashboard.testNotificationRequested", "Notificación de prueba solicitada")
            }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machineData.id, "notification-test");
        };

        hooks.onCompleteTask = (id, taskId) => {
          const current = getDraftById(id);
          const baseTasks = normalizeTasks(current.tasks || []);
          const before = baseTasks.find((t) => t.id === taskId);
          const wasOverdue = before ? getTaskTiming(before).pending : false;
          const overdueDuration = before ? getOverdueDuration(before) : "";
          const completionDuration = before ? getCompletionDuration(before) : "";
          const shouldRestoreOperation =
            before?.source === RESTORE_OPERATION_TASK_SOURCE &&
            before?.statusTarget === "operativa";
          const tasks = baseTasks
            .map((t) =>
              t.id === taskId ? { ...t, lastCompletedAt: new Date().toISOString() } : t
            )
            .filter((t) => !(t.id === taskId && t.frequency === "puntual"));
          const task = baseTasks.find((t) => t.id === taskId);
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "task",
              title: task.title || "Tarea",
              user,
              overdue: !!wasOverdue,
              overdueDuration,
              punctual: task.frequency === "puntual",
              completionDuration
            }
          ];
          const updates = { tasks, logs };
          if (shouldRestoreOperation && normalizeStatus(current.status) !== "operativa") {
            updates.status = "operativa";
            logs.push({
              ts: new Date().toISOString(),
              type: "status",
              value: "operativa",
              user
            });
          }
          updateMachine(id, updates);
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar(t("dashboard.taskCompleted", "Tarea completada"));
          autoSave.saveNow(id, "task-complete");
        };

        hooks.onContentResize = () => {
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
        };

        const targetGroupId = useGroupedLayout && validGroupIds.has(layoutPlacements[machine.id]?.groupId)
          ? layoutPlacements[machine.id]?.groupId || ""
          : "";
        if (targetGroupId) renderGroup(targetGroupId);
        const target = groupTargets.get(targetGroupId) || groupTargets.get("") || list;
        if (targetGroupId) {
          const cardWrap = document.createElement("div");
          cardWrap.className = "machine-card-wrap";
          cardWrap.appendChild(card);
          target.appendChild(cardWrap);
        } else {
          target.appendChild(card);
        }
        cardRefs.set(machine.id, { card, hooks });

        if (!isExpanded) {
          collapseCard(card, { suppressAnimation: true });
        }

        let desiredTab = selectedTabById[machine.id] || "quehaceres";
        if (!card.querySelector(`.mc-tab[data-tab="${desiredTab}"]`)) {
          desiredTab = "quehaceres";
          if (state.selectedTabById) state.selectedTabById[machine.id] = "quehaceres";
        }
        if (hooks.setActiveTab && isExpanded) {
          hooks.setActiveTab(desiredTab, { notify: false });
        }

        if (isExpanded) {
          scheduleHeightSync(machine.id, () => {
            recalcHeight(card);
            requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
          });
        }
      });
    if (isMobileDashboardViewport()) {
      const expandedId = Array.from(expandedById)[0] || "";
      if (expandedId) {
        if (!state.mobileFocusedMachineId) state.mobileFocusedMachineId = expandedId;
      } else {
        clearMobileDetailState();
      }
    } else {
      clearMobileDetailState();
    }
    syncMobileDetailUI();
    if (preserveScroll) {
      state.nextScrollAnchor = null;
      restoreViewport(prevScrollY || 0, renderAnchor);
    }
    syncSearchVisualState();
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) {
      updateLoading();
    }
  };

  const handleReorder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    clearInitialGroupPriorityOrder();
    const orderMap = new Map(orderIds.map((id, index) => [id, index]));
    const orderedSet = new Set(orderIds);
    const maxCurrentOrder = state.draftMachines.reduce(
      (max, machine) => Math.max(max, typeof machine.order === "number" ? machine.order : 0),
      0
    );
    const updated = state.draftMachines.map((machine) => {
      if (!orderMap.has(machine.id)) return machine;
      autoSave.scheduleSave(machine.id, "order");
      return { ...machine, order: orderMap.get(machine.id) };
    });
    updated
      .filter((machine) => !orderedSet.has(machine.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((machine, index) => {
        if (typeof machine.order !== "number") machine.order = maxCurrentOrder + index + 1;
      });
    state.draftMachines = updated;
    saveOrderCache(updated);
    renderCards();
  };

  const updateUngroupedOrder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    clearInitialGroupPriorityOrder("");
    const orderMap = new Map(orderIds.map((id, index) => [id, index]));
    state.draftMachines = state.draftMachines.map((machine) => {
      if (!orderMap.has(machine.id)) return machine;
      autoSave.scheduleSave(machine.id, "order");
      return { ...machine, order: orderMap.get(machine.id) };
    });
    saveOrderCache(state.draftMachines);
  };

  const updateGroupedPlacementOrder = (groupId, orderIds) => {
    clearInitialGroupPriorityOrder(groupId || "");
    const placements = { ...(state.dashboardLayout.placements || {}) };
    orderIds.forEach((id, idx) => {
      placements[id] = { groupId: groupId || "", order: idx };
    });
    state.dashboardLayout.placements = placements;
  };

  const handleMixedItemReorder = (parentGroupId, items = []) => {
    if (!Array.isArray(items) || !items.length) return;
    clearInitialGroupPriorityOrder(parentGroupId || "");
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = state.dashboardLayout.groups || [];
    const placements = { ...(state.dashboardLayout.placements || {}) };
    const parentGroup = groups.find((group) => group.id === parentGroupId);
    if (parentGroup?.parentGroupId) return;

    const machineOrderMap = new Map();
    const orderedItems = [
      ...items.filter((item) => item.type === "group"),
      ...items.filter((item) => item.type === "machine")
    ];
    orderedItems.forEach((item, index) => {
      if (item.type === "machine") {
        placements[item.id] = { groupId: parentGroupId || "", order: index };
        if (!parentGroupId) machineOrderMap.set(item.id, index);
      }
      if (item.type === "group") {
        const group = groups.find((entry) => entry.id === item.id);
        if (!group) return;
        if (parentGroupId && group.id === parentGroupId) return;
        group.parentGroupId = parentGroupId || "";
        group.order = index;
        groups.forEach((entry) => {
          if (entry.parentGroupId === group.id && group.parentGroupId) entry.parentGroupId = "";
        });
      }
    });
    state.dashboardLayout.placements = placements;
    if (machineOrderMap.size) {
      state.draftMachines = state.draftMachines.map((machine) => {
        if (!machineOrderMap.has(machine.id)) return machine;
        autoSave.scheduleSave(machine.id, "order");
        return { ...machine, order: machineOrderMap.get(machine.id) };
      });
      saveOrderCache(state.draftMachines);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const compactPlacementOrders = (groupId) => {
    const placements = state.dashboardLayout?.placements || {};
    state.draftMachines
      .filter((machine) => (placements[machine.id]?.groupId || "") === (groupId || ""))
      .sort((a, b) => (placements[a.id]?.order ?? a.order ?? 0) - (placements[b.id]?.order ?? b.order ?? 0))
      .forEach((machine, index) => {
        placements[machine.id] = {
          groupId: groupId || "",
          order: index
        };
      });
  };

  const handleGroupedReorder = (groupId, orderIds) => {
    if (!state.dashboardLayout?.groups?.length) {
      handleReorder(orderIds);
      return;
    }
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    if (groupId) updateGroupedPlacementOrder(groupId, orderIds);
    else {
      updateGroupedPlacementOrder("", orderIds);
      updateUngroupedOrder(orderIds);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const createGroupFromDrop = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(t("dashboard.addGroupPrompt", "Nombre del grupo"), suggestedTitle);
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const previousDraggedGroupId = state.dashboardLayout.placements?.[draggedId]?.groupId || "";
    const previousTargetGroupId = state.dashboardLayout.placements?.[targetId]?.groupId || "";
    const groupId = createGroupId();
    state.dashboardLayout.groups = [
      ...(state.dashboardLayout.groups || []),
      {
        id: groupId,
        title: cleanTitle,
        order: state.dashboardLayout.groups.length,
        collapsed: false
      }
    ];
    state.dashboardLayout.placements = {
      ...(state.dashboardLayout.placements || {}),
      [targetId]: { groupId, order: 0 },
      [draggedId]: { groupId, order: 1 }
    };
    compactPlacementOrders(previousDraggedGroupId);
    compactPlacementOrders(previousTargetGroupId);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToTargetGroup = (draggedId, targetId) => {
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const placements = state.dashboardLayout.placements || {};
    const targetGroupId = placements[targetId]?.groupId || "";
    if (!targetGroupId) {
      createGroupFromDrop(draggedId, targetId);
      return;
    }
    const previousGroupId = placements[draggedId]?.groupId || "";
    const orderedIds = state.draftMachines
      .filter((machine) => (placements[machine.id]?.groupId || "") === targetGroupId && machine.id !== draggedId)
      .sort((a, b) => (placements[a.id]?.order ?? a.order ?? 0) - (placements[b.id]?.order ?? b.order ?? 0))
      .map((machine) => machine.id);
    const targetIndex = orderedIds.indexOf(targetId);
    orderedIds.splice(targetIndex >= 0 ? targetIndex + 1 : orderedIds.length, 0, draggedId);
    orderedIds.forEach((id, index) => {
      placements[id] = { groupId: targetGroupId, order: index };
    });
    state.dashboardLayout.placements = placements;
    compactPlacementOrders(previousGroupId);
    compactPlacementOrders(targetGroupId);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToGroup = (draggedId, targetGroupId) => {
    if (!draggedId || !targetGroupId) return;
    clearInitialGroupPriorityOrder(targetGroupId);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = state.dashboardLayout.groups || [];
    if (!groups.some((group) => group.id === targetGroupId)) return;
    const placements = state.dashboardLayout.placements || {};
    const previousGroupId = placements[draggedId]?.groupId || "";
    const nextOrder = state.draftMachines
      .filter((machine) => (placements[machine.id]?.groupId || "") === targetGroupId && machine.id !== draggedId)
      .reduce((max, machine) => Math.max(max, placements[machine.id]?.order ?? machine.order ?? 0), -1) + 1;
    placements[draggedId] = { groupId: targetGroupId, order: nextOrder };
    state.dashboardLayout.placements = placements;
    compactPlacementOrders(previousGroupId);
    compactPlacementOrders(targetGroupId);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveGroupToTargetGroup = (draggedGroupId, targetGroupId) => {
    if (!draggedGroupId || !targetGroupId || draggedGroupId === targetGroupId) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = state.dashboardLayout.groups || [];
    const draggedGroup = groups.find((group) => group.id === draggedGroupId);
    const targetGroup = groups.find((group) => group.id === targetGroupId);
    if (!draggedGroup || !targetGroup) return;
    const parentGroupId = targetGroup.parentGroupId || targetGroup.id;
    if (!parentGroupId || parentGroupId === draggedGroupId) return;
    if (targetGroup.parentGroupId === draggedGroupId) return;

    draggedGroup.parentGroupId = parentGroupId;
    draggedGroup.order =
      groups
        .filter((group) => group.parentGroupId === parentGroupId && group.id !== draggedGroupId)
        .reduce((max, group) => Math.max(max, typeof group.order === "number" ? group.order : 0), -1) + 1;

    groups.forEach((group) => {
      if (group.parentGroupId === draggedGroupId) group.parentGroupId = "";
    });
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const getUniqueTitle = () => {
    const existing = new Set(
      state.draftMachines.map((m) => (m.title || "").trim().toLowerCase())
    );
    let idx = 1;
    let title = t("dashboard.machineDefaultName", (value) => `Machine ${value}`)(idx);
    while (existing.has(title.toLowerCase())) {
      idx += 1;
      title = t("dashboard.machineDefaultName", (value) => `Machine ${value}`)(idx);
    }
    return title;
  };

  addBtn.addEventListener("click", () => {
    const order = computePrevOrder();
    const machine = createDraftMachine(state.draftMachines.length + 1, order);
    machine.title = getUniqueTitle();
    machine.tenantId = state.uid;
    machine.role = "owner";
    machine.ownerEmail = state.adminEmail || "";
    state.draftMachines = [machine, ...state.draftMachines];
    saveOrderCache(state.draftMachines);
    renderCards();
    autoSave.saveNow(machine.id, "create");
  });

  const fetchAdminMachines = async (uid, email) => {
    const links = await fetchLinksForAdmin(uid, "accepted");
    const machines = await Promise.all(
      links.map(async (link) => {
        if (!link.ownerUid || !link.machineId) return null;
        if (link.status !== "accepted") return null;
        const data = await fetchMachine(link.ownerUid, link.machineId);
        if (!data) return null;
        const normalized = normalizeMachine(data, state.draftMachines.length);
        normalized.tenantId = link.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = link.ownerEmail || "";
        return normalized;
      })
    );
    return machines.filter(Boolean);
  };

  const initDashboard = async (uid, user) => {
    state.uid = uid;
    state.adminLabel = user.displayName || user.email || t("dashboard.admin", "Administrador");
    state.adminEmail = user.email || "";
    refreshStorageFullState(uid);
    armLoadingGuard();
    try {
      await upsertAccountDirectory(user);
    } catch {
      // ignore directory write errors
    }
    try {
      state.dashboardLayout = normalizeDashboardLayout(await fetchDashboardLayout(uid));
    } catch {
      state.dashboardLayout = { groups: [], placements: {}, tabOrder: normalizeTabOrder() };
    }

    let ownerFetchResolved = false;
    let ownerBootstrap = [];
    try {
      const remote = await fetchMachines(uid);
      ownerFetchResolved = true;
      ownerBootstrap = remote
        .map((m, idx) => normalizeMachine(m, idx))
        .filter(Boolean)
        .map((m) => ({
          ...m,
          tenantId: uid,
          role: "owner",
          ownerEmail: state.adminEmail || ""
        }));
      if (!remote.length) {
        const legacy = await fetchLegacyMachines(uid);
        if (legacy.length) {
          await migrateLegacyMachines(uid, legacy);
        }
      }
    } catch {
      // ignore migration failures
    }

    const emailLower = normalizeEmail(user.email || "");
    if (ownerFetchResolved) {
      state.ownerMachines = ownerBootstrap;
      if (!state.ownerReady) {
        state.ownerReady = true;
        updateLoading();
      }
    }
    try {
      const adminBootstrap = await fetchAdminMachines(uid, emailLower);
      state.adminMachines = adminBootstrap;
      if (!state.adminReady) {
        state.adminReady = true;
        updateLoading();
      }
    } catch {
      // ignore admin bootstrap failures
    }
    scheduleRebuild({ preserveScroll: true });
    subscribeOwnerMachines(uid);
    subscribeAdminLinks(uid);
    subscribePendingInvites(emailLower);
    try {
      const acceptedInvites = await fetchInvitesForAdmin(emailLower, "accepted");
      await Promise.all(
        acceptedInvites.map((invite) => ensureAdminLink(invite.id))
      );
    } catch {
      // ignore invite ensure failures
    }
    renderCards();
    initGroupedDragAndDrop(list, {
      onReorder: handleGroupedReorder,
      onReorderItems: handleMixedItemReorder,
      onDropOnCard: moveMachineToTargetGroup,
      onDropMachineOnGroup: moveMachineToGroup,
      onDropGroupOnGroup: moveGroupToTargetGroup
    });
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (isPublicSectionHash()) {
        mount.hidden = true;
        return;
      }
      redirectToEntry();
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = `${appBasePrefix || ""}/?setup=1`;
        return;
      }
    } catch {
      window.location.href = `${appBasePrefix || ""}/?setup=1`;
      return;
    }
    initDashboard(user.uid, user);
  });
}
