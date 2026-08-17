import {
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import {
  auth,
  db,
  storage,
  getUserRegistrationState,
  isAccountOnboardingRequired
} from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { fetchDashboardLayout, upsertDashboardLayout } from "/static/js/dashboard/firestoreRepo.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import {
  fetchNotificationPreferences,
  normalizeNotificationPreferences,
  saveNotificationPreferences
} from "./notificationPreferencesRepo.js";
import {
  setTopbarLogoLoading
} from "/static/js/topbar/loading-logo.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";
import { calculateStorageUsage, formatBytes, STORAGE_LIMIT_BYTES } from "./storageUsage.js";
import {
  checkAccountHandleAvailability,
  changeAccountHandle,
  claimAccountHandle,
  normalizeAccountHandle
} from "./accountHandleRepo.js";
import {
  changeAccountPassword,
  finalizeAccountEmailChange,
  requestAccountEmailChange
} from "./accountSecurityRepo.js";
import {
  getAppBasePrefix,
  getCurrentLang,
  getLocalizedHref,
  localizeEsPath,
  setSavedLang
} from "/static/js/site/locale.js";

const currentLang = getCurrentLang();
const isEn = currentLang === "en";
const appBasePrefix = getAppBasePrefix();
const textMap = {
  settings: isEn ? "Settings" : "Configuraci\u00f3n",
  settingsTreeAria: isEn ? "Settings navigation" : "Navegaci\u00f3n de configuraci\u00f3n",
  language: isEn ? "Language" : "Idioma",
  spanish: isEn ? "Spanish" : "Espa\u00f1ol",
  english: isEn ? "English" : "Ingl\u00e9s",
  account: isEn ? "Account" : "Cuenta",
  storage: isEn ? "Storage" : "Almacenamiento",
  preferences: isEn ? "Preferences" : "Preferencias",
  notifications: isEn ? "Notifications" : "Notificaciones",
  activity: isEn ? "Activity" : "Actividad",
  security: isEn ? "Security" : "Seguridad",
  name: isEn ? "Name" : "Nombre",
  accountHandle: isEn ? "Username" : "Nombre de usuario",
  accountHandleClaim: isEn ? "Confirm" : "Confirmar",
  accountHandleChange: isEn ? "Change" : "Cambiar",
  accountHandleSave: isEn ? "Save" : "Guardar",
  accountHandleCancel: isEn ? "Cancel" : "Cancelar",
  save: isEn ? "Save" : "Guardar",
  saved: isEn ? "Changes saved" : "Cambios guardados",
  saveError: isEn ? "Unable to save the changes." : "No se han podido guardar los cambios.",
  saving: isEn ? "Saving..." : "Guardando...",
  profilePhoto: isEn ? "Profile picture" : "Imagen de perfil",
  changeProfilePhoto: isEn ? "Choose image" : "Elegir imagen",
  removeProfilePhoto: isEn ? "Remove" : "Eliminar",
  profilePhotoHint: isEn ? "JPG, PNG or WebP." : "JPG, PNG o WebP.",
  profilePhotoError: isEn ? "Choose a JPG, PNG or WebP image up to 12 MB." : "Elige una imagen JPG, PNG o WebP de hasta 12 MB.",
  profilePhotoSaveError: isEn ? "Unable to update the profile picture." : "No se ha podido actualizar la imagen de perfil.",
  accountHandleAvailable: isEn ? "Available" : "Disponible",
  accountHandleTaken: isEn ? "Not available" : "No disponible",
  accountHandleInvalid: isEn
    ? "Use 3-30 lowercase letters, numbers, dots, hyphens or underscores."
    : "Usa entre 3 y 30 letras min\u00fasculas, n\u00fameros, puntos, guiones o guiones bajos.",
  accountHandleReserved: isEn ? "Reserved username" : "Nombre de usuario reservado",
  accountHandleSaved: isEn ? "Username confirmed" : "Nombre de usuario confirmado",
  accountHandleChecking: isEn ? "Checking..." : "Comprobando...",
  accountHandleSaving: isEn ? "Confirming..." : "Confirmando...",
  accountHandleError: isEn
    ? "Unable to confirm the username."
    : "No se ha podido confirmar el nombre de usuario.",
  accountHandleConfirm: isEn
    ? (handle) => `Confirm @${handle}?`
    : (handle) => `\u00bfConfirmar @${handle}?`,
  accountHandleChangeConfirm: isEn
    ? (handle) => `Change to @${handle}? Your previous username will remain permanently reserved for you.`
    : (handle) => `\u00bfCambiar a @${handle}? Tu nombre anterior quedar\u00e1 reservado para ti permanentemente.`,
  accountHandleCooldown: isEn
    ? "Wait one minute before changing it again."
    : "Espera un minuto antes de volver a cambiarlo.",
  company: isEn ? "Company" : "Empresa",
  email: isEn ? "Email" : "Correo electr\u00f3nico",
  createdAt: isEn ? "Created at" : "Fecha de creaci\u00f3n",
  theme: isEn ? "Theme" : "Tema",
  emailNotifications: isEn ? "Email notifications" : "Notificaciones por correo",
  emailNotificationsHint: isEn
    ? "Turn on email notifications to receive operational equipment alerts."
    : "Activa las notificaciones por correo para recibir avisos operativos de tus equipos.",
  machineOutOfService: isEn ? "Equipment out of service" : "Equipo fuera de servicio",
  machineOutOfServiceHint: isEn
    ? "Receive an email when equipment changes from operational to out of service."
    : "Recibe un correo cuando un equipo pase de operativo a fuera de servicio.",
  machineOperationalAgain: isEn ? "Equipment operational" : "Equipo operativo",
  machineOperationalAgainHint: isEn
    ? "Receive an email when equipment returns from out of service to operational."
    : "Recibe un correo cuando un equipo vuelva de fuera de servicio a operativo.",
  receiveOwnedNotifications: isEn ? "Receive notifications from my equipment" : "Recibir notificaciones de mis equipos",
  receiveOwnedNotificationsHint: isEn ? "Receive a personal copy of alerts generated by equipment you own." : "Recibe una copia personal de las alertas generadas por tus equipos.",
  notifyEquipmentAdmins: isEn ? "Notify equipment administrators" : "Notificar a los administradores de mis equipos",
  notifyEquipmentAdminsHint: isEn ? "Send alerts to the administrators of your equipment who have chosen to receive them." : "Envía alertas a los administradores de tus equipos que hayan decidido recibirlas.",
  receiveAdministeredNotifications: isEn ? "Receive notifications from equipment I administer" : "Recibir notificaciones de equipos que administro",
  receiveAdministeredNotificationsHint: isEn ? "Accept alerts authorised by the owners of equipment you administer." : "Acepta las alertas autorizadas por los propietarios de los equipos que administras.",
  tabOrder: isEn ? "Machine tab order" : "Orden de pesta\u00f1as",
  moveUp: isEn ? "Up" : "Subir",
  moveDown: isEn ? "Down" : "Bajar",
  tasksTab: isEn ? "Tasks" : "Tareas",
  statsTab: isEn ? "Statistics" : "Estad\u00edsticas",
  generalTab: isEn ? "General" : "General",
  historyTab: isEn ? "History" : "Historial",
  settingsTab: isEn ? "Settings" : "Configuraci\u00f3n",
  light: isEn ? "Light" : "Claro",
  dark: isEn ? "Dark" : "Oscuro",
  ownMachines: isEn ? "Owned machines" : "M\u00e1quinas propias",
  adminMachines: isEn ? "Machines as administrator" : "M\u00e1quinas como administrador",
  storageUsed: isEn ? "Used" : "Usado",
  storageLimit: isEn ? "Limit" : "L\u00edmite",
  storageDocuments: isEn ? "Documents" : "Documentos",
  storageQr: isEn ? "QR codes" : "C\u00f3digos QR",
  storageLoading: isEn ? "Calculating..." : "Calculando...",
  storageEstimated: isEn ? "QR usage may be estimated" : "El uso de QR puede ser estimado",
  storageError: isEn ? "Could not calculate storage usage" : "No se pudo calcular el uso de almacenamiento",
  storageFullNotification: isEn
    ? "Storage is full. Free up space before uploading documents or generating new Tag IDs/QR codes."
    : "Almacenamiento lleno. Libera espacio para subir documentos o generar nuevos Tag ID/QR.",
  changePassword: isEn ? "Change password" : "Cambiar contrase\u00f1a",
  currentPassword: isEn ? "Current password" : "Contraseña actual",
  newPassword: isEn ? "New password" : "Nueva contraseña",
  confirmPassword: isEn ? "Confirm new password" : "Confirmar nueva contraseña",
  passwordChanged: isEn ? "Password changed. A confirmation email was sent." : "Contraseña modificada. Te hemos enviado un correo de confirmación.",
  passwordMismatch: isEn ? "The passwords do not match." : "Las contraseñas no coinciden.",
  passwordRequirements: isEn ? "Use at least 8 characters." : "Usa al menos 8 caracteres.",
  changeEmail: isEn ? "Change email" : "Cambiar correo",
  newEmail: isEn ? "New email" : "Nuevo correo",
  emailChangeSent: isEn ? "Check the new address to complete the change." : "Revisa la nueva dirección para completar el cambio.",
  emailChangeCompleted: isEn ? "Email change completed." : "Cambio de correo completado.",
  securityActionError: isEn ? "Unable to complete the security action." : "No se ha podido completar la acción de seguridad.",
  verificationRequired: isEn ? "Verify your email from the dashboard before changing account credentials." : "Verifica tu correo desde el dashboard antes de cambiar las credenciales de la cuenta.",
  logout: isEn ? "Sign out" : "Cerrar sesi\u00f3n",
  user: isEn ? "User" : "Usuario",
  createdLocale: isEn ? "en-GB" : "es-ES",
};

