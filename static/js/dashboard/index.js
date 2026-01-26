import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "/static/js/firebase/firebaseApp.js";
import { fetchMachines, commitChanges } from "./firestoreRepo.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initDragAndDrop } from "./dragAndDrop.js";
import { cloneMachines, normalizeMachine, createDraftMachine } from "./machineStore.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("dashboard-mount");

if (mount) {
  const state = {
    uid: null,
    remoteMachines: [],
    draftMachines: [],
    dirtyById: new Set(),
    deletedIds: new Set(),
    expandedById: [],
    selectedTabById: {},
    saving: false
  };

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.textContent = "Añadir";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.id = "saveChangesBtn";
  saveBtn.className = "btn-save";
  saveBtn.textContent = "Guardar cambios";
  saveBtn.disabled = true;

  const saveStatus = document.createElement("span");
  saveStatus.className = "save-status";

  addBar.appendChild(addBtn);
  addBar.appendChild(saveBtn);
  addBar.appendChild(saveStatus);

  const list = document.createElement("div");
  list.id = "machineList";

  mount.appendChild(addBar);
  mount.appendChild(list);

  const updateSaveState = (message = "") => {
    const dirty =
      state.dirtyById.size > 0 ||
      state.deletedIds.size > 0 ||
      state.draftMachines.some((m) => m.isNew);
    saveBtn.disabled = !dirty || state.saving;
    saveStatus.textContent = message;
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

  const collapseCard = (card) => {
    card.dataset.expanded = "false";
    card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
  };

  const expandCard = (card) => {
    card.dataset.expanded = "true";
    recalcHeight(card);
  };

  const setRemote = (remote) => {
    state.remoteMachines = cloneMachines(remote);
    state.draftMachines = cloneMachines(remote);
    state.dirtyById.clear();
    state.deletedIds.clear();
    updateSaveState("");
  };

  const getDraftIndex = (id) => state.draftMachines.findIndex((m) => m.id === id);

  const markDirty = (id) => {
    if (!id) return;
    state.dirtyById.add(id);
    updateSaveState("");
  };

  const updateMachine = (id, patch) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = { ...state.draftMachines[idx], ...patch };
    markDirty(id);
  };

  const replaceMachine = (id, next) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = next;
    markDirty(id);
  };

  const removeMachine = (id) => {
    if (!id) return;
    state.deletedIds.add(id);
    state.draftMachines = state.draftMachines.filter((m) => m.id !== id);
    state.dirtyById.delete(id);
    updateSaveState("");
  };

  const computeNextOrder = () => {
    const maxOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order > acc ? m.order : acc),
      -1
    );
    return maxOrder + 1;
  };

  const renderCards = () => {
    list.innerHTML = "";
    const machines = Array.isArray(state.draftMachines) ? state.draftMachines : [];
    if (!machines.length) {
      renderPlaceholder();
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

    machines
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((machine) => {
        const { card, hooks } = createMachineCard(machine);
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
            recalcHeight(node);
          }
        };

        hooks.onStatusToggle = (node) => {
          const statusOrder = ["operativa", "fuera_de_servicio", "desconectada"];
          const current = state.draftMachines.find((m) => m.id === machine.id);
          const currentStatus = current?.status || "operativa";
          const idx = statusOrder.indexOf(currentStatus);
          const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
          const keepExpanded = node.dataset.expanded === "true";
          updateMachine(machine.id, { status: nextStatus });
          replaceMachine(machine.id, {
            ...state.draftMachines.find((m) => m.id === machine.id),
            logs: [
              ...(current?.logs || []),
              { ts: new Date().toISOString(), type: "status", value: nextStatus }
            ]
          });
          renderCards();
          if (keepExpanded) {
            expandedById.add(machine.id);
            state.expandedById = Array.from(expandedById);
          }
        };

        hooks.onTitleUpdate = (node, nextTitle) => {
          updateMachine(machine.id, { title: nextTitle });
        };

        hooks.onGenerateUrl = (id) => {
          const url = `${window.location.origin}/es/index.html#/m/${id}`;
          updateMachine(id, { url });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        hooks.onCopyUrl = (id, btn, input) => {
          const current = state.draftMachines.find((m) => m.id === id);
          if (!current?.url) {
            btn.textContent = "Primero genera la URL";
            setTimeout(() => (btn.textContent = "⧉"), 1000);
            return;
          }
          navigator.clipboard
            .writeText(current.url)
            .catch(() => {
              input.select();
              document.execCommand("copy");
            })
            .finally(() => {
              btn.textContent = "Copiado";
              setTimeout(() => (btn.textContent = "⧉"), 1000);
            });
        };

        hooks.onAddUser = (id, userInput, passInput, addBtn) => {
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
          const current = state.draftMachines.find((m) => m.id === id);
          const users = Array.isArray(current?.users) ? [...current.users] : [];
          if (users.some((u) => u.username === username)) {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = "Duplicado";
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          users.push({
            id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
            username,
            password,
            role: "usuario",
            createdAt: new Date().toISOString()
          });
          updateMachine(id, { users });
          userInput.value = "";
          passInput.value = "";
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        hooks.onUpdateUserRole = (id, userId, role) => {
          const current = state.draftMachines.find((m) => m.id === id);
          const users = (current?.users || []).map((u) =>
            u.id === userId ? { ...u, role } : u
          );
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        hooks.onRemoveUser = (id, userId) => {
          const current = state.draftMachines.find((m) => m.id === id);
          const users = (current?.users || []).filter((u) => u.id !== userId);
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        hooks.onDownloadLogs = (machineData) => {
          const logs = machineData.logs || [];
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString("es-ES");
            const value =
              log.value === "operativa"
                ? "Operativa"
                : log.value === "fuera_de_servicio"
                ? "Fuera de servicio"
                : "Desconectada";
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
          const ok = window.confirm("¿Seguro que quieres eliminar este equipo?");
          if (!ok) return;
          removeMachine(machineData.id);
          renderCards();
        };

        hooks.onAddTask = (id, titleInput, freqSelect, btn) => {
          const title = titleInput.value.trim();
          if (!title) {
            titleInput.setAttribute("aria-invalid", "true");
            if (btn) {
              const prev = btn.textContent;
              btn.textContent = "Revisa el título";
              setTimeout(() => (btn.textContent = prev), 1000);
            }
            return;
          }
          const current = state.draftMachines.find((m) => m.id === id);
          const tasks = Array.isArray(current?.tasks) ? [...current.tasks] : [];
          tasks.unshift({
            id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
            title,
            frequency: freqSelect.value,
            createdAt: new Date().toISOString()
          });
          updateMachine(id, { tasks });
          titleInput.value = "";
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        hooks.onRemoveTask = (id, taskId) => {
          const current = state.draftMachines.find((m) => m.id === id);
          const tasks = (current?.tasks || []).filter((t) => t.id !== taskId);
          updateMachine(id, { tasks });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "quehaceres";
          state.expandedById = Array.from(expandedById);
          renderCards();
        };

        list.appendChild(card);

        let desiredTab = selectedTabById[machine.id] || "quehaceres";
        let tabBtn = card.querySelector(`.mc-tab[data-tab="${desiredTab}"]`);
        if (!tabBtn) {
          desiredTab = "quehaceres";
          tabBtn = card.querySelector('.mc-tab[data-tab="quehaceres"]');
          if (state.selectedTabById) state.selectedTabById[machine.id] = "quehaceres";
        }
        if (desiredTab !== "quehaceres" && tabBtn) {
          tabBtn.click();
        }

        if (expandedById.has(machine.id)) {
          card.dataset.expanded = "true";
          recalcHeight(card);
        }
      });
  };

  const handleReorder = (orderIds) => {
    const updated = [];
    orderIds.forEach((id, idx) => {
      const current = state.draftMachines.find((m) => m.id === id);
      if (!current) return;
      updated.push({ ...current, order: idx });
      markDirty(id);
    });
    state.draftMachines = updated;
    renderCards();
  };

  const buildCommitPayload = () => {
    const creates = [];
    const updates = [];
    const deletes = Array.from(state.deletedIds);

    state.draftMachines.forEach((m) => {
      const base = {
        id: m.id,
        title: m.title,
        brand: m.brand,
        model: m.model,
        year: m.year ?? null,
        status: m.status,
        tagId: m.tagId ?? null,
        logs: m.logs || [],
        tasks: m.tasks || [],
        url: m.url || null,
        order: typeof m.order === "number" ? m.order : 0,
        // TODO: passwordHash pendiente en fase Functions.
        users: (m.users || []).map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt
        }))
      };

      if (m.isNew) {
        creates.push(base);
        return;
      }
      if (state.dirtyById.has(m.id)) {
        updates.push(base);
      }
    });

    return { creates, updates, deletes };
  };

  const saveChanges = async () => {
    if (!state.uid || state.saving) return;
    const payload = buildCommitPayload();
    if (
      !payload.creates.length &&
      !payload.updates.length &&
      !payload.deletes.length
    ) {
      updateSaveState("");
      return;
    }
    state.saving = true;
    updateSaveState("Guardando...");
    try {
      await commitChanges(state.uid, payload);
      const refreshed = state.draftMachines.map((m) => ({
        ...m,
        isNew: false
      }));
      setRemote(refreshed);
      updateSaveState("Guardado");
      setTimeout(() => updateSaveState(""), 1500);
    } catch {
      updateSaveState("Error al guardar");
    } finally {
      state.saving = false;
    }
  };

  addBtn.addEventListener("click", () => {
    const order = computeNextOrder();
    const machine = createDraftMachine(state.draftMachines.length + 1, order);
    state.draftMachines = [machine, ...state.draftMachines];
    updateSaveState("");
    renderCards();
  });

  saveBtn.addEventListener("click", () => {
    saveChanges();
  });

  const initDashboard = async (uid) => {
    state.uid = uid;
    const remote = await fetchMachines(uid);
    const normalized = remote
      .map((m, idx) => normalizeMachine(m, idx))
      .filter(Boolean);
    setRemote(normalized);
    renderCards();
    initDragAndDrop(list, handleReorder);
  };

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/es/auth/login.html";
      return;
    }
    initDashboard(user.uid);
  });
}
