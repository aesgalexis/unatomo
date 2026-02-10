import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, db } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, fetchLegacyMachines, migrateLegacyMachines, fetchMachine, upsertMachine, deleteMachine, addUserWithRegistry, deleteUserRegistry } from "./firestoreRepo.js";
import { upsertAccountDirectory, normalizeEmail } from "./admin/accountDirectoryRepo.js";
import { fetchInvitesForAdmin } from "./admin/adminInvitesRepo.js";
import { fetchLinksForAdmin } from "./admin/adminLinksRepo.js";
import { createAdminInvite, respondAdminInvite, leaveAdminRole, revokeAdminInvite, ensureAdminLink } from "./admin/adminFunctionsRepo.js";
import { validateTag, assignTag } from "./tagRepo.js";
import { createTagToken } from "/static/js/tokens/tagTokens.js";
import { upsertMachineAccessFromMachine, fetchMachineAccess } from "./machineAccessRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initDragAndDrop } from "./dragAndDrop.js";
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

const mount = document.getElementById("dashboard-mount");

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
    searchQuery: "",
    pendingInvites: [],
    loading: true,
    ownerReady: false,
    adminReady: false,
    revealPending: false,
    revealedOnce: false,
    lastRenderAt: 0,
    renderSeq: 0,
    ownerUnsub: null,
    adminLinksUnsub: null,
    adminMachineUnsubs: new Map(),
    inviteUnsub: null
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

  const statusLabels = {
    operativa: "Operativo",
    fuera_de_servicio: "Fuera de servicio"
  };

  const normalizeStatus = (value) =>
    value === "desconectada" ? "fuera_de_servicio" : value || "operativa";

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

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const { wrap: loadingEl, setProgress: setLoadingProgress } = createDashboardLoading();

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.innerHTML = "<span class=\"btn-add-icon\">+</span>";
  addBtn.setAttribute("aria-label", "Añadir");

  const searchInput = createMachineSearchBar({
    placeholder: "Buscar por nombre o ubicaci\u00f3n...",
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
  const orderBtn = document.createElement("button");
  orderBtn.type = "button";
  orderBtn.className = "btn-order";
  orderBtn.setAttribute("aria-label", "Ordenar");
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

  const list = document.createElement("div");
  list.id = "machineList";
  list.className = "cards-reveal";

  const inviteBanner = document.createElement("div");
  inviteBanner.className = "admin-invite-banner";
  inviteBanner.style.display = "none";

  addBar.appendChild(loadingEl);
  mount.appendChild(addBar);
  mount.appendChild(inviteBanner);
  mount.appendChild(filterInfo);
  mount.appendChild(list);

  const updateSaveState = (message = "") => {
    setTopbarSaveStatus(message);
  };
  const notifyTopbar = (message = "") => {
    setTopbarSaveStatus(message);
  };

  const updateLoading = () => {
    const total = 2;
    const ready = (state.ownerReady ? 1 : 0) + (state.adminReady ? 1 : 0);
    const pct = Math.round((ready / total) * 100);
    setLoadingProgress(pct);
    if (ready >= total && state.loading) {
      state.loading = false;
      if (!state.revealedOnce) {
        state.revealPending = true;
      }
      addBtn.disabled = false;
      searchInput.disabled = false;
      orderBtn.disabled = false;
      setTimeout(() => {
        loadingEl.style.display = "none";
      }, 2000);
    }
  };

  let revealTimer = null;
  let revealIdleTimer = null;
  const scheduleReveal = (seq) => {
    if (state.revealedOnce) return;
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(() => {
      if (state.revealedOnce) return;
      if (seq !== state.renderSeq) return;
      const cards = Array.from(list.querySelectorAll(".machine-card"));
      if (!cards.length) {
        state.revealPending = true;
        return;
      }
      list.dataset.reveal = "true";
      requestAnimationFrame(() => {
        cards.forEach((card) => card.classList.add("is-reveal"));
      });
      setTimeout(() => {
        if (seq !== state.renderSeq) return;
        list.dataset.reveal = "false";
        cards.forEach((card) => card.classList.remove("is-reveal"));
        state.revealedOnce = true;
        state.revealPending = false;
      }, cards.length * 136 + 1200);
    }, 80);
  };
  const queueRevealAfterIdle = (seq) => {
    if (state.revealedOnce) return;
    if (revealIdleTimer) clearTimeout(revealIdleTimer);
    revealIdleTimer = setTimeout(() => {
      if (state.revealedOnce) return;
      if (state.renderSeq !== seq) return;
      const idleFor = Date.now() - state.lastRenderAt;
      if (idleFor < 140) {
        queueRevealAfterIdle(state.renderSeq);
        return;
      }
      scheduleReveal(seq);
    }, 160);
  };

  addBtn.disabled = true;
  searchInput.disabled = true;
  orderBtn.disabled = true;

  const renderPlaceholder = () => {
    list.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "machine-placeholder";
    placeholder.textContent =
      "TodavÃ­a no hay mÃ¡quinas. Pulsa â€˜AÃ±adirâ€™ para crear la primera.";
    list.appendChild(placeholder);
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
    state.ownerUnsub = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
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
    });
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
    state.adminLinksUnsub = onSnapshot(q, (snap) => {
      if (!state.adminReady) {
        state.adminReady = true;
        updateLoading();
      }
      const links = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      state.adminLinks = links;
      const activeLinks = links.filter((link) => link.status !== "left" && link.status !== "rejected");
      syncAdminMachineListeners(activeLinks);
      scheduleRebuild({ preserveScroll: true });
    });
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

  const renderInviteBanner = () => {
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    if (!invites.length) {
      inviteBanner.innerHTML = "";
      inviteBanner.style.display = "none";
      setTopbarNotifications([]);
      return;
    }
    inviteBanner.innerHTML = "";
    inviteBanner.style.display = "flex";
    invites.forEach((invite) => {
      const row = document.createElement("div");
      row.className = "invite-row";
      const text = document.createElement("div");
      text.className = "invite-text";
      const ownerLabel = invite.ownerEmail || "Un usuario";
      text.textContent = `${ownerLabel} quiere que administres 1 Equipo/s`;
      const actions = document.createElement("div");
      actions.className = "invite-actions";
      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "mc-location-accept";
      acceptBtn.textContent = "Aceptar";
      acceptBtn.addEventListener("click", () => handleInviteDecision(invite, "accepted"));
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "mc-location-cancel";
      rejectBtn.textContent = "Rechazar";
      rejectBtn.addEventListener("click", () => handleInviteDecision(invite, "rejected"));
      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      row.appendChild(text);
      row.appendChild(actions);
      inviteBanner.appendChild(row);
    });

    setTopbarNotifications(
      invites.map((invite) => ({
        text: `${invite.ownerEmail || "Un usuario"} quiere que administres 1 Equipo/s`,
        actions: [
          { label: "Aceptar", className: "mc-location-accept", onClick: () => handleInviteDecision(invite, "accepted") },
          { label: "Rechazar", className: "mc-location-cancel", onClick: () => handleInviteDecision(invite, "rejected") }
        ]
      }))
    );
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
        const user = state.adminLabel || state.adminEmail || "Administrador";
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
    saveFn: async (machineId) => {
      if (!state.uid) throw new Error("no-auth");
      const machine = getDraftById(machineId);
      if (!machine) return;
      const tenantId = machine.tenantId || state.uid;
      if (machine.tagId) {
        const res = await validateTag(machine.tagId);
        if (!res.exists) {
          state.tagStatusById[machine.id] = { text: "El Tag ID introducido no existe", state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-missing");
        }
        if (res.machineId && res.machineId !== machine.id) {
          state.tagStatusById[machine.id] = { text: "Tag ya estÃ¡ asignado", state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-assigned");
        }
      }
      await upsertMachine(tenantId, machine);
      machine.isNew = false;
      if (machine.tagId) {
        await assignTag(machine.tagId, tenantId, machine.id);
        await upsertMachineAccessFromMachine(tenantId, machine, state.uid);
        state.tagStatusById[machine.id] = { text: "Tag enlazado", state: "ok" };
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

  const renderCards = ({ preserveScroll = false } = {}) => {
    const prevScrollY = preserveScroll ? window.scrollY : null;
    state.renderSeq += 1;
    const renderSeq = state.renderSeq;
    state.lastRenderAt = Date.now();
    list.innerHTML = "";
    if (state.revealPending && !state.revealedOnce) {
      list.dataset.reveal = "true";
    } else {
      list.dataset.reveal = "false";
    }
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
      filterInfo.textContent = `Mostrando ${visibleMachines.length}/${machines.length} Equipos`;
      filterInfo.style.display = "block";
    } else {
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
    }
    if (!machines.length) {
      renderPlaceholder();
      if (preserveScroll) {
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY || 0));
      }
      return;
    }
    if (!visibleMachines.length) {
      list.innerHTML = "";
      const placeholder = document.createElement("div");
      placeholder.className = "machine-placeholder";
      placeholder.textContent = `No hay resultados para "${query}".`;
      list.appendChild(placeholder);
      if (preserveScroll) {
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY || 0));
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
    visibleMachines
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((machine, idx) => {
        if (machine.tagId && !state.tagStatusById[machine.id]) {
          state.tagStatusById[machine.id] = { text: "Tag enlazado", state: "ok" };
        }
        const { card, hooks } = createMachineCard(machine, {
          tagStatus: state.tagStatusById[machine.id],
          adminLabel: state.adminLabel,
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
          visibleTabs: ["quehaceres", "general", "historial", "configuracion"],
          userRoles: ["usuario", "tecnico", "externo"],
          createdBy: state.adminLabel || null,
          operationalSource: machine._operationalSource || "local",
          locations: state.locations,
          knownUsers: state.knownUsers
        });
        card.style.maxHeight = `${getCollapsedHeightPx()}px`;

        hooks.onToggleExpand = (node) => {
          if (node.classList.contains("is-dragging")) return;
          const isExpanded = node.dataset.expanded === "true";
          if (isExpanded) {
            expandedById.delete(machine.id);
            collapseCard(node);
          } else {
            expandedById.clear();
            expandedById.add(machine.id);
            list.querySelectorAll(".machine-card").forEach((cardEl) => {
              if (cardEl !== node) collapseCard(cardEl);
            });
            expandCard(node);
          }
          state.expandedById = Array.from(expandedById);
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
          const user = state.adminLabel || "Administrador";
          replaceMachine(machine.id, {
            ...current,
            status: nextStatus,
            logs: [
              ...(current.logs || []),
              { ts: new Date().toISOString(), type: "status", value: nextStatus, user }
            ]
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
            updateSaveState("Nombre duplicado");
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
                errorEl.textContent = `AÃ±o invÃ¡lido (entre ${currentYear - 50} y ${currentYear}).`;
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
          if (!tagId) return;
          statusEl.textContent = "Comprobando...";
          statusEl.dataset.state = "neutral";
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            const res = await validateTag(tagId);
            if (!res.exists) {
              statusEl.textContent = "El Tag ID introducido no existe";
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return;
            }
            if (res.machineId && res.machineId !== id) {
              statusEl.textContent = "Tag ya estÃ¡ asignado";
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return;
            }
            updateMachine(id, { tagId });
            state.tagStatusById[id] = { text: "Tag enlazado", state: "ok" };
            notifyTopbar("Tag enlazado");
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "tag");
          } catch {
            statusEl.textContent = "Error al validar el tag";
            statusEl.dataset.state = "error";
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
          }
        };

        hooks.onDisconnectTag = (id) => {
          updateMachine(id, { tagId: null });
          state.tagStatusById[id] = { text: "Tag desconectado", state: "error" };
          notifyTopbar("Tag desconectado");
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "tag-disconnect");
        };

        hooks.onGenerateTag = async (id) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || state.uid : state.uid;
          const newId = await createTagToken(tenantId);
          notifyTopbar("Tag ID generado");
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
              btn.textContent = "Copiado";
              setTimeout(() => (btn.textContent = prev), 1000);
            });
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
              addBtn.textContent = "Error";
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
              addBtn.textContent = "Error";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = "El usuario ya existe";
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
                addBtn.textContent = "Error";
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
            updateSaveState("Guardando...");
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
            updateSaveState(usingExisting ? "Usuario asignado" : "Usuario creado");
            userInput.value = "";
            passInput.value = "";
          } catch {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = "Error";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = "El usuario ya existe";
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            updateSaveState("Error al guardar");
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
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString("es-ES");
            if (log.type === "task") {
              const title = log.title || "Tarea";
              const user = log.user ? ` - por ${log.user}` : "";
              if (log.punctual) {
                const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
                return `[${time}] Tarea puntual completada${duration}: ${title}${user}`;
              }
              const overdueText = log.overdueDuration
                ? `, ${log.overdueDuration} tarde`
                : "";
              const prefix = log.overdue
                ? `Tarea completada fuera de plazo${overdueText}: `
                : "Tarea completada: ";
              return `[${time}] ${prefix}${title}${user}`;
            }
            if (log.type === "location") {
              const value = log.value ? log.value : "Sin ubicaci\u00f3n";
              return `[${time}] Ubicaci\u00f3n -> ${value}`;
            }
            if (log.type === "intervencion") {
              const message = log.message || "";
              const user = log.user ? ` - por ${log.user}` : "";
              return `[${time}] Intervencion: ${message}${user}`;
            }
            const value =
              log.value === "operativa"
                ? "Operativo"
                : "Fuera de servicio";
            return `[${time}] Estado -> ${value}`;
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
          const user = state.adminLabel || "Administrador";
          const logs = [
            ...(current.logs || []),
            { ts: new Date().toISOString(), type: "intervencion", message, user }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "historial";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar("IntervenciÃ³n realizada");
          autoSave.saveNow(machineData.id, "intervencion");
        };

        hooks.onAddTask = (id, task) => {
          const current = getDraftById(id);
          const tasks = Array.isArray(current.tasks) ? [...current.tasks] : [];
          tasks.unshift(task);
          const user = state.adminLabel || "Administrador";
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
          notifyTopbar("Tarea creada");
          autoSave.saveNow(id, "add-task");
        };

        hooks.onRemoveTask = (id, taskId) => {
          const current = getDraftById(id);
          const removed = (current.tasks || []).find((t) => t.id === taskId);
          const tasks = (current.tasks || []).filter((t) => t.id !== taskId);
          const user = state.adminLabel || "Administrador";
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
              adminStatus: "Introduce otra direcciÃ³n de correo que no se la tuya"
            });
            state.selectedTabById = { ...(state.selectedTabById || {}), [id]: "configuracion" };
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
          }
          try {
            await createAdminInvite(id, nextEmail);
          } catch {
            notifyTopbar("No tienes permisos para asignar administrador");
            return;
          }

          updateMachine(id, {
            adminEmail: nextEmail,
            adminStatus: "Pendiente aceptaciÃ³n"
          });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "admin");
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
              message: "NotificaciÃ³n de prueba solicitada"
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
          const tasks = baseTasks
            .map((t) =>
              t.id === taskId ? { ...t, lastCompletedAt: new Date().toISOString() } : t
            )
            .filter((t) => !(t.id === taskId && t.frequency === "puntual"));
          const task = baseTasks.find((t) => t.id === taskId);
          const user = state.adminLabel || "Administrador";
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
          updateMachine(id, { tasks, logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar("Tarea completada");
          autoSave.saveNow(id, "task-complete");
        };

        hooks.onContentResize = () => {
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
        };

        if (!state.revealedOnce) {
          card.style.setProperty("--reveal-delay", `${idx * 136}ms`);
        } else {
          card.style.removeProperty("--reveal-delay");
        }
        list.appendChild(card);
        cardRefs.set(machine.id, { card, hooks });

        const isExpanded = expandedById.has(machine.id);
        if (isExpanded) {
          expandCard(card, { suppressAnimation: true });
        } else {
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
          scheduleHeightSync(machine.id, () => recalcHeight(card));
        }
      });
    if (preserveScroll) {
      requestAnimationFrame(() => window.scrollTo(0, prevScrollY || 0));
    }
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) {
      updateLoading();
    }
    if (state.revealPending && !state.revealedOnce) {
      queueRevealAfterIdle(renderSeq);
    }
  };

  const handleReorder = (orderIds) => {
    const updated = [];
    orderIds.forEach((id, idx) => {
      const current = getDraftById(id);
      if (!current) return;
      updated.push({ ...current, order: idx });
      autoSave.scheduleSave(id, "order");
    });
    state.draftMachines = updated;
    saveOrderCache(updated);
    renderCards();
  };

  const getUniqueTitle = () => {
    const existing = new Set(
      state.draftMachines.map((m) => (m.title || "").trim().toLowerCase())
    );
    let idx = 1;
    let title = `Equipo ${idx}`;
    while (existing.has(title.toLowerCase())) {
      idx += 1;
      title = `Equipo ${idx}`;
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
    state.adminLabel = user.displayName || user.email || "Administrador";
    state.adminEmail = user.email || "";
    try {
      await upsertAccountDirectory(user);
    } catch {
      // ignore directory write errors
    }

    try {
      const remote = await fetchMachines(uid);
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
    initDragAndDrop(list, handleReorder);
  };

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/es/auth/login.html";
      return;
    }
    initDashboard(user.uid, user);
  });
}






