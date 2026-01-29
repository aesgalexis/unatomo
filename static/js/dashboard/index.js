import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth, db } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, upsertMachine, deleteMachine } from "./firestoreRepo.js";
import { validateTag, assignTag } from "./tagRepo.js";
import { upsertMachineAccessFromMachine, fetchMachineAccess } from "./machineAccessRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initDragAndDrop } from "./dragAndDrop.js";
import { cloneMachines, normalizeMachine, createDraftMachine } from "./machineStore.js";
import { generateSaltBase64, hashPassword } from "/static/js/utils/crypto.js";
import { initAutoSave } from "./autoSave.js";
import { normalizeTasks } from "/static/js/dashboard/tabs/tasks/tasksModel.js";
import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("dashboard-mount");

if (mount) {
  const state = {
    uid: null,
    adminLabel: "",
    remoteMachines: [],
    draftMachines: [],
    expandedById: [],
    selectedTabById: {},
    configSubtabById: {},
    tagStatusById: {}
  };

  const cardRefs = new Map();
  const tagUnsubs = new Map();
  const tagIdByMachineId = new Map();
  const machineIdByTagId = new Map();

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

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.textContent = "Añadir";

  const saveStatus = document.createElement("span");
  saveStatus.className = "save-status";

  addBar.appendChild(addBtn);
  addBar.appendChild(saveStatus);

  const list = document.createElement("div");
  list.id = "machineList";

  mount.appendChild(addBar);
  mount.appendChild(list);

  let statusTimeout = null;
  const updateSaveState = (message = "") => {
    if (statusTimeout) clearTimeout(statusTimeout);
    saveStatus.textContent = message;
    if (message && message !== "Guardando...") {
      statusTimeout = setTimeout(() => {
        saveStatus.textContent = "";
      }, 1600);
    }
  };

  const renderPlaceholder = () => {
    list.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "machine-placeholder";
    placeholder.textContent =
      "Todavía no hay máquinas. Pulsa ‘Añadir’ para crear la primera.";
    list.appendChild(placeholder);
  };

  const recalcHeight = (card) => {
    const header = card.querySelector(".mc-header");
    const expand = card.querySelector(".mc-expand");
    const headerH = header.offsetHeight;
    const contentH = expand.scrollHeight;
    const minH = COLLAPSED_HEIGHT * EXPAND_FACTOR;
    const target = Math.max(minH, headerH + contentH);
    card.style.maxHeight = `${target}px`;
  };

  const collapseCard = (card, options = {}) => {
    card.dataset.expanded = "false";
    card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
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
      statusBtn.textContent = statusLabels[status] || status;
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

  const updateTagStatusUI = (id) => {
    const status = state.tagStatusById[id];
    const card = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
    if (!card) return;
    const statusEl = card.querySelector('.mc-panel[data-panel="configuracion"] .mc-tag-status');
    if (!statusEl) return;
    statusEl.textContent = status.text || "";
    statusEl.dataset.state = status.state || "";
  };

  const autoSave = initAutoSave({
    notify: updateSaveState,
    saveFn: async (machineId) => {
      if (!state.uid) throw new Error("no-auth");
      const machine = getDraftById(machineId);
      if (!machine) return;
      if (machine.tagId) {
        const res = await validateTag(machine.tagId);
        if (!res.exists) {
          state.tagStatusById[machine.id] = { text: "Tag no existe", state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-missing");
        }
        if (res.machineId && res.machineId !== machine.id) {
          state.tagStatusById[machine.id] = { text: "Tag ya está asignado", state: "error" };
          updateTagStatusUI(machine.id);
          throw new Error("tag-assigned");
        }
      }
      await upsertMachine(state.uid, machine);
      machine.isNew = false;
      if (machine.tagId) {
        await assignTag(machine.tagId, state.uid, machine.id);
        await upsertMachineAccessFromMachine(state.uid, machine);
        state.tagStatusById[machine.id] = { text: "Tag enlazado", state: "ok" };
      }
      updateTagStatusUI(machine.id);
    }
  });

  const heightRAF = new Map();
  const scheduleHeightSync = (id, fn) => {
    if (heightRAF.has(id)) cancelAnimationFrame(heightRAF.get(id));
    heightRAF.set(id, requestAnimationFrame(fn));
  };

  const renderCards = ({ preserveScroll = false } = {}) => {
    const prevScrollY = preserveScroll ? window.scrollY : null;
    list.innerHTML = "";
    const machines = Array.isArray(state.draftMachines) ? state.draftMachines : [];
    if (!machines.length) {
      renderPlaceholder();
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
    machines
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((machine) => {
        if (machine.tagId && !state.tagStatusById[machine.id]) {
          state.tagStatusById[machine.id] = { text: "Tag enlazado", state: "ok" };
        }
        const { card, hooks } = createMachineCard(machine, {
          tagStatus: state.tagStatusById[machine.id],
          adminLabel: state.adminLabel,
          mode: "dashboard",
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
          locations: state.locations
        });
        card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;

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
          replaceMachine(machine.id, {
            ...current,
            status: nextStatus,
            logs: [
              ...(current.logs || []),
              { ts: new Date().toISOString(), type: "status", value: nextStatus }
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
                errorEl.textContent = `Año inválido (entre ${currentYear - 50} y ${currentYear}).`;
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
          } else {
            updateMachine(id, { [field]: value });
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
          try {
            const res = await validateTag(tagId);
            if (!res.exists) {
              statusEl.textContent = "Tag no existe";
              statusEl.dataset.state = "error";
              return;
            }
            if (res.machineId && res.machineId !== id) {
              statusEl.textContent = "Tag ya está asignado";
              statusEl.dataset.state = "error";
              return;
            }
            updateMachine(id, { tagId });
            state.tagStatusById[id] = { text: "Tag enlazado", state: "ok" };
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "tag");
          } catch {
            statusEl.textContent = "Error al validar el tag";
            statusEl.dataset.state = "error";
          }
        };

        hooks.onDisconnectTag = (id) => {
          updateMachine(id, { tagId: null });
          state.tagStatusById[id] = { text: "Tag desconectado", state: "error" };
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "tag-disconnect");
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
          const username = userInput.value.trim();
          const password = passInput.value.trim();
          if (!username || !password) {
            userInput.setAttribute("aria-invalid", "true");
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = "Revisa los datos";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          const current = getDraftById(id);
          const users = Array.isArray(current.users) ? [...current.users] : [];
          if (users.some((u) => u.username === username)) {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = "Duplicado";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          try {
            const saltBase64 = generateSaltBase64();
            const passwordHashBase64 = await hashPassword(password, saltBase64);
            users.push({
              id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
              username,
              role: "usuario",
              createdAt: new Date().toISOString(),
              saltBase64,
              passwordHashBase64
            });
            updateMachine(id, { users });
            userInput.value = "";
            passInput.value = "";
          } catch {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = "Error al cifrar";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "add-user");
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
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "remove-user");
        };

        hooks.onDownloadLogs = (machineData) => {
          const logs = machineData.logs || [];
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString("es-ES");
            if (log.type === "task") {
              const title = log.title || "Tarea";
              const user = log.user ? ` - por ${log.user}` : "";
              const prefix = log.overdue ? "Tarea completada fuera de plazo: " : "Tarea completada: ";
              return `[${time}] ${prefix}${title}${user}`;
            }
            if (log.type === "location") {
              const value = log.value ? log.value : "Sin ubicación";
              return `[${time}] Ubicación -> ${value}`;
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
          const ok = window.confirm("¿Seguro que quieres eliminar este equipo");
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          autoSave.saveNow(machineData.id, "delete", async () => {
            await deleteMachine(state.uid, machineData.id);
          });
        };

        hooks.onAddTask = (id, task) => {
          const current = getDraftById(id);
          const tasks = Array.isArray(current.tasks) ? [...current.tasks] : [];
          tasks.unshift(task);
          updateMachine(id, { tasks });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "add-task");
        };

        hooks.onRemoveTask = (id, taskId) => {
          const current = getDraftById(id);
          const tasks = (current.tasks || []).filter((t) => t.id !== taskId);
          updateMachine(id, { tasks });
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

        hooks.onTestNotification = (machineData) => {
          const logs = [
            ...(machineData.logs || []),
            {
              ts: new Date().toISOString(),
              type: "notification",
              message: "Notificación de prueba solicitada"
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
          const tasks = normalizeTasks(current.tasks || []).map((t) =>
            t.id === taskId ? { ...t, lastCompletedAt: new Date().toISOString() } : t
          );
          const task = tasks.find((t) => t.id === taskId);
          const before = normalizeTasks(current.tasks || []).find((t) => t.id === taskId);
          const wasOverdue = before ? getTaskTiming(before).pending : false;
          const user = state.adminLabel || "Administrador";
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "task",
              title: task.title || "Tarea",
              user,
              overdue: !!wasOverdue
            }
          ];
          updateMachine(id, { tasks, logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "task-complete");
        };

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
        if (hooks.setActiveTab) {
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
    const order = computeNextOrder();
    const machine = createDraftMachine(state.draftMachines.length + 1, order);
    machine.title = getUniqueTitle();
    state.draftMachines = [machine, ...state.draftMachines];
    renderCards();
    autoSave.saveNow(machine.id, "create");
  });

  const initDashboard = async (uid, user) => {
    state.uid = uid;
    state.adminLabel = user.displayName || user.email || "Administrador";
    const remote = await fetchMachines(uid);
    const normalized = remote
      .map((m, idx) => normalizeMachine(m, idx))
      .filter(Boolean);
    const merged = await mergeOperationalFromTag(normalized);
    setRemote(merged);
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
