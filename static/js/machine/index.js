import { fetchMachineAccess, updateMachineAccess } from "/static/js/dashboard/machineAccessRepo.js";
import { createMachineCard } from "/static/js/dashboard/machineCardTemplate.js";
import { installDocumentHooks } from "/static/js/dashboard/cardHooks/documentHooks.js";
import { upsertMachine } from "/static/js/dashboard/firestoreRepo.js";
import { generateMachineTagQr } from "/static/js/dashboard/tags/tagAssetsRepo.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
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
import { uploadMachineAccessDocument } from "./machineDocumentUploads.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { t } from "/static/js/dashboard/i18n.js";
import {
  canSeeTab,
  canEditStatus,
  canDownloadHistory,
  canSeeConfig,
  canUseCapability
} from "./permissions.js";
import {
  normalizeAccessRole
} from "./accessRoles.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

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
  permissions: options.permissions || null,
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

const showLogin = (machine, tagId, { onSuccess, onContinueAsGuest }) => {
  const overlay = document.createElement("div");
  overlay.className = "machine-login-overlay";

  const panel = document.createElement("div");
  panel.className = "machine-login-panel";

  const title = document.createElement("h3");
  const name = machine.title || t("machine.machine", "Equipo");
  title.textContent = t("machine.accessTo", (value) => `Acceso a ${value}`)(name);
  const publicDetails = document.createElement("p");
  publicDetails.className = "machine-login-public-details";
  publicDetails.textContent = [machine.brand, machine.model].filter(Boolean).join(" · ");
  const plateUrl = machine.documents?.plate?.url || "";
  const plate = document.createElement("img");
  plate.className = "machine-login-public-plate";
  plate.alt = t("general.plate", "Placa");
  plate.src = plateUrl;
  plate.hidden = !plateUrl;

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

  const guestBtn = document.createElement("button");
  guestBtn.type = "button";
  guestBtn.className = "machine-login-guest";
  guestBtn.textContent = t("machine.continueAsGuest", "Continuar sin iniciar sesi\u00f3n");

  const register = document.createElement("p");
  register.className = "machine-login-register";
  register.append(t("machine.noAccount", "\u00bfNo tienes una cuenta?"), " ");
  const registerLink = document.createElement("a");
  registerLink.href = "/nfc/?setup=1#registration-access-title";
  registerLink.textContent = t("machine.register", "Reg\u00edstrate");
  register.appendChild(registerLink);

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
      const verifiedMachine = response?.data?.machine || null;
      const permissions = response?.data?.permissions || null;
      const userSession = createLocalMachineSession(verifiedUser.username || username, verifiedUser.role, {
        remembered: false,
        permissions,
        sessionId: verifiedSession.id,
        sessionToken: verifiedSession.token,
        expiresAt: verifiedSession.expiresAt,
      });
      saveMachineSession(tagId, userSession, { remember: false });
      overlay.remove();
      onSuccess(userSession, verifiedMachine, permissions);
    } catch {
      error.textContent = t("machine.validationError", "Error al validar credenciales.");
    }
  });

  guestBtn.addEventListener("click", () => {
    overlay.remove();
    onContinueAsGuest(machine);
  });

  panel.appendChild(title);
  if (publicDetails.textContent) panel.appendChild(publicDetails);
  if (plateUrl) panel.appendChild(plate);
  panel.appendChild(userInput);
  panel.appendChild(passInput);
  panel.appendChild(error);
  panel.appendChild(btn);
  panel.appendChild(guestBtn);
  panel.appendChild(register);
  overlay.appendChild(panel);
  mount.appendChild(overlay);
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

