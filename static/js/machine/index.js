import { fetchMachineAccess, updateMachineAccess } from "/static/js/dashboard/machineAccessRepo.js";
import { createMachineCard } from "/static/js/dashboard/machineCardTemplate.js";
import { hashPassword } from "/static/js/utils/crypto.js";
import { initAutoSave } from "/static/js/dashboard/autoSave.js";
import {
  canSeeTab,
  canEditStatus,
  canEditTasks,
  canDownloadHistory,
  canSeeConfig
} from "./permissions.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("machine-mount");
if (!mount) {
  throw new Error("Falta el contenedor #machine-mount");
}

const addBar = document.createElement("div");
addBar.className = "add-bar";

const saveStatus = document.createElement("span");
saveStatus.className = "save-status";

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

const renderMessage = (text) => {
  list.innerHTML = "";
  const msg = document.createElement("div");
  msg.className = "machine-placeholder";
  msg.textContent = text;
  list.appendChild(msg);
};

const getTagId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("tag");
};

const sessionKey = (tagId) => `unatomo_machine_session_${tagId}`;

const showLogin = (machine, tagId, onSuccess) => {
  const overlay = document.createElement("div");
  overlay.className = "machine-login-overlay";

  const panel = document.createElement("div");
  panel.className = "machine-login-panel";

  const title = document.createElement("h3");
  title.textContent = "Acceso a la máquina";

  const userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = "Usuario";
  userInput.className = "machine-login-input";

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "Contraseña";
  passInput.className = "machine-login-input";

  const error = document.createElement("div");
  error.className = "machine-login-error";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-add";
  btn.textContent = "Entrar";

  btn.addEventListener("click", async () => {
    const username = userInput.value.trim();
    const password = passInput.value.trim();
    if (!username || !password) {
      error.textContent = "Completa usuario y contraseña.";
      return;
    }
    const user = (machine.users || []).find((u) => u.username === username);
    if (!user) {
      error.textContent = "Credenciales incorrectas.";
      return;
    }
    try {
      const expected = user.passwordHashBase64 || "";
      const salt = user.saltBase64 || "";
      if (!expected || !salt) {
        error.textContent = "Usuario sin credenciales activas.";
        return;
      }
      const hash = await hashPassword(password, salt);
      if (hash !== expected) {
        error.textContent = "Credenciales incorrectas.";
        return;
      }
      sessionStorage.setItem(
        sessionKey(tagId),
        JSON.stringify({ username, role: user.role || "usuario" })
      );
      overlay.remove();
      onSuccess({ username, role: user.role || "usuario" });
    } catch {
      error.textContent = "Error al validar credenciales.";
    }
  });

  panel.appendChild(title);
  panel.appendChild(userInput);
  panel.appendChild(passInput);
  panel.appendChild(error);
  panel.appendChild(btn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
};

const state = {
  tagId: null,
  session: null,
  draft: null
};

const autoSave = initAutoSave({
  notify: updateSaveState,
  saveFn: async () => {
    await updateMachineAccess(
      state.tagId,
      {
        status: state.draft.status,
        logs: state.draft.logs || [],
        tasks: state.draft.tasks || []
      },
      `machineUser:${state.session?.username || "unknown"}`
    );
  }
});

const init = async () => {
  const tagId = getTagId();
  if (!tagId) {
    renderMessage("Falta tag.");
    return;
  }
  state.tagId = tagId;

  const machineDoc = await fetchMachineAccess(tagId);
  if (!machineDoc) {
    renderMessage("Tag no encontrado.");
    return;
  }

  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(sessionKey(tagId)) || "null");
  } catch {
    session = null;
  }

  const existingUser =
    session && (machineDoc.users || []).find((u) => u.username === session.username);
  if (!existingUser) {
    showLogin(machineDoc, tagId, (userSession) => {
      state.session = userSession;
      state.draft = {
        ...machineDoc,
        logs: machineDoc.logs || [],
        tasks: machineDoc.tasks || []
      };
      renderMachine();
    });
    return;
  }

  state.session = session;
  state.draft = {
    ...machineDoc,
    logs: machineDoc.logs || [],
    tasks: machineDoc.tasks || []
  };
  renderMachine();
};

const renderMachine = () => {
  const machineDoc = state.draft;
  const session = state.session;
  list.innerHTML = "";

  const role = session?.role || "usuario";
  const visibleTabs = ["quehaceres", "general", "historial"].filter((tab) =>
    canSeeTab(role, tab)
  );

  const { card, hooks } = createMachineCard(machineDoc, {
    mode: "single",
    disableDrag: true,
    hideConfig: !canSeeConfig(role),
    canEditStatus: canEditStatus(role),
    canEditTasks: canEditTasks(role),
    canDownloadHistory: canDownloadHistory(role),
    canEditGeneral: false,
    canEditConfig: false,
    visibleTabs,
    disableTitleEdit: true
  });

  card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
  card.dataset.expanded = "true";
  const recalcHeight = () => {
    const header = card.querySelector(".mc-header");
    const expand = card.querySelector(".mc-expand");
    const headerH = header.offsetHeight;
    const contentH = expand.scrollHeight;
    const minH = COLLAPSED_HEIGHT * EXPAND_FACTOR;
    const target = Math.max(minH, headerH + contentH);
    card.style.maxHeight = `${target}px`;
  };
  recalcHeight();

  hooks.onSelectTab = () => {
    recalcHeight();
  };

  hooks.onStatusToggle = () => {
    if (!canEditStatus(role)) return;
    const statusOrder = ["operativa", "fuera_de_servicio", "desconectada"];
    const idx = statusOrder.indexOf(machineDoc.status || "operativa");
    const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
    state.draft = {
      ...machineDoc,
      status: nextStatus,
      logs: [...(machineDoc.logs || []), { ts: new Date().toISOString(), type: "status", value: nextStatus }]
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "status");
  };

  hooks.onAddTask = (id, titleInput, freqSelect, btn) => {
    if (!canEditTasks(role)) return;
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
    state.draft = {
      ...machineDoc,
      tasks: [
        {
          id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
          title,
          frequency: freqSelect.value,
          createdAt: new Date().toISOString()
        },
        ...(machineDoc.tasks || [])
      ]
    };
    titleInput.value = "";
    renderMachine();
    autoSave.saveNow(state.tagId, "add-task");
  };

  hooks.onRemoveTask = (id, taskId) => {
    if (!canEditTasks(role)) return;
    state.draft = {
      ...machineDoc,
      tasks: (machineDoc.tasks || []).filter((t) => t.id !== taskId)
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "remove-task");
  };

  list.appendChild(card);
};

init();
