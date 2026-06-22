import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";
import { auth, functions } from "/static/js/firebase/firebaseApp.js";
import { getCurrentLang, localizeEsPath } from "/static/js/site/locale.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";

const mount = document.getElementById("controlpanel-mount");
const isEn = getCurrentLang() === "en";

const text = {
  codeStatsTitle: isEn ? "Application code" : "C\u00f3digo de aplicaci\u00f3n",
  codeStatsLoading: isEn ? "Loading code stats..." : "Cargando estad\u00edsticas de c\u00f3digo...",
  codeStatsError: isEn ? "Unable to load code stats." : "No se han podido cargar las estad\u00edsticas de c\u00f3digo.",
  codeStatsHint: isEn
    ? "Source lines counted during the last static build."
    : "L\u00edneas fuente contadas durante el \u00faltimo build est\u00e1tico.",
  codeStatsLines: isEn
    ? (value) => `${value} lines of code running this application`
    : (value) => `${value} l\u00edneas de c\u00f3digo corriendo esta aplicaci\u00f3n`,
  backupTitle: isEn ? "Backup" : "Respaldo",
  backupLoading: isEn ? "Loading backup status..." : "Cargando estado de respaldo...",
  backupError: isEn ? "Unable to load backup status." : "No se ha podido cargar el estado de respaldo.",
  backupHint: isEn
    ? "Local NFC backup status. Snapshot files stay outside the repository."
    : "Estado local del respaldo NFC. Los snapshots quedan fuera del repositorio.",
  backupPending: isEn ? "No backup recorded yet" : "Sin respaldo registrado",
  backupOk: isEn ? "Ready" : "Correcto",
  backupPartial: isEn ? "Partial" : "Parcial",
  backupRunning: isEn ? "Running" : "En curso",
  backupFailed: isEn ? "Needs attention" : "Revisar",
  backupOverall: isEn ? "Current backup scope" : "Alcance actual del respaldo",
  backupFirestore: isEn ? "Firestore data" : "Datos Firestore",
  backupStorage: isEn ? "Storage inventory" : "Inventario Storage",
  backupCompleted: isEn ? "Completed" : "Completado",
  backupAge: isEn ? "Age" : "Antigüedad",
  backupCoverage: isEn ? "Included" : "Incluido",
  backupPendingCoverage: isEn ? "Pending" : "Pendiente",
  backupManifest: isEn ? "Manifest" : "Manifiesto",
  backupAttempted: isEn ? "Attempted" : "Intento",
  backupFile: isEn ? "File" : "Archivo",
  backupFolder: isEn ? "Folder" : "Carpeta",
  backupCollections: isEn ? "Collections" : "Colecciones",
  backupDocuments: isEn ? "Documents" : "Documentos",
  backupFiles: isEn ? "Files" : "Archivos",
  backupSize: isEn ? "Size" : "Tama\u00f1o",
  backupProject: isEn ? "Project" : "Proyecto",
  backupBucket: isEn ? "Bucket" : "Bucket",
  backupCause: isEn ? "Cause" : "Causa",
  backupScopeNames: {
    "firebase-auth": isEn ? "Firebase Authentication" : "Firebase Authentication",
    "legacy-tenant-machines": isEn ? "legacy tenant machines" : "máquinas legacy",
    "restore-tools": isEn ? "restore tools" : "herramientas de restauración",
    "scheduled-execution": isEn ? "scheduled execution" : "ejecución programada",
  },
  whatsNewTitle: isEn ? "What's new" : "Novedades",
  whatsNewLoading: isEn ? "Loading What's new status..." : "Cargando estado de Novedades...",
  whatsNewHint: isEn
    ? "Codex-facing toggle for deciding whether relevant product changes should be added to the public What's new section."
    : "Control orientado a Codex para decidir si los cambios relevantes de producto deben añadirse a la seccion publica Novedades.",
  whatsNewEnabled: isEn ? "Enabled" : "Activado",
  whatsNewDisabled: isEn ? "Disabled" : "Desactivado",
  whatsNewDisable: isEn ? "Disable locally" : "Desactivar localmente",
  whatsNewEnable: isEn ? "Enable locally" : "Activar localmente",
  whatsNewSource: isEn
    ? "Authoritative source: docs/codex-flags.json"
    : "Fuente autoritativa: docs/codex-flags.json",
  whatsNewPending: isEn
    ? "Pending: this panel control is not wired to the project flag yet."
    : "Pendiente: este control del panel aun no esta conectado a la flag del proyecto.",
  usersTitle: isEn ? "Users" : "Usuarios",
  usersLoading: isEn ? "Loading users..." : "Cargando usuarios...",
  usersEmpty: isEn ? "No users found." : "No se han encontrado usuarios.",
  usersError: isEn ? "Unable to load users." : "No se han podido cargar los usuarios.",
  usersHint: isEn
    ? "Accounts detected through Unatomo sign-in flows."
    : "Cuentas detectadas a trav\u00e9s de los flujos de acceso de Unatomo.",
  userCollaborator: isEn ? "Collaborator" : "Colaborador",
  userCollaboratorSaved: isEn
    ? "Collaborator access updated."
    : "Acceso de colaborador actualizado.",
  userCollaboratorError: isEn
    ? "Unable to update collaborator access."
    : "No se ha podido actualizar el acceso de colaborador.",
  deleteUser: isEn ? "Delete account" : "Eliminar cuenta",
  usersDeleting: isEn ? "Deleting account..." : "Eliminando cuenta...",
  usersDeleted: isEn
    ? "Account deleted."
    : "Cuenta eliminada.",
  usersActionError: isEn
    ? "Unable to delete account."
    : "No se ha podido eliminar la cuenta.",
  confirmDeleteUser: isEn
    ? (label) => `Delete account ${label}? This will permanently remove the account and all related data, including machines, Tag IDs and QR files. This action cannot be undone.`
    : (label) => `¿Eliminar la cuenta ${label}? Esto eliminará de forma permanente la cuenta y todos sus datos relacionados, incluidas máquinas, Tag ID y archivos QR. Este cambio no se puede deshacer.`,
  codesTitle: isEn ? "Registration codes" : "C\u00f3digos de registro",
  codesLoading: isEn
    ? "Loading active registration codes..."
    : "Cargando c\u00f3digos de registro activos...",
  codesEmpty: isEn
    ? "No active registration codes found."
    : "No se han encontrado c\u00f3digos de registro activos.",
  codesError: isEn
    ? "Unable to load registration codes."
    : "No se han podido cargar los c\u00f3digos de registro.",
  codesHint: isEn
    ? "Currently active registration codes."
    : "C\u00f3digos de registro actualmente activos.",
  codePlaceholder: isEn ? "Custom code (optional)" : "C\u00f3digo personalizado (opcional)",
  addCode: isEn ? "Add code" : "A\u00f1adir c\u00f3digo",
  deleteCode: isEn ? "Delete" : "Eliminar",
  codesSaving: isEn ? "Saving..." : "Guardando...",
  codesDeleting: isEn ? "Deleting..." : "Eliminando...",
  confirmDeleteCode: isEn
    ? (code) => `Delete registration code ${code}?`
    : (code) => `¿Eliminar el código de registro ${code}?`,
  codeCreated: isEn
    ? (code) => `Code created: ${code}`
    : (code) => `C\u00f3digo creado: ${code}`,
  codeDeleted: isEn
    ? (code) => `Code deleted: ${code}`
    : (code) => `C\u00f3digo eliminado: ${code}`,
  codeActionError: isEn
    ? "Unable to update registration codes."
    : "No se han podido actualizar los c\u00f3digos de registro.",
  noName: isEn ? "Unnamed user" : "Usuario sin nombre",
  noEmail: isEn ? "No email" : "Sin correo",
  tagsTitle: isEn ? "Tag IDs" : "Tag ID",
  tagsLoading: isEn ? "Loading generated Tag IDs..." : "Cargando Tag ID generados...",
  tagsEmpty: isEn ? "No Tag IDs found." : "No se han encontrado Tag ID.",
  tagsError: isEn ? "Unable to load Tag IDs." : "No se han podido cargar los Tag ID.",
  tagsHint: isEn ? "Generated Tag IDs and their current assignment details." : "Tag ID generados y su informacion actual de asignacion.",
  tagIdLabel: isEn ? "Tag ID" : "Tag ID",
  tagMachineLabel: isEn ? "Machine" : "Maquina",
  tagUrlLabel: isEn ? "URL" : "URL",
  tagOwnerLabel: isEn ? "Owner" : "Propietario",
  tagCreatedByLabel: isEn ? "Created by" : "Creado por",
  tagAssignedByLabel: isEn ? "Assigned by" : "Asignado por",
  tagStateLabel: isEn ? "State" : "Estado",
  tagCreatedAtLabel: isEn ? "Created" : "Creado",
  tagAssignedAtLabel: isEn ? "Assigned" : "Asignado",
  noMachine: isEn ? "No machine" : "Sin maquina",
  noData: "-",
  backToHome: localizeEsPath("/es/index.html"),
  login: localizeEsPath("/es/auth/login.html")
};

