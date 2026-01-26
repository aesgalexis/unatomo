import { fetchMachineAccess, updateMachineAccess } from "/static/js/dashboard/machineAccessRepo.js";
import { createMachineCard } from "/static/js/dashboard/machineCardTemplate.js";
import { hashPassword } from "/static/js/utils/crypto.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("machine-mount");
if (!mount) {
  throw new Error("Falta el contenedor #machine-mount");
}

const addBar = document.createElement("div");
addBar.className = "add-bar";

const saveBtn = document.createElement("button");
saveBtn.type = "button";
saveBtn.id = "saveChangesBtn";
saveBtn.className = "btn-save";
saveBtn.textContent = "Guardar cambios";
saveBtn.disabled = true;

const saveStatus = document.createElement("span");
saveStatus.className = "save-status";

addBar.appendChild(saveBtn);
addBar.appendChild(saveStatus);

const list = document.createElement("div");
list.id = "machineList";

mount.appendChild(addBar);
mount.appendChild(list);

const updateSaveState = (dirty, message = "") => {
  saveBtn.disabled = !dirty;
  saveStatus.textContent = message;
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
  draft: null,
  dirty: false
};

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
  const tagId = state.tagId;
  const session = state.session;
  list.innerHTML = "";
  const draft = machineDoc;
  updateSaveState(state.dirty, "");

  const role = session?.role || "usuario";
  const allowConfig = role === "administrador";

  const { card, hooks } = createMachineCard(draft, {
    disableDrag: true,
    hideConfig: !allowConfig,
    disableConfigActions: true,
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

  hooks.onToggleExpand = () => {
    const isExpanded = card.dataset.expanded === "true";
    if (isExpanded) {
      card.dataset.expanded = "false";
      card.style.maxHeight = `${COLLAPSED_HEIGHT}px`;
    } else {
      card.dataset.expanded = "true";
      recalcHeight();
    }
  };

  hooks.onSelectTab = () => {
    if (card.dataset.expanded === "true") recalcHeight();
  };

  hooks.onStatusToggle = () => {
    const statusOrder = ["operativa", "fuera_de_servicio", "desconectada"];
    const idx = statusOrder.indexOf(draft.status || "operativa");
    const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
    state.draft = {
      ...draft,
      status: nextStatus,
      logs: [...(draft.logs || []), { ts: new Date().toISOString(), type: "status", value: nextStatus }]
    };
    state.dirty = true;
    updateSaveState(state.dirty, "");
    renderMachine();
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
    state.draft = {
      ...draft,
      tasks: [
        {
          id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
          title,
          frequency: freqSelect.value,
          createdAt: new Date().toISOString()
        },
        ...(draft.tasks || [])
      ]
    };
    titleInput.value = "";
    state.dirty = true;
    updateSaveState(state.dirty, "");
    renderMachine();
  };

  hooks.onRemoveTask = (id, taskId) => {
    state.draft = {
      ...draft,
      tasks: (draft.tasks || []).filter((t) => t.id !== taskId)
    };
    state.dirty = true;
    updateSaveState(state.dirty, "");
    renderMachine();
  };

  list.appendChild(card);

  saveBtn.onclick = async () => {
    if (!state.dirty) return;
    updateSaveState(true, "Guardando...");
    try {
      await updateMachineAccess(
        tagId,
        {
          status: state.draft.status,
          logs: state.draft.logs || [],
          tasks: state.draft.tasks || []
        },
        `machineUser:${session?.username || "unknown"}`
      );
      state.dirty = false;
      updateSaveState(state.dirty, "Guardado");
      setTimeout(() => updateSaveState(state.dirty, ""), 1500);
    } catch {
      updateSaveState(true, "Error al guardar");
    }
  };
};

init();