const normalizeStatus = (value) =>
  ["operativa", "fuera_de_servicio", "desconectada"].includes(value)
    ? value
    : "operativa";

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

  const authUser = await waitForAuthState();
  const initialAccess = await fetchMachineAccess(tagId);
  const machineDoc = initialAccess.machine;
  if (!machineDoc) {
    renderMessage(t("machine.tagNotFound", "Tag no encontrado."));
    return;
  }

  if (authUser && !machineDoc.publicAccess) {
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
    showLogin(machineDoc, tagId, {
      onSuccess: (userSession, verifiedMachine, permissions) => {
        state.session = userSession;
        state.session.permissions = permissions;
        state.draft = normalizeMachineAccessDraft(verifiedMachine || machineDoc);
        renderMachine();
      },
      onContinueAsGuest: (publicMachine) => {
        state.session = {
          username: "",
          role: "public",
          permissions: publicMachine.permissions || null,
          source: "public"
        };
        state.draft = normalizeMachineAccessDraft(publicMachine);
        renderMachine();
      }
    });
    return;
  }

  const sessionAccess = await fetchMachineAccess(tagId, session);
  if (!sessionAccess.machine || sessionAccess.machine.publicAccess) {
    saveMachineSession(tagId, null, { remember: false });
    showLogin(machineDoc, tagId, {
      onSuccess: (userSession, verifiedMachine, permissions) => {
        state.session = userSession;
        state.session.permissions = permissions;
        state.draft = normalizeMachineAccessDraft(verifiedMachine || machineDoc);
        renderMachine();
      },
      onContinueAsGuest: (publicMachine) => {
        state.session = {
          username: "",
          role: "public",
          permissions: publicMachine.permissions || null,
          source: "public"
        };
        state.draft = normalizeMachineAccessDraft(publicMachine);
        renderMachine();
      }
    });
    return;
  }
  state.session = {
    ...session,
    role: sessionAccess.role || session.role,
    permissions: sessionAccess.permissions || session.permissions
  };
  state.draft = normalizeMachineAccessDraft(sessionAccess.machine);
  renderMachine();
};