const listUsersCallable = httpsCallable(functions, "listControlPanelUsers");
const listCodesCallable = httpsCallable(functions, "listControlPanelRegistrationCodes");
const createCodeCallable = httpsCallable(functions, "createControlPanelRegistrationCode");
const deleteCodeCallable = httpsCallable(functions, "deleteControlPanelRegistrationCode");
const listTagsCallable = httpsCallable(functions, "listControlPanelTags");
const deleteUserCallable = httpsCallable(functions, "deleteControlPanelUser");
const setUserCollaboratorCallable = httpsCallable(
  functions,
  "setControlPanelUserCollaborator"
);

const createCard = (title) => {
  const card = document.createElement("section");
  card.className = "controlpanel-card";
  card.dataset.expanded = "false";
  card.innerHTML = `
    <button type="button" class="controlpanel-toggle" aria-expanded="false">
      <span class="controlpanel-title">${title}</span>
      <span class="controlpanel-icon">+</span>
    </button>
    <div class="controlpanel-body" hidden></div>
  `;
  return card;
};

const toggleCard = (card) => {
  const body = card.querySelector(".controlpanel-body");
  const toggle = card.querySelector(".controlpanel-toggle");
  const icon = card.querySelector(".controlpanel-icon");
  const open = card.dataset.expanded === "true";
  card.dataset.expanded = open ? "false" : "true";
  if (toggle) toggle.setAttribute("aria-expanded", String(!open));
  if (icon) icon.textContent = open ? "+" : "-";
  if (body) body.hidden = open;
};

