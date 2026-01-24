import { loadMachines, addMachine, saveMachines } from "./machineStore.js";
import { createMachineCard } from "./machineCardTemplate.js";
import { initDragAndDrop } from "./dragAndDrop.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("dashboard-mount");

if (mount) {
  const state = {
    machines: loadMachines()
  };

  const addBar = document.createElement("div");
  addBar.className = "add-bar";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "addMachineBtn";
  addBtn.className = "btn-add";
  addBtn.textContent = "Añadir";

  addBar.appendChild(addBtn);

  const list = document.createElement("div");
  list.id = "machineList";

  mount.appendChild(addBar);
  mount.appendChild(list);

  const renderPlaceholder = () => {
    list.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "machine-placeholder";
    placeholder.textContent = "Todavía no hay máquinas. Pulsa ‘Añadir’ para crear la primera.";
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

  const updateMachine = (id, patch) => {
    const next = state.machines.map((m) => (m.id === id ? { ...m, ...patch } : m));
    state.machines = next;
    saveMachines(next);
  };

  const appendLog = (id, entry) => {
    const next = state.machines.map((m) => {
      if (m.id !== id) return m;
      const logs = Array.isArray(m.logs) ? [...m.logs, entry] : [entry];
      return { ...m, logs };
    });
    state.machines = next;
    saveMachines(next);
  };

  const addUser = (id, username, password) => {
    const trimmed = username.trim();
    if (!trimmed || !password.trim()) return { ok: false, reason: "empty" };
    const next = state.machines.map((m) => {
      if (m.id !== id) return m;
      const users = Array.isArray(m.users) ? [...m.users] : [];
      if (users.some((u) => u.username === trimmed)) {
        return m;
      }
      users.push({
        id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
        username: trimmed,
        password,
        role: "usuario",
        createdAt: new Date().toISOString()
      });
      return { ...m, users };
    });
    state.machines = next;
    saveMachines(next);
    return { ok: true };
  };

  const updateUserRole = (id, userId, role) => {
    const next = state.machines.map((m) => {
      if (m.id !== id) return m;
      const users = (m.users || []).map((u) => (u.id === userId ? { ...u, role } : u));
      return { ...m, users };
    });
    state.machines = next;
    saveMachines(next);
  };

  const removeUser = (id, userId) => {
    const next = state.machines.map((m) => {
      if (m.id !== id) return m;
      const users = (m.users || []).filter((u) => u.id !== userId);
      return { ...m, users };
    });
    state.machines = next;
    saveMachines(next);
  };

  const generateUrl = (id) => {
    const url = `${window.location.origin}/es/index.html#/m/${id}`;
    updateMachine(id, { url });
  };

  const copyUrl = async (id, btn, input) => {
    const current = state.machines.find((m) => m.id === id);
    if (!current?.url) {
      btn.textContent = "Primero genera la URL";
      setTimeout(() => (btn.textContent = "⧉"), 1000);
      return;
    }
    try {
      await navigator.clipboard.writeText(current.url);
    } catch {
      input.select();
      document.execCommand("copy");
    }
    btn.textContent = "Copiado";
    setTimeout(() => (btn.textContent = "⧉"), 1000);
  };

  const renderCards = () => {
    list.innerHTML = "";
    if (!state.machines.length) {
      renderPlaceholder();
      return;
    }

    state.machines.forEach((machine) => {
      const { card, hooks } = createMachineCard(machine);
      card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;

      hooks.onToggleExpand = (node) => {
        if (node.classList.contains("is-dragging")) return;
        const isExpanded = node.dataset.expanded === "true";
        if (isExpanded) {
          collapseCard(node);
        } else {
          expandCard(node);
        }
      };

      hooks.onSelectTab = (node) => {
        if (node.dataset.expanded === "true") {
          recalcHeight(node);
        }
      };

      hooks.onStatusToggle = (node) => {
        const statusOrder = ["operativa", "fuera_de_servicio", "desconectada"];
        const current = state.machines.find((m) => m.id === machine.id);
        const currentStatus = current?.status || "operativa";
        const idx = statusOrder.indexOf(currentStatus);
        const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
        const keepExpanded = node.dataset.expanded === "true";
        updateMachine(machine.id, { status: nextStatus });
        appendLog(machine.id, {
          ts: new Date().toISOString(),
          type: "status",
          value: nextStatus
        });
        renderCards();
        if (keepExpanded) {
          const target = list.querySelector(
            `.machine-card[data-machine-id="${machine.id}"]`
          );
          if (target) {
            target.dataset.expanded = "true";
            recalcHeight(target);
          }
        }
      };

      hooks.onTitleUpdate = (node, nextTitle) => {
        updateMachine(machine.id, { title: nextTitle });
      };

      hooks.onGenerateUrl = (id) => {
        generateUrl(id);
        renderCards();
      };

      hooks.onCopyUrl = (id, btn, input) => {
        copyUrl(id, btn, input);
      };

      hooks.onAddUser = (id, userInput, passInput) => {
        const result = addUser(id, userInput.value, passInput.value);
        if (!result.ok) {
          userInput.value = userInput.value.trim();
          userInput.setAttribute("aria-invalid", "true");
          return;
        }
        userInput.value = "";
        passInput.value = "";
        renderCards();
      };

      hooks.onUpdateUserRole = (id, userId, role) => {
        updateUserRole(id, userId, role);
        renderCards();
      };

      hooks.onRemoveUser = (id, userId) => {
        removeUser(id, userId);
        renderCards();
      };

      list.appendChild(card);
    });
  };

  const setMachinesAndPersist = (next) => {
    state.machines = next;
    saveMachines(next);
  };

  addBtn.addEventListener("click", () => {
    const result = addMachine(state.machines);
    state.machines = result.list;
    renderCards();
  });

  renderCards();

  initDragAndDrop(
    list,
    () => state.machines,
    (next) => setMachinesAndPersist(next),
    renderCards
  );
}