const mount = document.getElementById("profile-mount");
const PROFILE_AVATAR_MAX_INPUT_BYTES = 12 * 1024 * 1024;
const PROFILE_AVATAR_SIZE = 512;
const PROFILE_AVATAR_PATH = (uid) => `profile-avatars/${uid}/avatar.webp`;
const PROFILE_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const profileInitials = (name = "", fallback = "") => {
  const source = (name || fallback || "").toString().trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : source.slice(0, 2))
    .toUpperCase();
};

const createProfileAvatarBlob = async (file) => {
  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const offsetX = Math.floor((bitmap.width - sourceSize) / 2);
  const offsetY = Math.floor((bitmap.height - sourceSize) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_AVATAR_SIZE;
  canvas.height = PROFILE_AVATAR_SIZE;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, offsetX, offsetY, sourceSize, sourceSize, 0, 0, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_SIZE);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("profile-avatar-conversion-failed");
  return blob;
};
const DEFAULT_TAB_ORDER = ["quehaceres", "historial", "estadisticas", "general", "configuracion"];
const tabLabels = {
  quehaceres: textMap.tasksTab,
  general: textMap.generalTab,
  historial: textMap.historyTab,
  estadisticas: textMap.statsTab,
  configuracion: textMap.settingsTab
};

const sectionDefinitions = [
  {
    id: "account",
    label: textMap.account,
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 19.5c.7-3.2 3.1-5 6.5-5s5.8 1.8 6.5 5"/></svg>'
  },
  {
    id: "preferences",
    label: textMap.preferences,
    icon: '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="11" cy="18" r="1.7"/></svg>'
  },
  {
    id: "notifications",
    label: textMap.notifications,
    icon: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
  },
  {
    id: "storage",
    label: textMap.storage,
    icon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/></svg>'
  },
  {
    id: "activity",
    label: textMap.activity,
    icon: '<svg viewBox="0 0 24 24"><path d="M4 12h3l2-5 3.2 10 2.2-5H20"/></svg>'
  },
  {
    id: "security",
    label: textMap.security,
    icon: '<svg viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.2c0 4.2-2.8 7.7-7 9.3-4.2-1.6-7-5.1-7-9.3V6z"/><path d="m9 12 2 2 4-4"/></svg>'
  }
];

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

const createCard = (title, icon = "") => {
  const card = document.createElement("div");
  card.className = "profile-card";
  card.dataset.expanded = "false";
  card.innerHTML = `
    <button type="button" class="profile-card-toggle" aria-expanded="false">
      <span class="profile-card-heading">
        <span class="profile-card-section-icon" aria-hidden="true">${icon}</span>
        <span class="profile-card-title">${title}</span>
      </span>
      <span class="profile-card-icon">+</span>
    </button>
    <div class="profile-card-body" hidden></div>
  `;
  return card;
};

const toggleCard = (card) => {
  const body = card.querySelector(".profile-card-body");
  const toggle = card.querySelector(".profile-card-toggle");
  const icon = card.querySelector(".profile-card-icon");
  const isOpen = card.dataset.expanded === "true";
  card.dataset.expanded = isOpen ? "false" : "true";
  if (toggle) toggle.setAttribute("aria-expanded", String(!isOpen));
  if (icon) icon.textContent = isOpen ? "+" : "-";
  if (body) body.hidden = isOpen;
};