const renderState = (body, hint, message, state = "") => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = hint;
  body.appendChild(note);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  if (state) status.dataset.state = state;
  status.textContent = message;
  body.appendChild(status);
};

const renderCodeStats = (body, stats) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.codeStatsHint;
  body.appendChild(note);

  const totalLines = Number(stats?.totalLines || 0);
  const formatted = new Intl.NumberFormat(isEn ? "en" : "es").format(totalLines);
  const metric = document.createElement("div");
  metric.className = "controlpanel-metric";

  const value = document.createElement("div");
  value.className = "controlpanel-metric-value";
  value.textContent = formatted;

  const label = document.createElement("div");
  label.className = "controlpanel-metric-label";
  label.textContent = text.codeStatsLines(formatted);

  metric.appendChild(value);
  metric.appendChild(label);
  body.appendChild(metric);
};

const renderUsers = (body, items, handlers = {}) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.usersHint;
  body.appendChild(note);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  status.hidden = true;
  body.appendChild(status);

  const setStatus = (message = "", state = "") => {
    status.hidden = !message;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else status.removeAttribute("data-state");
  };

  if (handlers.setStatusRef) handlers.setStatusRef(setStatus);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.usersEmpty;
    body.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "controlpanel-list";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "controlpanel-user controlpanel-user--action";

    const identity = document.createElement("div");
    identity.className = "controlpanel-user-copy";

    const name = document.createElement("div");
    name.className = "controlpanel-user-name";
    name.textContent = item.displayName || text.noName;

    const meta = document.createElement("div");
    meta.className = "controlpanel-user-meta";
    meta.textContent = item.email || text.noEmail;

    identity.appendChild(name);
    identity.appendChild(meta);
    row.appendChild(identity);

    const collaboratorLabel = document.createElement("label");
    collaboratorLabel.className = "controlpanel-check";
    const collaborator = document.createElement("input");
    collaborator.type = "checkbox";
    collaborator.checked = item.suggestionsCollaborator === true;
    collaborator.addEventListener("change", () => {
      if (handlers.onToggleCollaborator) {
        handlers.onToggleCollaborator(item, collaborator.checked, collaborator);
      }
    });
    const collaboratorText = document.createElement("span");
    collaboratorText.textContent = text.userCollaborator;
    collaboratorLabel.appendChild(collaborator);
    collaboratorLabel.appendChild(collaboratorText);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "controlpanel-link-danger";
    remove.setAttribute("aria-label", text.deleteUser);
    remove.textContent = "x";
    remove.addEventListener("click", () => {
      if (handlers.onDeleteUser) handlers.onDeleteUser(item);
    });

    row.appendChild(collaboratorLabel);
    row.appendChild(remove);
    list.appendChild(row);
  });
  body.appendChild(list);
};


