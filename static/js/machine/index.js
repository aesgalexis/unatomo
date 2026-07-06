import { fetchMachineAccess, updateMachineAccess } from "/static/js/dashboard/machineAccessRepo.js";
import { createMachineCard } from "/static/js/dashboard/machineCardTemplate.js";
import { installDocumentHooks } from "/static/js/dashboard/cardHooks/documentHooks.js";
import { upsertMachine } from "/static/js/dashboard/firestoreRepo.js";
import { generateMachineTagQr } from "/static/js/dashboard/tags/tagAssetsRepo.js";
import { auth, db, functions } from "/static/js/firebase/firebaseApp.js";
import { initAutoSave } from "/static/js/dashboard/autoSave.js";
import { calculateStorageUsage, STORAGE_LIMIT_BYTES } from "/static/js/configuracion/storageUsage.js";
import { normalizeTasks } from "/static/js/dashboard/tabs/tasks/tasksModel.js";
import {
  buildAddTaskNoteUpdate,
  buildAddTaskUpdate,
  buildCompleteTaskUpdate,
  buildEditTaskUpdate,
  buildRemoveTaskUpdate,
  buildStatusToggleUpdate
} from "/static/js/dashboard/tabs/tasks/taskActions.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { t } from "/static/js/dashboard/i18n.js";
import {
  canSeeTab,
  canEditStatus,
  canEditTasks,
  canDownloadHistory,
  canSeeConfig
} from "./permissions.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const COLLAPSED_HEIGHT = 96;
const EXPAND_FACTOR = 2.5;

const mount = document.getElementById("machine-mount");
if (!mount) {
  throw new Error(t("machine.missingContainer", "Falta el contenedor #machine-mount"));
}

const addBar = document.createElement("div");
addBar.className = "add-bar";

const list = document.createElement("div");
list.id = "machineList";

mount.appendChild(addBar);
mount.appendChild(list);

const updateSaveState = (message = "") => {
  setTopbarSaveStatus(message);
};
const notifyTopbar = (message = "") => {
  setTopbarSaveStatus(message);
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
const persistentSessionKey = (tagId) => `unatomo_machine_remembered_session_${tagId}`;
const verifyMachineAccessUserCallable = httpsCallable(functions, "verifyMachineAccessUser");
const updateMachineAccessOperationalCallable = httpsCallable(functions, "updateMachineAccessOperational");

const createLocalMachineSession = (username, role, options = {}) => ({
  username,
  role: role || t("machine.userRoleFallback", "usuario"),
  source: "machine",
  remembered: !!options.remembered,
  sessionId: options.sessionId || "",
  sessionToken: options.sessionToken || "",
  createdAt: new Date().toISOString(),
  expiresAt: options.expiresAt || "",
});

const saveMachineSession = (tagId, session, { remember = false } = {}) => {
  try {
    if (session) sessionStorage.setItem(sessionKey(tagId), JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey(tagId));
  } catch {
    // ignore storage failures
  }
  try {
    if (remember && session?.source === "dashboard") {
      localStorage.setItem(persistentSessionKey(tagId), JSON.stringify(session));
    } else {
      localStorage.removeItem(persistentSessionKey(tagId));
    }
  } catch {
    // ignore storage failures
  }
};

const readStoredMachineSession = (tagId) => {
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(sessionKey(tagId)) || "null");
  } catch {
    session = null;
  }
  if (session?.username) {
    const expiresAt = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
    if (session.source !== "machine" || (expiresAt && expiresAt > Date.now())) return session;
    saveMachineSession(tagId, null, { remember: false });
  }

  try {
    session = JSON.parse(localStorage.getItem(persistentSessionKey(tagId)) || "null");
  } catch {
    session = null;
  }
  if (!session?.username) return null;
  const expiresAt = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
  if (!expiresAt || expiresAt <= Date.now()) {
    try {
      localStorage.removeItem(persistentSessionKey(tagId));
    } catch {
      // ignore storage failures
    }
    return null;
  }
  try {
    sessionStorage.setItem(sessionKey(tagId), JSON.stringify(session));
  } catch {
    // ignore storage failures
  }
  return session;
};