if (mount) {
  setTopbarLogoLoading("settings", true);
  const topbarTitle = document.getElementById("topbar-title");
  if (topbarTitle) topbarTitle.textContent = textMap.settings;
  document.title = `${textMap.settings} | unatomo`;

  const wrap = document.createElement("div");
  wrap.className = "profile-wrap";
  const sectionIconById = new Map(
    sectionDefinitions.map(({ id, icon }) => [id, icon])
  );

  const accountCard = createCard(textMap.account, sectionIconById.get("account"));
  const preferencesCard = createCard(textMap.preferences, sectionIconById.get("preferences"));
  const notificationsCard = createCard(textMap.notifications, sectionIconById.get("notifications"));
  const storageCard = createCard(textMap.storage, sectionIconById.get("storage"));
  const activityCard = createCard(textMap.activity, sectionIconById.get("activity"));
  const securityCard = createCard(textMap.security, sectionIconById.get("security"));

  wrap.appendChild(accountCard);
  wrap.appendChild(preferencesCard);
  wrap.appendChild(notificationsCard);
  wrap.appendChild(storageCard);
  wrap.appendChild(activityCard);
  wrap.appendChild(securityCard);

  const sectionCards = new Map([
    ["account", accountCard],
    ["preferences", preferencesCard],
    ["notifications", notificationsCard],
    ["storage", storageCard],
    ["activity", activityCard],
    ["security", securityCard]
  ]);
  const settingsLayout = document.createElement("div");
  settingsLayout.className = "profile-settings-layout";
  const sectionTree = document.createElement("aside");
  sectionTree.className = "dashboard-group-tree profile-section-tree";
  sectionTree.setAttribute("aria-label", textMap.settingsTreeAria);
  const sectionTreeHeader = document.createElement("div");
  sectionTreeHeader.className = "dashboard-group-tree-header";
  const sectionTreeTitle = document.createElement("div");
  sectionTreeTitle.className = "dashboard-group-tree-title";
  sectionTreeTitle.textContent = textMap.settings;
  sectionTreeHeader.appendChild(sectionTreeTitle);
  sectionTree.appendChild(sectionTreeHeader);
  const sectionTreeList = document.createElement("div");
  sectionTreeList.className = "dashboard-group-tree-list profile-section-tree-list";
  sectionTreeList.setAttribute("role", "tree");
  sectionTree.appendChild(sectionTreeList);
  settingsLayout.appendChild(sectionTree);
  settingsLayout.appendChild(wrap);
  mount.appendChild(settingsLayout);

  const sectionTreeButtons = new Map();
  let activeSectionId = "account";
  const selectSection = (sectionId) => {
    if (!sectionCards.has(sectionId)) return;
    activeSectionId = sectionId;
    sectionTreeButtons.forEach((button, id) => {
      button.setAttribute("aria-selected", id === activeSectionId ? "true" : "false");
      button.closest(".profile-section-tree-row")?.classList.toggle(
        "is-selected",
        id === activeSectionId
      );
    });
    sectionCards.forEach((card, id) => {
      const isActive = id === activeSectionId;
      card.classList.toggle("is-active", isActive);
      card.dataset.expanded = isActive ? "true" : "false";
      card.querySelector(".profile-card-toggle")?.setAttribute(
        "aria-expanded",
        isActive ? "true" : "false"
      );
      const cardIcon = card.querySelector(".profile-card-icon");
      if (cardIcon) cardIcon.textContent = isActive ? "-" : "+";
      const cardBody = card.querySelector(".profile-card-body");
      if (cardBody) cardBody.hidden = !isActive;
    });
  };

  sectionDefinitions.forEach(({id, label, icon}) => {
    const row = document.createElement("div");
    row.className = "dashboard-group-tree-row profile-section-tree-row";
    row.style.setProperty("--tree-indent", "0.05rem");
    const spacer = document.createElement("span");
    spacer.className = "dashboard-group-tree-toggle-spacer";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dashboard-group-tree-node profile-section-tree-node";
    button.setAttribute("role", "treeitem");
    button.setAttribute("aria-level", "1");
    button.setAttribute("aria-selected", "false");
    const iconEl = document.createElement("span");
    iconEl.className = "dashboard-group-tree-icon profile-section-tree-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.innerHTML = icon;
    const labelEl = document.createElement("span");
    labelEl.className = "dashboard-group-tree-label";
    labelEl.textContent = label;
    button.append(iconEl, labelEl);
    button.addEventListener("click", () => selectSection(id));
    row.append(spacer, button);
    sectionTreeList.appendChild(row);
    sectionTreeButtons.set(id, button);
  });
  selectSection(activeSectionId);

  const accountBody = accountCard.querySelector(".profile-card-body");
  const storageBody = storageCard.querySelector(".profile-card-body");
  const prefsBody = preferencesCard.querySelector(".profile-card-body");
  const notificationsBody = notificationsCard.querySelector(".profile-card-body");
  const activityBody = activityCard.querySelector(".profile-card-body");
  const securityBody = securityCard.querySelector(".profile-card-body");

  if (accountBody) {
    accountBody.innerHTML = `
      <div class="profile-row profile-avatar-row">
        <span class="profile-label">${textMap.profilePhoto}</span>
        <div class="profile-avatar-control">
          <span class="profile-avatar-preview" id="profile-avatar-preview" aria-hidden="true"></span>
          <div class="profile-avatar-actions">
            <label class="profile-avatar-upload" for="profile-avatar-input">${textMap.changeProfilePhoto}</label>
            <button class="profile-avatar-remove" id="profile-avatar-remove" type="button" hidden>${textMap.removeProfilePhoto}</button>
            <input id="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" hidden />
            <span class="profile-avatar-hint">${textMap.profilePhotoHint}</span>
          </div>
        </div>
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.name}</span>
        <input class="profile-input" id="profile-name" type="text" maxlength="40" />
      </div>
      <div class="profile-row profile-row-stack profile-handle-row">
        <span class="profile-label">${textMap.accountHandle}</span>
        <div class="profile-handle-control">
          <span class="profile-handle-prefix">@</span>
          <input class="profile-input profile-handle-input" id="profile-handle" type="text" maxlength="30" autocomplete="off" spellcheck="false" />
        </div>
        <span class="profile-handle-status" id="profile-handle-status" aria-live="polite"></span>
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.company}</span>
        <input class="profile-input" id="profile-company" type="text" maxlength="60" />
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.email}</span>
        <span class="profile-value" id="profile-email">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.createdAt}</span>
        <span class="profile-value" id="profile-created">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">UID</span>
        <span class="profile-value" id="profile-uid">-</span>
      </div>
      <div class="profile-form-actions">
        <button class="profile-save-btn" id="profile-account-save" type="button" disabled>${textMap.save}</button>
        <span class="profile-save-status" id="profile-account-save-status" aria-live="polite"></span>
      </div>
    `;
  }

  if (storageBody) {
    storageBody.innerHTML = `
      <div class="profile-storage">
        <div class="profile-storage-head">
          <span class="profile-label">${textMap.storageUsed}</span>
          <span class="profile-value" id="profile-storage-total">${textMap.storageLoading}</span>
        </div>
        <div class="profile-storage-bar" aria-label="${textMap.storage}">
          <span id="profile-storage-fill" style="width: 0%"></span>
        </div>
        <div class="profile-storage-meta">
          <span id="profile-storage-percent">0%</span>
          <span>${textMap.storageLimit}: ${formatBytes(STORAGE_LIMIT_BYTES)}</span>
        </div>
        <div class="profile-storage-breakdown">
          <div class="profile-row">
            <span class="profile-label">${textMap.storageDocuments}</span>
            <span class="profile-value" id="profile-storage-documents">-</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">${textMap.storageQr}</span>
            <span class="profile-value" id="profile-storage-qr">-</span>
          </div>
        </div>
        <div class="profile-storage-note" id="profile-storage-note"></div>
      </div>
    `;
  }

  if (prefsBody) {
    prefsBody.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">${textMap.language}</span>
        <div class="profile-theme-options" role="radiogroup" aria-label="${textMap.language}">
          <label class="profile-theme-option">
            <input type="radio" name="profile-language" value="es" />
            <span>${textMap.spanish}</span>
          </label>
          <label class="profile-theme-option">
            <input type="radio" name="profile-language" value="en" />
            <span>${textMap.english}</span>
          </label>
        </div>
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.theme}</span>
        <div class="profile-theme-options" role="radiogroup" aria-label="${textMap.theme}">
          <label class="profile-theme-option">
            <input type="radio" name="profile-theme" value="light" />
            <span>${textMap.light}</span>
          </label>
          <label class="profile-theme-option">
            <input type="radio" name="profile-theme" value="dark" />
            <span>${textMap.dark}</span>
          </label>
        </div>
      </div>
      <div class="profile-row profile-row-stack">
        <span class="profile-label">${textMap.tabOrder}</span>
        <div class="profile-tab-order" id="profile-tab-order"></div>
      </div>
      <div class="profile-form-actions">
        <button class="profile-save-btn" id="profile-preferences-save" type="button" disabled>${textMap.save}</button>
        <span class="profile-save-status" id="profile-preferences-save-status" aria-live="polite"></span>
      </div>
    `;
  }

  if (notificationsBody) {
    notificationsBody.innerHTML = `
      <div class="profile-row profile-notification-row">
        <div>
          <span class="profile-label">${textMap.emailNotifications}</span>
          <span class="profile-notification-hint">${textMap.emailNotificationsHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-email-enabled">
          <input id="profile-notification-email-enabled" type="checkbox" role="switch" disabled />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-row profile-notification-row" data-email-notification-event>
        <div>
          <span class="profile-label">${textMap.machineOutOfService}</span>
          <span class="profile-notification-hint">${textMap.machineOutOfServiceHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-machine-out-of-service">
          <input id="profile-notification-machine-out-of-service" type="checkbox" role="switch" disabled />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-row profile-notification-row" data-email-notification-event>
        <div>
          <span class="profile-label">${textMap.machineOperationalAgain}</span>
          <span class="profile-notification-hint">${textMap.machineOperationalAgainHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-machine-operational-again">
          <input id="profile-notification-machine-operational-again" type="checkbox" role="switch" disabled />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-row profile-notification-row" data-personal-notification-scope>
        <div>
          <span class="profile-label">${textMap.receiveOwnedNotifications}</span>
          <span class="profile-notification-hint">${textMap.receiveOwnedNotificationsHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-receive-owned">
          <input id="profile-notification-receive-owned" type="checkbox" role="switch" />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-row profile-notification-row">
        <div>
          <span class="profile-label">${textMap.notifyEquipmentAdmins}</span>
          <span class="profile-notification-hint">${textMap.notifyEquipmentAdminsHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-notify-admins">
          <input id="profile-notification-notify-admins" type="checkbox" role="switch" />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-row profile-notification-row" data-personal-notification-scope>
        <div>
          <span class="profile-label">${textMap.receiveAdministeredNotifications}</span>
          <span class="profile-notification-hint">${textMap.receiveAdministeredNotificationsHint}</span>
        </div>
        <label class="profile-toggle" for="profile-notification-receive-administered">
          <input id="profile-notification-receive-administered" type="checkbox" role="switch" />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="profile-form-actions">
        <button class="profile-save-btn" id="profile-notifications-save" type="button" disabled>${textMap.save}</button>
        <span class="profile-save-status" id="profile-notifications-save-status" aria-live="polite"></span>
      </div>
    `;
  }

  if (activityBody) {
    activityBody.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">${textMap.ownMachines}</span>
        <span class="profile-value" id="profile-owner-count">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">${textMap.adminMachines}</span>
        <span class="profile-value" id="profile-admin-count">-</span>
      </div>
    `;
  }

  if (securityBody) {
    securityBody.innerHTML = `
      <div class="profile-row profile-row-stack profile-password-row" id="profile-password-row" hidden>
        <span class="profile-label">${textMap.changePassword}</span>
        <input class="profile-input" id="profile-current-password" type="password" autocomplete="current-password" placeholder="${textMap.currentPassword}" />
        <input class="profile-input" id="profile-new-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="${textMap.newPassword}" />
        <input class="profile-input" id="profile-confirm-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="${textMap.confirmPassword}" />
        <div class="profile-form-actions"><button class="profile-save-btn" id="profile-change-password" type="button" disabled>${textMap.changePassword}</button></div>
      </div>
      <div class="profile-row profile-row-stack">
        <span class="profile-label">${textMap.changeEmail}</span>
        <input class="profile-input" id="profile-new-email" type="email" maxlength="320" autocomplete="email" placeholder="${textMap.newEmail}" />
        <div class="profile-form-actions"><button class="profile-save-btn" id="profile-change-email" type="button" disabled>${textMap.changeEmail}</button></div>
      </div>
      <span class="profile-save-status" id="profile-security-status" aria-live="polite"></span>
      <div class="profile-row">
        <a class="profile-link" id="profile-logout" href="#">${textMap.logout}</a>
      </div>
    `;
  }

  wrap.querySelectorAll(".profile-card-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => toggleCard(toggle.closest(".profile-card")));
  });

  const nameInput = accountBody?.querySelector("#profile-name");
  const avatarPreview = accountBody?.querySelector("#profile-avatar-preview");
  const avatarInput = accountBody?.querySelector("#profile-avatar-input");
  const avatarRemove = accountBody?.querySelector("#profile-avatar-remove");
  const handleInput = accountBody?.querySelector("#profile-handle");
  const handleStatus = accountBody?.querySelector("#profile-handle-status");
  const accountSave = accountBody?.querySelector("#profile-account-save");
  const accountSaveStatus = accountBody?.querySelector("#profile-account-save-status");
  const companyInput = accountBody?.querySelector("#profile-company");
  const emailEl = accountBody?.querySelector("#profile-email");
  const createdEl = accountBody?.querySelector("#profile-created");
  const uidEl = accountBody?.querySelector("#profile-uid");
  const ownerCountEl = activityBody?.querySelector("#profile-owner-count");
  const adminCountEl = activityBody?.querySelector("#profile-admin-count");
  const storageTotalEl = storageBody?.querySelector("#profile-storage-total");
  const storageFillEl = storageBody?.querySelector("#profile-storage-fill");
  const storagePercentEl = storageBody?.querySelector("#profile-storage-percent");
  const storageDocumentsEl = storageBody?.querySelector("#profile-storage-documents");
  const storageQrEl = storageBody?.querySelector("#profile-storage-qr");
  const storageNoteEl = storageBody?.querySelector("#profile-storage-note");
  const logoutLink = securityBody?.querySelector("#profile-logout");
  const currentPasswordInput = securityBody?.querySelector("#profile-current-password");
  const passwordRow = securityBody?.querySelector("#profile-password-row");
  const newPasswordInput = securityBody?.querySelector("#profile-new-password");
  const confirmPasswordInput = securityBody?.querySelector("#profile-confirm-password");
  const changePasswordButton = securityBody?.querySelector("#profile-change-password");
  const newEmailInput = securityBody?.querySelector("#profile-new-email");
  const changeEmailButton = securityBody?.querySelector("#profile-change-email");
  const securityStatus = securityBody?.querySelector("#profile-security-status");
  const tabOrderEl = prefsBody?.querySelector("#profile-tab-order");
  const notificationEmailEnabled = notificationsBody?.querySelector("#profile-notification-email-enabled");
  const notificationMachineOutOfService = notificationsBody?.querySelector("#profile-notification-machine-out-of-service");
  const notificationMachineOperationalAgain = notificationsBody?.querySelector("#profile-notification-machine-operational-again");
  const notificationEventRows = notificationsBody?.querySelectorAll("[data-email-notification-event]");
  const notificationReceiveOwned = notificationsBody?.querySelector("#profile-notification-receive-owned");
  const notificationNotifyAdmins = notificationsBody?.querySelector("#profile-notification-notify-admins");
  const notificationReceiveAdministered = notificationsBody?.querySelector("#profile-notification-receive-administered");
  const notificationPersonalScopeRows = notificationsBody?.querySelectorAll("[data-personal-notification-scope]");
  const notificationScopeSwitches = [
    notificationReceiveOwned,
    notificationNotifyAdmins,
    notificationReceiveAdministered
  ].filter(Boolean);
  const notificationsSave = notificationsBody?.querySelector("#profile-notifications-save");
  const notificationsSaveStatus = notificationsBody?.querySelector("#profile-notifications-save-status");
  const preferencesSave = prefsBody?.querySelector("#profile-preferences-save");
  const preferencesSaveStatus = prefsBody?.querySelector("#profile-preferences-save-status");
  const languageInputs = prefsBody?.querySelectorAll(
    "input[name=\"profile-language\"]"
  );

  let hasTabOrderChanges = () => false;
  let markTabOrderSaved = () => {};
  let savedPreferenceTheme = "";
  let preferencesReady = false;
  let notificationPreferences = null;
  let savedNotificationPreferences = null;
  let notificationsReady = false;
  let notificationsSaving = false;
  const readNotificationPreferences = () => ({
    email: {
      enabled: !!notificationEmailEnabled?.checked,
      receiveOwnedMachines: !!notificationReceiveOwned?.checked,
      notifyAdministrators: !!notificationNotifyAdmins?.checked,
      receiveAdministeredMachines: !!notificationReceiveAdministered?.checked,
      events: {
        machineOutOfService: !!notificationMachineOutOfService?.checked,
        machineOperationalAgain: !!notificationMachineOperationalAgain?.checked
      }
    }
  });
  const notificationPreferencesChanged = () =>
    JSON.stringify(readNotificationPreferences()) !== JSON.stringify(savedNotificationPreferences);
  const refreshNotificationsSave = () => {
    if (!notificationsSave) return;
    notificationsSave.disabled = !notificationsReady ||
      notificationsSaving ||
      !notificationPreferencesChanged();
  };
  const updateNotificationEventAvailability = () => {
    const enabled = !!notificationEmailEnabled?.checked;
    if (notificationEmailEnabled) {
      notificationEmailEnabled.disabled = !notificationsReady || notificationsSaving;
    }
    [notificationMachineOutOfService, notificationMachineOperationalAgain].forEach((input) => {
      if (input) input.disabled = !notificationsReady || notificationsSaving || !enabled;
    });
    [notificationReceiveOwned, notificationReceiveAdministered].forEach((input) => {
      if (input) input.disabled = !notificationsReady || notificationsSaving || !enabled;
    });
    if (notificationNotifyAdmins) {
      notificationNotifyAdmins.disabled = !notificationsReady || notificationsSaving;
    }
    notificationEventRows?.forEach((row) => row.classList.toggle("is-disabled", !enabled));
    notificationPersonalScopeRows?.forEach((row) => row.classList.toggle("is-disabled", !enabled));
  };
  const refreshPreferencesSave = () => {
    if (!preferencesSave) return;
    if (!preferencesReady) {
      preferencesSave.disabled = true;
      return;
    }
    const selectedTheme = prefsBody?.querySelector(
      'input[name="profile-theme"]:checked'
    )?.value || "";
    const selectedLanguage = prefsBody?.querySelector(
      'input[name="profile-language"]:checked'
    )?.value || currentLang;
    preferencesSave.disabled = !(
      hasTabOrderChanges() ||
      selectedTheme !== savedPreferenceTheme ||
      selectedLanguage !== currentLang
    );
  };

  if (languageInputs && languageInputs.length) {
    languageInputs.forEach((input) => {
      input.checked = input.value === currentLang;
      input.addEventListener("change", refreshPreferencesSave);
    });
  }

  const setText = (el, value) => {
    if (!el) return;
    el.textContent = value;
  };

  const loadCounts = async (uid) => {
    setTopbarLogoLoading("settings-counts", true);
    try {
      const snap = await getDocs(collection(db, `tenants/${uid}/machines`));
      setText(ownerCountEl, String(snap.size));
    } catch {
      setText(ownerCountEl, "0");
    }

    try {
      const links = await fetchLinksForAdmin(uid, "accepted");
      setText(adminCountEl, String(links.length));
    } catch {
      setText(adminCountEl, "0");
    } finally {
      setTopbarLogoLoading("settings-counts", false);
    }
  };

  const loadStorageUsage = async (uid) => {
    if (!storageBody) return;
    setTopbarLogoLoading("settings-storage", true);
    setText(storageTotalEl, textMap.storageLoading);
    setText(storageDocumentsEl, "-");
    setText(storageQrEl, "-");
    setText(storagePercentEl, "0%");
    if (storageFillEl) storageFillEl.style.width = "0%";
    setText(storageNoteEl, "");
    try {
      const usage = await calculateStorageUsage(uid);
      const percentText = `${usage.percent.toFixed(1)}%`;
      setText(storageTotalEl, `${formatBytes(usage.totalBytes)} / ${formatBytes(usage.limitBytes)}`);
      setText(storageDocumentsEl, formatBytes(usage.documentsBytes));
      setText(storageQrEl, formatBytes(usage.qrBytes));
      setText(storagePercentEl, percentText);
      if (storageFillEl) storageFillEl.style.width = `${usage.percent}%`;
      setText(storageNoteEl, usage.estimated ? textMap.storageEstimated : "");
      setTopbarNotifications(
        usage.totalBytes >= usage.limitBytes
          ? [{ id: "storage-full", persistent: true, text: textMap.storageFullNotification }]
          : []
      );
    } catch {
      setText(storageTotalEl, textMap.storageError);
      if (storageNoteEl) storageNoteEl.dataset.state = "error";
    } finally {
      setTopbarLogoLoading("settings-storage", false);
    }
  };

  let saveTabOrderPreference = async () => {};
  const initTabOrderPreferences = async (uid) => {
    if (!tabOrderEl) return;
    let layout = null;
    let tabOrder = normalizeTabOrder();
    let savedTabOrder = [...tabOrder];
    hasTabOrderChanges = () =>
      tabOrder.join(",") !== savedTabOrder.join(",");
    markTabOrderSaved = () => {
      savedTabOrder = [...tabOrder];
    };

    const saveTabOrder = async () => {
      layout = {
        ...(layout || {}),
        tabOrder
      };
      await upsertDashboardLayout(uid, layout);
    };
    saveTabOrderPreference = saveTabOrder;

    const renderTabOrder = () => {
      tabOrderEl.innerHTML = "";
      tabOrder.forEach((tabId, index) => {
        const row = document.createElement("div");
        row.className = "profile-tab-order-row";
        const label = document.createElement("span");
        label.className = "profile-tab-order-label";
        label.textContent = tabLabels[tabId] || tabId;

        const actions = document.createElement("div");
        actions.className = "profile-tab-order-actions";

        const up = document.createElement("button");
        up.type = "button";
        up.className = "profile-mini-btn";
        up.textContent = textMap.moveUp;
        up.disabled = index === 0;
        up.addEventListener("click", () => {
          if (index === 0) return;
          [tabOrder[index - 1], tabOrder[index]] = [tabOrder[index], tabOrder[index - 1]];
          renderTabOrder();
          refreshPreferencesSave();
        });

        const down = document.createElement("button");
        down.type = "button";
        down.className = "profile-mini-btn";
        down.textContent = textMap.moveDown;
        down.disabled = index === tabOrder.length - 1;
        down.addEventListener("click", () => {
          if (index >= tabOrder.length - 1) return;
          [tabOrder[index + 1], tabOrder[index]] = [tabOrder[index], tabOrder[index + 1]];
          renderTabOrder();
          refreshPreferencesSave();
        });

        actions.appendChild(up);
        actions.appendChild(down);
        row.appendChild(label);
        row.appendChild(actions);
        tabOrderEl.appendChild(row);
      });
    };

    try {
      layout = await fetchDashboardLayout(uid);
      tabOrder = normalizeTabOrder(layout?.tabOrder);
    } catch {
      layout = null;
      tabOrder = normalizeTabOrder();
    }
    savedTabOrder = [...tabOrder];
    renderTabOrder();
    refreshPreferencesSave();
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = localizeEsPath("/es/auth/login.html");
      return;
    }
    let profile = {};
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = `${appBasePrefix || ""}/?setup=1`;
        return;
      }
      if (isAccountOnboardingRequired(registration)) {
        window.location.replace(`${appBasePrefix || ""}/${currentLang}/onboarding.html`);
        return;
      }
      profile = registration.profile || {};
    } catch {
      window.location.href = `${appBasePrefix || ""}/?setup=1`;
      return;
    }

    const displayName = user.displayName || user.email || textMap.user;
    if (nameInput) nameInput.value = displayName;
    if (companyInput) {
      companyInput.value = (profile.company || profile.companyName || "").toString();
    }
    setText(emailEl, user.email || "-");
    if (createdEl) {
      const created = user.metadata?.creationTime
        ? new Date(user.metadata.creationTime)
        : null;
      setText(
        createdEl,
        created ? created.toLocaleDateString(textMap.createdLocale) : "-"
      );
    }
    setText(uidEl, user.uid || "-");

    const renderAvatar = (photoURL = user.photoURL || "") => {
      if (!avatarPreview) return;
      avatarPreview.replaceChildren();
      if (photoURL) {
        const image = document.createElement("img");
        image.src = photoURL;
        image.alt = "";
        image.addEventListener("error", () => renderAvatar(""), { once: true });
        avatarPreview.appendChild(image);
      } else {
        avatarPreview.textContent = profileInitials(user.displayName, user.email || textMap.user);
      }
      if (avatarRemove) avatarRemove.hidden = !photoURL;
    };
    renderAvatar();

    const setAvatarBusy = (busy) => {
      if (avatarInput) avatarInput.disabled = busy;
      if (avatarRemove) avatarRemove.disabled = busy;
    };
    const saveAvatarUrl = async (photoURL) => {
      await updateProfile(user, { photoURL });
      await setDoc(doc(db, "users", user.uid), {
        photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });
    };
    avatarInput?.addEventListener("change", async () => {
      const file = avatarInput.files?.[0];
      avatarInput.value = "";
      if (!file) return;
      if (!PROFILE_AVATAR_TYPES.has(file.type) || file.size > PROFILE_AVATAR_MAX_INPUT_BYTES) {
        if (accountSaveStatus) accountSaveStatus.textContent = textMap.profilePhotoError;
        return;
      }
      setAvatarBusy(true);
      setTopbarSaveStatus(textMap.saving);
      if (accountSaveStatus) accountSaveStatus.textContent = "";
      try {
        const blob = await createProfileAvatarBlob(file);
        const avatarRef = ref(storage, PROFILE_AVATAR_PATH(user.uid));
        await uploadBytes(avatarRef, blob, { contentType: "image/webp" });
        const downloadURL = await getDownloadURL(avatarRef);
        const photoURL = `${downloadURL}&v=${Date.now()}`;
        await saveAvatarUrl(photoURL);
        renderAvatar(photoURL);
        window.dispatchEvent(new CustomEvent("unatomo:profile-photo-updated"));
        if (accountSaveStatus) accountSaveStatus.textContent = textMap.saved;
      } catch {
        if (accountSaveStatus) accountSaveStatus.textContent = textMap.profilePhotoSaveError;
      } finally {
        setAvatarBusy(false);
        setTopbarSaveStatus("");
      }
    });
    avatarRemove?.addEventListener("click", async () => {
      setAvatarBusy(true);
      setTopbarSaveStatus(textMap.saving);
      if (accountSaveStatus) accountSaveStatus.textContent = "";
      try {
        await deleteObject(ref(storage, PROFILE_AVATAR_PATH(user.uid))).catch((error) => {
          if (error?.code !== "storage/object-not-found") throw error;
        });
        await saveAvatarUrl(null);
        renderAvatar("");
        window.dispatchEvent(new CustomEvent("unatomo:profile-photo-updated"));
        if (accountSaveStatus) accountSaveStatus.textContent = textMap.saved;
      } catch {
        if (accountSaveStatus) accountSaveStatus.textContent = textMap.profilePhotoSaveError;
      } finally {
        setAvatarBusy(false);
        setTopbarSaveStatus("");
      }
    });

    let savedName = (user.displayName || "").trim();
    let savedCompany = (profile.company || profile.companyName || "").toString().trim();
    let handleTouched = false;
    const setHandleStatus = (message = "", state = "") => {
      setText(handleStatus, message);
      if (!handleStatus) return;
      if (state) handleStatus.dataset.state = state;
      else handleStatus.removeAttribute("data-state");
    };
    let savedHandle = normalizeAccountHandle(profile.accountHandle);
    if (handleInput && accountSave) {
      const suggestedHandle = normalizeAccountHandle(
        (user.email || "").split("@")[0]
      );
      let checkTimer = 0;
      let checkedHandle = "";
      let isAvailable = false;
      handleInput.value = savedHandle || suggestedHandle;
      const refreshAccountSave = () => {
        const nextName = nameInput?.value.trim() || "";
        const nextCompany = companyInput?.value.trim().replace(/\s+/g, " ").slice(0, 60) || "";
        const handle = normalizeAccountHandle(handleInput.value);
        const handleChanged = handleTouched && handle !== savedHandle;
        const handleReady = !handleChanged || (isAvailable && checkedHandle === handle);
        accountSave.disabled = !(nextName && handleReady && (
          nextName !== savedName ||
          nextCompany !== savedCompany ||
          handleChanged
        ));
      };
      const renderAvailability = async () => {
        const handle = normalizeAccountHandle(handleInput.value);
        handleInput.value = handle;
        checkedHandle = "";
        isAvailable = false;
        if (!handle || handle === savedHandle) {
          setHandleStatus("");
          refreshAccountSave();
          return;
        }
        setHandleStatus(textMap.accountHandleChecking);
        const requestedHandle = handle;
        try {
          const result = await checkAccountHandleAvailability(handle);
          if (normalizeAccountHandle(handleInput.value) !== requestedHandle) return;
          checkedHandle = requestedHandle;
          isAvailable = result.valid === true && result.available === true;
          if (isAvailable) {
            setHandleStatus(textMap.accountHandleAvailable, "ok");
          } else if (result.reason === "handle-reserved") {
            setHandleStatus(textMap.accountHandleReserved, "error");
          } else if (result.reason === "handle-taken") {
            setHandleStatus(textMap.accountHandleTaken, "error");
          } else {
            setHandleStatus(textMap.accountHandleInvalid, "error");
          }
        } catch {
          setHandleStatus(textMap.accountHandleError, "error");
        }
        refreshAccountSave();
      };
      handleInput.addEventListener("input", () => {
        handleTouched = true;
        handleInput.value = normalizeAccountHandle(handleInput.value)
          .replace(/[^a-z0-9._-]/g, "")
          .slice(0, 30);
        window.clearTimeout(checkTimer);
        refreshAccountSave();
        checkTimer = window.setTimeout(renderAvailability, 280);
      });
      nameInput?.addEventListener("input", refreshAccountSave);
      companyInput?.addEventListener("input", refreshAccountSave);
      accountSave.addEventListener("click", async () => {
        const nextName = nameInput?.value.trim() || "";
        const nextCompany = companyInput?.value.trim().replace(/\s+/g, " ").slice(0, 60) || "";
        const previousCompany = savedCompany;
        const handle = normalizeAccountHandle(handleInput.value);
        if (!nextName) {
          nameInput?.focus();
          return;
        }
        const handleChanged = handleTouched && handle !== savedHandle;
        if (handleChanged && (!isAvailable || checkedHandle !== handle)) {
          await renderAvailability();
          if (!isAvailable || checkedHandle !== handle) return;
        }
        if (handleChanged) {
          const confirmation = savedHandle
            ? textMap.accountHandleChangeConfirm(handle)
            : textMap.accountHandleConfirm(handle);
          if (!window.confirm(confirmation)) return;
        }
        accountSave.disabled = true;
        setTopbarSaveStatus(textMap.saving);
        if (accountSaveStatus) accountSaveStatus.textContent = "";
        try {
          if (nextName !== savedName) {
            await updateProfile(user, { displayName: nextName });
            savedName = nextName;
          }
          if (nextCompany !== previousCompany) {
            await setDoc(
              doc(db, "users", user.uid),
              { company: nextCompany, updatedAt: serverTimestamp() },
              { merge: true }
            );
            profile = { ...profile, company: nextCompany };
            savedCompany = nextCompany;
          }
          if (handleChanged) {
            setHandleStatus(textMap.accountHandleSaving);
            const result = savedHandle
              ? await changeAccountHandle(handle)
              : await claimAccountHandle(handle);
            savedHandle = normalizeAccountHandle(result.handle || handle);
            profile = { ...profile, accountHandle: savedHandle };
            handleInput.value = savedHandle;
            handleTouched = false;
            setHandleStatus("");
          }
          await upsertAccountDirectory({ ...user, company: nextCompany });
          if (accountSaveStatus) accountSaveStatus.textContent = textMap.saved;
        } catch (error) {
          const message = (error?.message || "").toString();
          if (message.includes("handle-taken")) {
            setHandleStatus(textMap.accountHandleTaken, "error");
          } else if (message.includes("handle-reserved")) {
            setHandleStatus(textMap.accountHandleReserved, "error");
          } else if (message.includes("handle-change-cooldown")) {
            setHandleStatus(textMap.accountHandleCooldown, "error");
          } else {
            if (accountSaveStatus) accountSaveStatus.textContent = textMap.saveError;
          }
          isAvailable = false;
          checkedHandle = "";
        } finally {
          refreshAccountSave();
          setTopbarSaveStatus("");
        }
      });
      if (!savedHandle) renderAvailability();
      refreshAccountSave();
    }

    await Promise.all([
      loadCounts(user.uid),
      loadStorageUsage(user.uid),
      initTabOrderPreferences(user.uid),
      (async () => {
        try {
          notificationPreferences = await fetchNotificationPreferences(user.uid);
        } catch {
          notificationPreferences = normalizeNotificationPreferences();
        }
        savedNotificationPreferences = notificationPreferences;
        if (notificationEmailEnabled) notificationEmailEnabled.checked = notificationPreferences.email.enabled;
        if (notificationMachineOutOfService) notificationMachineOutOfService.checked = notificationPreferences.email.events.machineOutOfService;
        if (notificationMachineOperationalAgain) notificationMachineOperationalAgain.checked = notificationPreferences.email.events.machineOperationalAgain;
        if (notificationReceiveOwned) notificationReceiveOwned.checked = notificationPreferences.email.receiveOwnedMachines;
        if (notificationNotifyAdmins) notificationNotifyAdmins.checked = notificationPreferences.email.notifyAdministrators;
        if (notificationReceiveAdministered) notificationReceiveAdministered.checked = notificationPreferences.email.receiveAdministeredMachines;
        notificationsReady = true;
        updateNotificationEventAvailability();
        refreshNotificationsSave();
      })()
    ]);
    setTopbarLogoLoading("settings", false);
    upsertAccountDirectory(user).catch(() => {});

    const setSecurityStatus = (message = "", state = "") => {
      if (!securityStatus) return;
      securityStatus.textContent = message;
      if (state) securityStatus.dataset.state = state;
      else securityStatus.removeAttribute("data-state");
    };
    const tokenResult = await user.getIdTokenResult();
    const signInProvider = tokenResult.signInProvider || "";
    const usesGoogle = signInProvider === "google.com";
    const signedInWithPassword = signInProvider === "password";
    const isSuperadmin = await isControlPanelUser(user);
    const showPasswordRow = signedInWithPassword || isSuperadmin;
    if (passwordRow) {
      passwordRow.hidden = !showPasswordRow;
      passwordRow.classList.toggle(
        "is-superadmin-preview",
        isSuperadmin && !signedInWithPassword
      );
    }
    [currentPasswordInput, newPasswordInput, confirmPasswordInput]
      .forEach((input) => {
        if (input) input.disabled = !signedInWithPassword;
      });
    let securityActionPending = false;
    const hasReauthenticationInput = () =>
      usesGoogle || !!currentPasswordInput?.value;
    const refreshSecurityActions = () => {
      const password = newPasswordInput?.value || "";
      const confirmation = confirmPasswordInput?.value || "";
      const newEmail = newEmailInput?.value.trim().toLowerCase() || "";
      const currentEmail = (user.email || "").trim().toLowerCase();
      const canChangeCredentials = user.emailVerified && !securityActionPending;
      if (changePasswordButton) {
        changePasswordButton.disabled = !(
          canChangeCredentials &&
          signedInWithPassword &&
          hasReauthenticationInput() &&
          password.length >= 8 &&
          password === confirmation
        );
      }
      if (changeEmailButton) {
        changeEmailButton.disabled = !(
          canChangeCredentials &&
          hasReauthenticationInput() &&
          !!newEmail &&
          newEmail !== currentEmail &&
          newEmailInput?.checkValidity()
        );
      }
    };
    [currentPasswordInput, newPasswordInput, confirmPasswordInput, newEmailInput]
      .forEach((input) => input?.addEventListener("input", refreshSecurityActions));
    refreshSecurityActions();
    const reauthenticateAccount = async () => {
      if (usesGoogle) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
        return;
      }
      const currentPassword = currentPasswordInput?.value || "";
      if (!user.email || !currentPassword) {
        currentPasswordInput?.focus();
        throw new Error("current-password-required");
      }
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, currentPassword)
      );
    };

    try {
      await user.getIdToken(true);
      const finalized = await finalizeAccountEmailChange();
      if (finalized.completed) {
        setText(emailEl, finalized.email || user.email || "-");
        setSecurityStatus(textMap.emailChangeCompleted, "ok");
      }
    } catch {}

    changePasswordButton?.addEventListener("click", async () => {
      if (!user.emailVerified) {
        setSecurityStatus(textMap.verificationRequired, "error");
        return;
      }
      const password = newPasswordInput?.value || "";
      const confirmation = confirmPasswordInput?.value || "";
      if (password.length < 8) {
        setSecurityStatus(textMap.passwordRequirements, "error");
        newPasswordInput?.focus();
        return;
      }
      if (password !== confirmation) {
        setSecurityStatus(textMap.passwordMismatch, "error");
        confirmPasswordInput?.focus();
        return;
      }
      securityActionPending = true;
      refreshSecurityActions();
      setSecurityStatus(textMap.saving);
      try {
        await reauthenticateAccount();
        await user.getIdToken(true);
        await changeAccountPassword(password);
        if (currentPasswordInput) currentPasswordInput.value = "";
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
        setSecurityStatus(textMap.passwordChanged, "ok");
      } catch {
        setSecurityStatus(textMap.securityActionError, "error");
      } finally {
        securityActionPending = false;
        refreshSecurityActions();
      }
    });

    changeEmailButton?.addEventListener("click", async () => {
      if (!user.emailVerified) {
        setSecurityStatus(textMap.verificationRequired, "error");
        return;
      }
      const newEmail = newEmailInput?.value.trim().toLowerCase() || "";
      if (!newEmailInput?.checkValidity() || !newEmail) {
        newEmailInput?.focus();
        return;
      }
      securityActionPending = true;
      refreshSecurityActions();
      setSecurityStatus(textMap.saving);
      try {
        await reauthenticateAccount();
        await user.getIdToken(true);
        await requestAccountEmailChange(newEmail);
        if (newEmailInput) newEmailInput.value = "";
        setSecurityStatus(textMap.emailChangeSent, "ok");
      } catch {
        setSecurityStatus(textMap.securityActionError, "error");
      } finally {
        securityActionPending = false;
        refreshSecurityActions();
      }
    });

    const themeInputs = prefsBody?.querySelectorAll(
      "input[name=\"profile-theme\"]"
    );
    if (themeInputs && themeInputs.length) {
      const root = document.documentElement;
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      let saved = null;
      try {
        saved = localStorage.getItem("theme");
      } catch {}
      const current =
        root.getAttribute("data-theme") ||
        saved ||
        (prefersDark ? "dark" : "light");
      themeInputs.forEach((input) => {
        input.checked = input.value === current;
        input.addEventListener("change", () => {
          if (!input.checked) return;
          root.setAttribute("data-theme", input.value);
          refreshPreferencesSave();
        });
      });
      savedPreferenceTheme = current;
      preferencesReady = true;
      refreshPreferencesSave();
    }

    if (preferencesSave) {
      preferencesSave.addEventListener("click", async () => {
        preferencesSave.disabled = true;
        setTopbarSaveStatus(textMap.saving);
        if (preferencesSaveStatus) preferencesSaveStatus.textContent = "";
        try {
          await saveTabOrderPreference();
          markTabOrderSaved();
          const selectedTheme = prefsBody?.querySelector(
            'input[name="profile-theme"]:checked'
          )?.value;
          if (selectedTheme) {
            try {
              localStorage.setItem("theme", selectedTheme);
            } catch {}
            savedPreferenceTheme = selectedTheme;
          }
          const selectedLanguage = prefsBody?.querySelector(
            'input[name="profile-language"]:checked'
          )?.value;
          if (selectedLanguage && selectedLanguage !== currentLang) {
            setSavedLang(selectedLanguage);
            window.location.href = getLocalizedHref(selectedLanguage);
            return;
          }
          if (preferencesSaveStatus) preferencesSaveStatus.textContent = textMap.saved;
        } catch {
          if (preferencesSaveStatus) preferencesSaveStatus.textContent = textMap.saveError;
        } finally {
          refreshPreferencesSave();
          setTopbarSaveStatus("");
        }
      });
    }

    [
      notificationEmailEnabled,
      notificationMachineOutOfService,
      notificationMachineOperationalAgain,
      ...notificationScopeSwitches
    ]
      .filter(Boolean)
      .forEach((input) => input.addEventListener("change", () => {
        updateNotificationEventAvailability();
        refreshNotificationsSave();
      }));
    notificationsSave?.addEventListener("click", async () => {
      if (!notificationsReady || notificationsSaving) return;
      notificationsSaving = true;
      updateNotificationEventAvailability();
      refreshNotificationsSave();
      setTopbarSaveStatus(textMap.saving);
      if (notificationsSaveStatus) notificationsSaveStatus.textContent = "";
      try {
        const next = readNotificationPreferences();
        await saveNotificationPreferences(user.uid, next);
        notificationPreferences = next;
        savedNotificationPreferences = next;
        if (notificationsSaveStatus) notificationsSaveStatus.textContent = textMap.saved;
      } catch {
        if (notificationsSaveStatus) notificationsSaveStatus.textContent = textMap.saveError;
      } finally {
        notificationsSaving = false;
        updateNotificationEventAvailability();
        refreshNotificationsSave();
        setTopbarSaveStatus("");
      }
    });

    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await auth.signOut();
        } finally {
          window.location.href = localizeEsPath("/es/index.html");
        }
      });
    }
  });
}