const renderMachine = () => {
  const machineDoc = state.draft;
  const session = state.session;
  list.innerHTML = "";

  const role = session.role === "admin"
    ? "admin"
    : session.role === "public"
      ? "public"
      : normalizeAccessRole(session.role);
  const configuredPermissions = session.permissions
    ? {
        ...(machineDoc.accessRolePermissions || {}),
        [role]: session.permissions
      }
    : machineDoc.accessRolePermissions || {};
  const isDashboardAdmin = role === "admin" && session.source === "dashboard";
  const canUploadDocuments = canUseCapability(
    role,
    "uploadDocuments",
    configuredPermissions
  );
  const canDeleteDocuments = isDashboardAdmin;
  const canUploadTaskImages = canUseCapability(
    role,
    "uploadImages",
    configuredPermissions
  );
  const visibleTabs = ["quehaceres", "general", "historial", "configuracion"].filter((tab) =>
    canSeeTab(role, tab, configuredPermissions)
  );

  const { card, hooks } = createMachineCard(machineDoc, {
    mode: "single",
    disableDrag: true,
    hideConfig: !canSeeConfig(role),
    canEditStatus: canEditStatus(role, configuredPermissions),
    canCreateTasks: canUseCapability(role, "createTasks", configuredPermissions),
    canEditTasks: canUseCapability(role, "editTasks", configuredPermissions),
    canDeleteTasks: canUseCapability(role, "deleteTasks", configuredPermissions),
    canCompleteTasks: canUseCapability(role, "completeTasks", configuredPermissions),
    canAddTaskNotes: canUseCapability(role, "addTaskNotes", configuredPermissions),
    canUploadTaskImages,
    canDownloadHistory: canDownloadHistory(role, configuredPermissions),
    canEditGeneral: isDashboardAdmin,
    canViewPlate: canUseCapability(role, "viewPlate", configuredPermissions),
    canViewDocuments: canUseCapability(role, "viewDocuments", configuredPermissions),
    canUploadDocuments,
    canDeleteDocuments,
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
    if (!canUseCapability(role, "changeStatus", configuredPermissions)) return;
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
    if (!canUseCapability(role, "createTasks", configuredPermissions)) return;
    state.draft = { ...machineDoc, ...buildAddTaskUpdate(machineDoc, task, getActorLabel()) };
    renderMachine();
    notifyTopbar(t("machine.taskCreated", "Tarea creada"));
    autoSave.saveNow(state.tagId, "add-task");
  };

  hooks.onRemoveTask = (id, taskId) => {
    if (!canUseCapability(role, "deleteTasks", configuredPermissions)) return;
    state.draft = {
      ...machineDoc,
      ...buildRemoveTaskUpdate(machineDoc, taskId, getActorLabel())
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "remove-task");
  };

  hooks.onAddTaskNote = (id, taskId, text) => {
    if (!canUseCapability(role, "addTaskNotes", configuredPermissions)) return;
    const updates = buildAddTaskNoteUpdate(machineDoc, taskId, text, getActorLabel());
    if (!updates) return;
    state.draft = { ...machineDoc, ...updates };
    renderMachine();
    autoSave.saveNow(state.tagId, "task-note");
  };

  hooks.onAddTaskImages = async (id, taskId, files = []) => {
    if (!canUploadTaskImages || !hooks.onUploadMachineDocument) return;
    const task = machineDoc.tasks?.find((item) => item.id === taskId);
    const selected = Array.from(files || []).slice(0, 10);
    if (!task || !selected.length) return;
    const uploadedAttachments = [];
    let failedUploads = 0;
    notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
    for (const file of selected) {
      try {
        const uploaded = await hooks.onUploadMachineDocument(
          id,
          "other",
          file,
          null,
          {
            silent: true,
            deferRender: true,
            rethrow: true,
            preserveTab: true,
            documentMetadata: {
              context: "task-attachment",
              linkedTaskId: task.id,
              linkedStatusCycleId: task.statusCycleId || ""
            }
          }
        );
        if (uploaded) uploadedAttachments.push(uploaded);
      } catch {
        failedUploads += 1;
      }
    }
    if (uploadedAttachments.length) {
      renderMachine();
    }
    if (failedUploads) {
      notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
    } else if (uploadedAttachments.length) {
      notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
    }
  };

  hooks.onEditTask = (id, taskId, patch) => {
    if (!canUseCapability(role, "editTasks", configuredPermissions)) return;
    state.draft = {
      ...machineDoc,
      ...buildEditTaskUpdate(machineDoc, taskId, patch, getActorLabel())
    };
    renderMachine();
    autoSave.saveNow(state.tagId, "task-edit");
  };

  hooks.onCompleteTask = (id, taskId) => {
    if (!canUseCapability(role, "completeTasks", configuredPermissions)) return;
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
  } else if (
    session.source === "machine" &&
    (canUploadDocuments || canUploadTaskImages)
  ) {
    hooks.onUploadMachineDocument = async (
      id,
      kind,
      file,
      statusEl,
      options = {}
    ) => {
      if (kind === "other" && options.documentMetadata?.context === "task-attachment") {
        if (!canUploadTaskImages) throw new Error("permission-denied");
      } else if (!canUploadDocuments) {
        throw new Error("permission-denied");
      }
      const uploadResult = await uploadMachineAccessDocument({
        tagId: state.tagId,
        session: state.session,
        kind,
        file,
        documentMetadata: options.documentMetadata || {}
      });
      const uploaded = uploadResult.document;
      const currentDocuments = state.draft.documents || {};
      const documents = kind === "other"
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
      state.draft = {
        ...state.draft,
        ...(uploadResult.operationalPatch || {}),
        documents
      };
      if (statusEl) {
        statusEl.textContent = t("general.uploadSaved", "Archivo guardado");
        statusEl.dataset.state = "ok";
      }
      if (!options.silent) {
        notifyTopbar(t("general.uploadSaved", "Archivo guardado"));
      }
      return uploaded;
    };
    hooks.onRefreshMachineDocuments = () => {};
  }
};

init();