const showLogin = (machine, tagId, onSuccess) => {
  const overlay = document.createElement("div");
  overlay.className = "machine-login-overlay";

  const panel = document.createElement("div");
  panel.className = "machine-login-panel";

  const title = document.createElement("h3");
  const name = machine.title || t("machine.machine", "Equipo");
  title.textContent = t("machine.accessTo", (value) => `Acceso a ${value}`)(name);

  const userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = t("machine.username", "Usuario");
  userInput.className = "machine-login-input";

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = t("machine.password", "Contrase\u00f1a");
  passInput.className = "machine-login-input";

  const error = document.createElement("div");
  error.className = "machine-login-error";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-add";
  btn.textContent = t("machine.enter", "Entrar");

  btn.addEventListener("click", async () => {
    const username = userInput.value.trim();
    const password = passInput.value.trim();
    if (!username || !password) {
      error.textContent = t("machine.completeCredentials", "Completa usuario y contrase\u00f1a.");
      return;
    }
    try {
      const response = await verifyMachineAccessUserCallable({
        tagId,
        username,
        password,
      });
      const verifiedUser = response?.data?.user || {};
      const verifiedSession = response?.data?.session || {};
      const userSession = createLocalMachineSession(verifiedUser.username || username, verifiedUser.role, {
        remembered: false,
        sessionId: verifiedSession.id,
        sessionToken: verifiedSession.token,
        expiresAt: verifiedSession.expiresAt,
      });
      saveMachineSession(tagId, userSession, { remember: false });
      overlay.remove();
      onSuccess(userSession);
    } catch {
      error.textContent = t("machine.validationError", "Error al validar credenciales.");
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

const waitForAuthState = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });

const buildDashboardSession = (user, machineDoc) => ({
  username: user.displayName || user.email || t("dashboard.admin", "Administrador"),
  role: "admin",
  source: "dashboard",
  uid: user.uid,
  machineId: machineDoc.machineId || "",
});

const hasDashboardMachineAccess = async (user, machineDoc) => {
  if (!user || !machineDoc?.machineId || !machineDoc?.tenantId) return false;
  if (machineDoc.tenantId === user.uid) return true;
  try {
    const linkId = `${machineDoc.machineId}_${user.uid}`;
    const snap = await getDoc(doc(db, "admin_machine_links", linkId));
    if (!snap.exists()) return false;
    const data = snap.data() || {};
    return data.adminUid === user.uid &&
      data.ownerUid === machineDoc.tenantId &&
      data.machineId === machineDoc.machineId &&
      data.status === "accepted";
  } catch {
    return false;
  }
};

const normalizeStatus = (value) =>
  value === "desconectada" ? "fuera_de_servicio" : value || "operativa";

const normalizeMachineAccessDraft = (machineDoc) => ({
  ...machineDoc,
  id: machineDoc.machineId || machineDoc.id,
  accessTagId: machineDoc.id,
  tagId: machineDoc.tagId || machineDoc.id,
  tenantId: machineDoc.tenantId || machineDoc.ownerUid || "",
  ownerUid: machineDoc.ownerUid || machineDoc.tenantId || "",
  status: normalizeStatus(machineDoc.status),
  logs: machineDoc.logs || [],
  tasks: normalizeTasks(machineDoc.tasks || []),
  documents:
    machineDoc.documents && typeof machineDoc.documents === "object"
      ? machineDoc.documents
      : {}
});

const buildMachineAccessPatch = (machine) => ({
  tenantId: machine.tenantId || machine.ownerUid || "",
  ownerUid: machine.ownerUid || machine.tenantId || "",
  machineId: machine.id,
  title: machine.title,
  brand: machine.brand || "",
  model: machine.model || "",
  serial: machine.serial || "",
  year: machine.year ?? null,
  location: machine.location || "",
  status: machine.status || "operativa",
  tagId: machine.tagId || state.tagId,
  tagUrl: machine.tagUrl || "",
  tagQrUrl: machine.tagQrUrl || "",
  tagQrPath: machine.tagQrPath || "",
  tagQrSize: Number(machine.tagQrSize || 0),
  documents:
    machine.documents && typeof machine.documents === "object"
      ? machine.documents
      : {},
  logs: machine.logs || [],
  tasks: machine.tasks || [],
  adminEmail: machine.adminEmail || "",
  adminName: machine.adminName || "",
  adminStatus: machine.adminStatus || "",
  ownershipTransferEmail: machine.ownershipTransferEmail || "",
  ownershipTransferStatus: machine.ownershipTransferStatus || "",
  activeStatusCycleId: machine.activeStatusCycleId || "",
  notifications: machine.notifications || null
});

const buildOperationalAccessPatch = (machine) => ({
  status: machine.status || "operativa",
  logs: machine.logs || [],
  tasks: machine.tasks || [],
});

const state = {
  tagId: null,
  uid: null,
  session: null,
  draft: null
};

const getActorLabel = () =>
  state.session?.username || t("dashboard.admin", "Administrador");

const getDraftById = (id) => (state.draft?.id === id ? state.draft : null);

const updateDraft = (id, patch) => {
  if (!state.draft || state.draft.id !== id) return;
  state.draft = { ...state.draft, ...patch };
};

const persistDraft = async () => {
  if (!state.draft || !state.tagId) return;
  const updatedBy = state.session?.uid || state.session?.username || "machine";
  const isDashboardSession = state.session?.source === "dashboard";
  if (!isDashboardSession) {
    await updateMachineAccessOperationalCallable({
      tagId: state.tagId,
      sessionId: state.session?.sessionId || "",
      sessionToken: state.session?.sessionToken || "",
      patch: buildOperationalAccessPatch(state.draft),
    });
  } else {
    await updateMachineAccess(
      state.tagId,
      buildMachineAccessPatch(state.draft),
      updatedBy
    );
  }
  if (isDashboardSession && state.draft.tenantId) {
    await upsertMachine(state.draft.tenantId, state.draft);
  }
};

const autoSave = initAutoSave({
  notify: updateSaveState,
  saveFn: async () => {
    await persistDraft();
  }
});

const init = async () => {
  const tagId = getTagId();
  if (!tagId) {
    renderMessage(t("machine.missingTag", "Falta tag."));
    return;
  }
  state.tagId = tagId;

  const machineDoc = await fetchMachineAccess(tagId);
  if (!machineDoc) {
    renderMessage(t("machine.tagNotFound", "Tag no encontrado."));
    return;
  }

  const authUser = await waitForAuthState();
  if (await hasDashboardMachineAccess(authUser, machineDoc)) {
    const dashboardSession = buildDashboardSession(authUser, machineDoc);
    sessionStorage.setItem(sessionKey(tagId), JSON.stringify(dashboardSession));
    state.uid = authUser.uid;
    state.session = dashboardSession;
    state.draft = normalizeMachineAccessDraft(machineDoc);
    renderMachine();
    return;
  }

  const session = readStoredMachineSession(tagId);

  if (!session) {
    saveMachineSession(tagId, null, { remember: false });
    showLogin(machineDoc, tagId, (userSession) => {
      state.session = userSession;
      state.draft = normalizeMachineAccessDraft(machineDoc);
      renderMachine();
    });
    return;
  }

  state.session = session;
  state.draft = normalizeMachineAccessDraft(machineDoc);
  renderMachine();
};

const renderMachine = () => {
  const machineDoc = state.draft;
  const session = state.session;
  list.innerHTML = "";

  const role = session.role || t("machine.userRoleFallback", "usuario");
  const isDashboardAdmin = role === "admin" && session.source === "dashboard";
  const visibleTabs = ["quehaceres", "general", "historial", "configuracion"].filter((tab) =>
    canSeeTab(role, tab)
  );

  const { card, hooks } = createMachineCard(machineDoc, {
    mode: "single",
    disableDrag: true,
    hideConfig: !canSeeConfig(role),
    canEditStatus: canEditStatus(role),
    canEditTasks: canEditTasks(role),
    canCompleteTasks: true,
    canDownloadHistory: canDownloadHistory(role),
    canEditGeneral: isDashboardAdmin,
    canEditLocation: isDashboardAdmin,
    canEditConfig: isDashboardAdmin,
    visibleTabs,
    disableTitleEdit: !isDashboardAdmin,
    createdBy: state.session.username || null
  });

  card.classList.add("machine-card--single");

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
  list.appendChild(card);
  requestAnimationFrame(() => {
    recalcHeight();
    requestAnimationFrame(() => recalcHeight());
  });

  hooks.onSelectTab = () => {
    recalcHeight();
  };

  hooks.onContentResize = () => {
    recalcHeight();
  };

  hooks.onStatusToggle = () => {
    if (!canEditStatus(role)) return;
    const statusOrder = ["operativa", "fuera_de_servicio"];
    const currentStatus = normalizeStatus(machineDoc.status);
    const idx = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
    const user = getActorLabel();
    state.draft = {
      ...machineDoc,
      ...buildStatusToggleUpdate(machineDoc.id, machineDoc, nextStatus, user, {
        normalizeStatus,
        restoreTitle: t("tasks.restoreOperation", "Volver a poner la máquina en operatividad")
      })
    };
    renderMachine();
    notifyTopbar(t("machine.statusUpdated", "Estado actualizado"));
    autoSave.saveNow(state.tagId, "status");
  };

  hooks.onAddTask = (id, task) => {
    if (!canEditTasks(role)) return;
    state.draft = { ...machineDoc, ...buildAddTaskUpdate(machineDoc, task, getActorLabel()) };
    renderMachine();
    notifyTopbar(t("machine.taskCreated", "Tarea creada"));
    autoSave.saveNow(state.tagId, "add-task");
  };

  hooks.onRemoveTask = (id, taskId) => {
    if (!canEditTasks(role)) return;
    state.draft = {
      ...machineDoc,
      ...buildRemoveTaskUpdate(machineDoc, taskId, getActorLabel())
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "remove-task");
  };

  hooks.onAddTaskNote = (id, taskId, text) => {
    if (!canEditTasks(role)) return;
    const updates = buildAddTaskNoteUpdate(machineDoc, taskId, text, getActorLabel());
    if (!updates) return;
    state.draft = { ...machineDoc, ...updates };
    renderMachine();
    autoSave.saveNow(state.tagId, "task-note");
  };

  hooks.onEditTask = (id, taskId, patch) => {
    if (!canEditTasks(role)) return;
    state.draft = {
      ...machineDoc,
      ...buildEditTaskUpdate(machineDoc, taskId, patch, getActorLabel())
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "task-edit");
  };

  hooks.onCompleteTask = (id, taskId) => {
    const updates = buildCompleteTaskUpdate(
      machineDoc.id,
      machineDoc,
      taskId,
      getActorLabel(),
      { normalizeStatus }
    );
    if (!updates) return;
    state.draft = { ...machineDoc, ...updates };
    renderMachine();
    notifyTopbar(t("machine.taskCompleted", "Tarea completada"));
    autoSave.saveNow(state.tagId, "task-complete");
  };

  hooks.onAddIntervention = (machineData, message) => {
    const user = getActorLabel();
    state.draft = {
      ...machineDoc,
      logs: [
        ...(machineDoc.logs || []),
        { ts: new Date().toISOString(), type: "intervencion", message, user }
      ]
    };
    renderMachine();
    notifyTopbar(t("machine.interventionDone", "Intervención realizada"));
    autoSave.saveNow(state.tagId, "intervencion");
  };

  hooks.onTitleUpdate = (_node, nextTitle) => {
    if (!isDashboardAdmin) return false;
    const title = (nextTitle || "").trim();
    if (!title) return false;
    updateDraft(machineDoc.id, { title });
    autoSave.scheduleSave(state.tagId, "title");
    return true;
  };

  hooks.onUpdateGeneral = (id, field, value, input, errorEl) => {
    if (!isDashboardAdmin) return;
    if (field === "year") {
      const currentYear = new Date().getFullYear();
      const parsed = value ? Number(value) : null;
      if (
        parsed !== null &&
        (Number.isNaN(parsed) || parsed > currentYear || parsed < currentYear - 50)
      ) {
        if (errorEl) {
          errorEl.textContent = t(
            "dashboard.invalidYear",
            (min, max) => `Año inválido (entre ${min} y ${max}).`
          )(currentYear - 50, currentYear);
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
      updateDraft(id, { year: parsed });
    } else {
      updateDraft(id, { [field]: value });
    }
    autoSave.scheduleSave(state.tagId, `general:${field}`);
  };

  hooks.onUpdateLocation = (id, nextValue) => {
    if (!isDashboardAdmin) return;
    const normalized = (nextValue || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
    if (normalized === (machineDoc.location || "")) return;
    state.draft = {
      ...machineDoc,
      location: normalized,
      logs: [
        ...(machineDoc.logs || []),
        { ts: new Date().toISOString(), type: "location", value: normalized || "" }
      ]
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "location");
  };

  hooks.onCopyTagUrl = (_id, btn, input) => {
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

  hooks.onGenerateTagQr = async (_id, statusEl) => {
    if (!isDashboardAdmin || !machineDoc.tagId) return null;
    if (statusEl) {
      statusEl.textContent = t("config.generatingQr", "Generando QR...");
      statusEl.dataset.state = "neutral";
    }
    const result = await generateMachineTagQr(machineDoc.id, document.documentElement.lang || "es");
    state.draft = {
      ...machineDoc,
      tagUrl: result.tagUrl || machineDoc.tagUrl || "",
      tagQrUrl: result.qrUrl || machineDoc.tagQrUrl || "",
      tagQrPath: result.qrPath || machineDoc.tagQrPath || "",
      tagQrSize: Number(result.qrSize || machineDoc.tagQrSize || 0)
    };
    await persistDraft();
    renderMachine();
    return result;
  };

  if (isDashboardAdmin) {
    const assertStorageAvailable = async (
      uid = state.uid || machineDoc.tenantId,
      additionalBytes = 0
    ) => {
      if (!uid) throw new Error("no-auth");
      const usage = await calculateStorageUsage(uid);
      const full =
        usage.totalBytes + Math.max(0, Number(additionalBytes) || 0) >=
        STORAGE_LIMIT_BYTES;
      if (full) {
        notifyTopbar(t("dashboard.storageFullAction", "Almacenamiento lleno"));
        throw new Error("storage-full");
      }
      return usage;
    };
    installDocumentHooks(hooks, {
      assertStorageAvailable,
      expandedById: new Set([machineDoc.id]),
      getDraftById,
      notifyTopbar,
      refreshStorageFullState: async () => false,
      renderCards: () => renderMachine(),
      state,
      t,
      updateMachine: updateDraft,
      upsertMachine: async (tenantId, machine) => {
        await upsertMachine(tenantId, machine);
        await updateMachineAccess(
          state.tagId,
          buildMachineAccessPatch(machine),
          state.session?.uid || "dashboard"
        );
      }
    });
  }
};

init();