const formatMaybeDate = (value) => {
  if (!value) return text.noData;
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : value?.seconds
          ? new Date(value.seconds * 1000)
          : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return text.noData;
  return new Intl.DateTimeFormat(isEn ? "en" : "es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(isEn ? "en" : "es", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(size)} ${units[unitIndex]}`;
};

const formatBackupAge = (value) => {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return text.noData;
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

const getBackupStatusText = (status) => {
  if (status === "ok") return text.backupOk;
  if (status === "partial") return text.backupPartial;
  if (status === "running") return text.backupRunning;
  if (status === "error") return text.backupFailed;
  return text.backupPending;
};

const appendBackupMeta = (wrap, label, value) => {
  if (value == null || value === "") return;
  const row = document.createElement("div");
  row.className = "controlpanel-backup-meta";
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("strong");
  val.textContent = value;
  row.appendChild(key);
  row.appendChild(val);
  wrap.appendChild(row);
};

const renderBackupItem = (item, label, type) => {
  const status = item?.status || "pending";
  const card = document.createElement("article");
  card.className = "controlpanel-backup-item";
  card.dataset.state = status;

  const header = document.createElement("div");
  header.className = "controlpanel-backup-header";

  const title = document.createElement("h3");
  title.textContent = label;

  const badge = document.createElement("span");
  badge.className = "controlpanel-backup-badge";
  badge.textContent = getBackupStatusText(status);

  header.appendChild(title);
  header.appendChild(badge);
  card.appendChild(header);

  if (status === "ok") {
    appendBackupMeta(card, text.backupCompleted, formatMaybeDate(item.completedAt));
    appendBackupMeta(card, text.backupFile, item.file);
    appendBackupMeta(card, text.backupProject, item.projectId);
    if (type === "firestore") {
      appendBackupMeta(card, text.backupCollections, item.collectionCount);
      appendBackupMeta(card, text.backupDocuments, item.documentCount);
    } else {
      appendBackupMeta(card, text.backupBucket, item.bucket);
      appendBackupMeta(card, text.backupFiles, item.fileCount);
      appendBackupMeta(card, text.backupSize, formatBytes(item.totalBytes));
      appendBackupMeta(card, text.backupFolder, item.downloadDir);
    }
  } else if (status === "error") {
    appendBackupMeta(card, text.backupAttempted, formatMaybeDate(item.attemptedAt));
    appendBackupMeta(card, text.backupCause, item.error);
  }

  return card;
};

const renderOverallBackup = (item = {}) => {
  const status = item.status || "pending";
  const card = document.createElement("article");
  card.className = "controlpanel-backup-item controlpanel-backup-overall";
  card.dataset.state = status;
  const header = document.createElement("div");
  header.className = "controlpanel-backup-header";
  const title = document.createElement("h3");
  title.textContent = text.backupOverall;
  const badge = document.createElement("span");
  badge.className = "controlpanel-backup-badge";
  badge.textContent = getBackupStatusText(status);
  header.appendChild(title);
  header.appendChild(badge);
  card.appendChild(header);

  const completedAt = item.completedAt || item.attemptedAt || item.startedAt;
  appendBackupMeta(card, text.backupCompleted, formatMaybeDate(completedAt));
  appendBackupMeta(card, text.backupAge, formatBackupAge(completedAt));
  appendBackupMeta(card, text.backupProject, item.projectId);
  appendBackupMeta(card, text.backupManifest, item.manifestFile);
  const collectionCount = Array.isArray(item.firestoreCollections)
    ? item.firestoreCollections.length
    : 0;
  const prefixCount = Array.isArray(item.storagePrefixes)
    ? item.storagePrefixes.length
    : 0;
  if (collectionCount || prefixCount) {
    appendBackupMeta(
      card,
      text.backupCoverage,
      `${collectionCount} Firestore · ${prefixCount} Storage`,
    );
  }
  const pending = (item.pendingScopes || [])
    .map((key) => text.backupScopeNames[key] || key)
    .join(", ");
  appendBackupMeta(card, text.backupPendingCoverage, pending);
  if (item.error) appendBackupMeta(card, text.backupCause, item.error);
  return card;
};

const renderBackupStatus = (body, status) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.backupHint;
  body.appendChild(note);

  const list = document.createElement("div");
  list.className = "controlpanel-backup-list";
  list.appendChild(renderOverallBackup(status?.overall || {}));
  list.appendChild(
    renderBackupItem(status?.firestore || {}, text.backupFirestore, "firestore"),
  );
  list.appendChild(
    renderBackupItem(status?.storage || {}, text.backupStorage, "storage"),
  );
  body.appendChild(list);
};

const WHATS_NEW_LOCAL_KEY = "unatomo_whats_new_codex_enabled_v1";

const getLocalWhatsNewFlag = (fallback) => {
  try {
    const raw = localStorage.getItem(WHATS_NEW_LOCAL_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // ignore storage failures
  }
  return fallback;
};

const renderWhatsNewControl = (body, flags = {}) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.whatsNewHint;
  body.appendChild(note);

  const enabled = getLocalWhatsNewFlag(flags.whatsNewUpdates !== false);
  const status = document.createElement("p");
  status.className = "controlpanel-state";
  status.dataset.state = enabled ? "ok" : "error";
  status.textContent = enabled ? text.whatsNewEnabled : text.whatsNewDisabled;
  body.appendChild(status);

  const source = document.createElement("p");
  source.className = "controlpanel-note";
  source.textContent = text.whatsNewSource;
  body.appendChild(source);

  const pending = document.createElement("p");
  pending.className = "controlpanel-note controlpanel-note-superadmin";
  pending.textContent = text.whatsNewPending;
  body.appendChild(pending);

  const actions = document.createElement("div");
  actions.className = "controlpanel-actions";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "controlpanel-btn";
  toggle.textContent = enabled ? text.whatsNewDisable : text.whatsNewEnable;
  toggle.disabled = true;
  actions.appendChild(toggle);
  body.appendChild(actions);
};

const renderTags = (body, items) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.tagsHint;
  body.appendChild(note);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.tagsEmpty;
    body.appendChild(empty);
    return;
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "controlpanel-table-wrap";

  const table = document.createElement("table");
  table.className = "controlpanel-table";

  const head = document.createElement("thead");
  head.innerHTML = `
    <tr>
      <th>${text.tagIdLabel}</th>
      <th>${text.tagMachineLabel}</th>
      <th>${text.tagUrlLabel}</th>
      <th>${text.tagOwnerLabel}</th>
      <th>${text.tagCreatedByLabel}</th>
      <th>${text.tagAssignedByLabel}</th>
      <th>${text.tagStateLabel}</th>
      <th>${text.tagCreatedAtLabel}</th>
      <th>${text.tagAssignedAtLabel}</th>
    </tr>
  `;
  table.appendChild(head);

  const tbody = document.createElement("tbody");
  items.forEach((item) => {
    const row = document.createElement("tr");
    const tagUrl = `${window.location.origin}${item.urlPath || ""}`;
    row.innerHTML = `
      <td>${item.tagId || text.noData}</td>
      <td>${item.machineTitle || text.noMachine}</td>
      <td></td>
      <td>${item.tenantDisplayName || item.tenantEmail || text.noData}</td>
      <td>${item.createdByDisplayName || item.createdByEmail || text.noData}</td>
      <td>${item.assignedByDisplayName || item.assignedByEmail || text.noData}</td>
      <td>${item.state || text.noData}</td>
      <td>${formatMaybeDate(item.createdAt)}</td>
      <td>${formatMaybeDate(item.assignedAt)}</td>
    `;
    const linkCell = row.children[2];
    const link = document.createElement("a");
    link.href = tagUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = tagUrl;
    linkCell.appendChild(link);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);
};

const renderCodes = (body, items, handlers = {}) => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = text.codesHint;
  body.appendChild(note);

  const actions = document.createElement("div");
  actions.className = "controlpanel-actions";

  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.className = "controlpanel-input";
  codeInput.placeholder = text.codePlaceholder;
  codeInput.maxLength = 32;
  codeInput.autocomplete = "off";
  codeInput.spellcheck = false;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "controlpanel-btn";
  addBtn.textContent = text.addCode;
  addBtn.addEventListener("click", () => {
    if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/\s+/g, "");
  });
  codeInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (handlers.onAddCode) handlers.onAddCode(codeInput.value || "");
  });

  actions.appendChild(codeInput);
  actions.appendChild(addBtn);
  body.appendChild(actions);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  status.hidden = true;
  body.appendChild(status);

  const setStatus = (message = "", state = "") => {
    status.hidden = !message;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else status.removeAttribute("data-state");
  };

  if (handlers.setStatusRef) handlers.setStatusRef(setStatus, addBtn, codeInput);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "controlpanel-state";
    empty.textContent = text.codesEmpty;
    body.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "controlpanel-list";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "controlpanel-user controlpanel-user--action";

    const code = document.createElement("div");
    code.className = "controlpanel-user-name";
    code.textContent = item.code || "-";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "controlpanel-link-danger";
    remove.textContent = text.deleteCode;
    remove.addEventListener("click", () => {
      if (handlers.onDeleteCode) handlers.onDeleteCode(item.code || "");
    });

    row.appendChild(code);
    row.appendChild(remove);
    list.appendChild(row);
  });
  body.appendChild(list);
};

if (mount) {
  const wrap = document.createElement("div");
  wrap.className = "controlpanel-wrap";
  const codeStatsCard = createCard(text.codeStatsTitle);
  const backupCard = createCard(text.backupTitle);
  const whatsNewCard = createCard(text.whatsNewTitle);
  const usersCard = createCard(text.usersTitle);
  const codesCard = createCard(text.codesTitle);
  const tagsCard = createCard(text.tagsTitle);
  wrap.appendChild(codeStatsCard);
  wrap.appendChild(backupCard);
  wrap.appendChild(whatsNewCard);
  wrap.appendChild(usersCard);
  wrap.appendChild(codesCard);
  wrap.appendChild(tagsCard);
  mount.appendChild(wrap);

  codeStatsCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(codeStatsCard));
  backupCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(backupCard));
  whatsNewCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(whatsNewCard));
  usersCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(usersCard));
  codesCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(codesCard));
  tagsCard
    .querySelector(".controlpanel-toggle")
    ?.addEventListener("click", () => toggleCard(tagsCard));

  const codeStatsBody = codeStatsCard.querySelector(".controlpanel-body");
  const backupBody = backupCard.querySelector(".controlpanel-body");
  const whatsNewBody = whatsNewCard.querySelector(".controlpanel-body");
  const usersBody = usersCard.querySelector(".controlpanel-body");
  const codesBody = codesCard.querySelector(".controlpanel-body");
  const tagsBody = tagsCard.querySelector(".controlpanel-body");
  let updateCodesStatus = () => {};
  let addCodeButton = null;
  let addCodeInput = null;

  const loadCodes = async () => {
    if (!codesBody) return;
    renderState(codesBody, text.codesHint, text.codesLoading);
    try {
      const codesResponse = await listCodesCallable();
      const codes = Array.isArray(codesResponse?.data?.items) ? codesResponse.data.items : [];
      renderCodes(codesBody, codes, {
        setStatusRef: (setStatus, addBtn, codeInput) => {
          updateCodesStatus = setStatus;
          addCodeButton = addBtn;
          addCodeInput = codeInput;
        },
        onAddCode: async (rawCode) => {
          if (addCodeButton) addCodeButton.disabled = true;
          if (addCodeInput) addCodeInput.disabled = true;
          updateCodesStatus(text.codesSaving);
          try {
            const code = (rawCode || "").toString().trim().toUpperCase();
            const response = await createCodeCallable(code ? { code } : {});
            const created = response?.data?.code ? String(response.data.code) : "";
            await loadCodes();
    await loadTags();
            if (addCodeInput) addCodeInput.value = "";
            updateCodesStatus(created ? text.codeCreated(created) : "", "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          } finally {
            if (addCodeButton) addCodeButton.disabled = false;
            if (addCodeInput) addCodeInput.disabled = false;
          }
        },
        onDeleteCode: async (code) => {
          if (!code) return;
          if (!window.confirm(text.confirmDeleteCode(code))) return;
          updateCodesStatus(text.codesDeleting);
          try {
            await deleteCodeCallable({ code });
            await loadCodes();
            updateCodesStatus(text.codeDeleted(code), "");
          } catch {
            updateCodesStatus(text.codeActionError, "error");
          }
        },
      });
    } catch {
      renderState(codesBody, text.codesHint, text.codesError, "error");
    }
  };



  const loadTags = async () => {
    if (!tagsBody) return;
    renderState(tagsBody, text.tagsHint, text.tagsLoading);
    try {
      const response = await listTagsCallable();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      renderTags(tagsBody, items);
    } catch {
      renderState(tagsBody, text.tagsHint, text.tagsError, "error");
    }
  };

  const loadCodeStats = async () => {
    if (!codeStatsBody) return;
    renderState(codeStatsBody, text.codeStatsHint, text.codeStatsLoading);
    try {
      const response = await fetch(`/static/data/code-stats.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("code-stats-unavailable");
      const stats = await response.json();
      renderCodeStats(codeStatsBody, stats);
    } catch {
      renderState(codeStatsBody, text.codeStatsHint, text.codeStatsError, "error");
    }
  };

  const loadBackupStatus = async () => {
    if (!backupBody) return;
    renderState(backupBody, text.backupHint, text.backupLoading);
    try {
      const response = await fetch(`/static/data/nfc-backup-status.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("backup-status-unavailable");
      const status = await response.json();
      renderBackupStatus(backupBody, status);
    } catch {
      renderState(backupBody, text.backupHint, text.backupError, "error");
    }
  };

  const loadWhatsNewControl = async () => {
    if (!whatsNewBody) return;
    renderState(whatsNewBody, text.whatsNewHint, text.whatsNewLoading);
    try {
      const response = await fetch(`/docs/codex-flags.json?ts=${Date.now()}`, {
        cache: "no-store"
      });
      const flags = response.ok ? await response.json() : {};
      renderWhatsNewControl(whatsNewBody, flags);
    } catch {
      renderWhatsNewControl(whatsNewBody, {});
    }
  };

  toggleCard(codeStatsCard);
  if (codeStatsBody) renderState(codeStatsBody, text.codeStatsHint, text.codeStatsLoading);
  if (backupBody) renderState(backupBody, text.backupHint, text.backupLoading);
  if (whatsNewBody) renderState(whatsNewBody, text.whatsNewHint, text.whatsNewLoading);
  if (usersBody) renderState(usersBody, text.usersHint, text.usersLoading);
  if (codesBody) renderState(codesBody, text.codesHint, text.codesLoading);
  if (tagsBody) renderState(tagsBody, text.tagsHint, text.tagsLoading);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = text.login;
      return;
    }

    const allowed = await isControlPanelUser(user);
    if (!allowed) {
      window.location.href = text.backToHome;
      return;
    }

    if (
      !codeStatsBody ||
      !backupBody ||
      !whatsNewBody ||
      !usersBody ||
      !codesBody ||
      !tagsBody
    ) return;
    await loadCodeStats();
    await loadBackupStatus();
    await loadWhatsNewControl();
    renderState(usersBody, text.usersHint, text.usersLoading);

    let updateUsersStatus = () => {};
    const loadUsers = async () => {
      if (!usersBody) return;
      renderState(usersBody, text.usersHint, text.usersLoading);
      try {
        const usersResponse = await listUsersCallable();
        const users = Array.isArray(usersResponse?.data?.items) ? usersResponse.data.items : [];
        renderUsers(usersBody, users, {
          setStatusRef: (setStatus) => {
            updateUsersStatus = setStatus;
          },
          onToggleCollaborator: async (item, enabled, input) => {
            const uid = (item?.uid || "").toString().trim();
            if (!uid) return;
            input.disabled = true;
            updateUsersStatus("");
            try {
              await setUserCollaboratorCallable({ uid, enabled });
              item.suggestionsCollaborator = enabled;
              updateUsersStatus(text.userCollaboratorSaved, "");
            } catch {
              input.checked = !enabled;
              updateUsersStatus(text.userCollaboratorError, "error");
            } finally {
              input.disabled = false;
            }
          },
          onDeleteUser: async (item) => {
            const uid = (item?.uid || "").toString().trim();
            if (!uid) return;
            const label = item.displayName || item.email || uid;
            if (!window.confirm(text.confirmDeleteUser(label))) return;
            updateUsersStatus(text.usersDeleting);
            try {
              await deleteUserCallable({ uid });
              await loadUsers();
              await loadTags();
              updateUsersStatus(text.usersDeleted, "");
            } catch {
              updateUsersStatus(text.usersActionError, "error");
            }
          },
        });
      } catch {
        renderState(usersBody, text.usersHint, text.usersError, "error");
      }
    };

    await loadUsers();
    await loadCodes();
    await loadTags();
  });
}

