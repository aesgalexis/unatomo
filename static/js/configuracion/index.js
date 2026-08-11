import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  auth,
  db,
  getUserRegistrationState,
  isAccountOnboardingRequired
} from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { fetchDashboardLayout, upsertDashboardLayout } from "/static/js/dashboard/firestoreRepo.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import {
  setTopbarLogoLoading
} from "/static/js/topbar/loading-logo.js";
import { setTopbarSaveStatus } from "/static/js/topbar/save-status.js";
import { calculateStorageUsage, formatBytes, STORAGE_LIMIT_BYTES } from "./storageUsage.js";
import {
  checkAccountHandleAvailability,
  changeAccountHandle,
  claimAccountHandle,
  normalizeAccountHandle
} from "./accountHandleRepo.js";
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
  logout: isEn ? "Sign out" : "Cerrar sesi\u00f3n",
  user: isEn ? "User" : "Usuario",
  createdLocale: isEn ? "en-GB" : "es-ES",
};

const mount = document.getElementById("profile-mount");
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
  const storageCard = createCard(textMap.storage, sectionIconById.get("storage"));
  const activityCard = createCard(textMap.activity, sectionIconById.get("activity"));
  const securityCard = createCard(textMap.security, sectionIconById.get("security"));

  wrap.appendChild(accountCard);
  wrap.appendChild(preferencesCard);
  wrap.appendChild(storageCard);
  wrap.appendChild(activityCard);
  wrap.appendChild(securityCard);

  const sectionCards = new Map([
    ["account", accountCard],
    ["preferences", preferencesCard],
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
  const activityBody = activityCard.querySelector(".profile-card-body");
  const securityBody = securityCard.querySelector(".profile-card-body");

  if (accountBody) {
    accountBody.innerHTML = `
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
        <button class="profile-save-btn" id="profile-account-save" type="button">${textMap.save}</button>
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
        <button class="profile-save-btn" id="profile-preferences-save" type="button">${textMap.save}</button>
        <span class="profile-save-status" id="profile-preferences-save-status" aria-live="polite"></span>
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
      <div class="profile-row">
        <a class="profile-link" id="profile-reset" href="${localizeEsPath("/es/auth/reset.html")}">${textMap.changePassword}</a>
      </div>
      <div class="profile-row">
        <a class="profile-link" id="profile-logout" href="#">${textMap.logout}</a>
      </div>
    `;
  }

  wrap.querySelectorAll(".profile-card-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => toggleCard(toggle.closest(".profile-card")));
  });

  const nameInput = accountBody?.querySelector("#profile-name");
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
  const tabOrderEl = prefsBody?.querySelector("#profile-tab-order");
  const preferencesSave = prefsBody?.querySelector("#profile-preferences-save");
  const preferencesSaveStatus = prefsBody?.querySelector("#profile-preferences-save-status");
  const languageInputs = prefsBody?.querySelectorAll(
    "input[name=\"profile-language\"]"
  );

  if (languageInputs && languageInputs.length) {
    languageInputs.forEach((input) => {
      input.checked = input.value === currentLang;
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
    renderTabOrder();
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
      const renderAvailability = async () => {
        const handle = normalizeAccountHandle(handleInput.value);
        handleInput.value = handle;
        checkedHandle = "";
        isAvailable = false;
        if (!handle || handle === savedHandle) {
          setHandleStatus("");
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
      };
      handleInput.addEventListener("input", () => {
        handleInput.value = normalizeAccountHandle(handleInput.value)
          .replace(/[^a-z0-9._-]/g, "")
          .slice(0, 30);
        window.clearTimeout(checkTimer);
        checkTimer = window.setTimeout(renderAvailability, 280);
      });
      accountSave.addEventListener("click", async () => {
        const nextName = nameInput?.value.trim() || "";
        const nextCompany = companyInput?.value.trim().replace(/\s+/g, " ").slice(0, 60) || "";
        const previousCompany = (profile.company || profile.companyName || "").toString().trim();
        const handle = normalizeAccountHandle(handleInput.value);
        if (!nextName) {
          nameInput?.focus();
          return;
        }
        if (handle !== savedHandle && (!isAvailable || checkedHandle !== handle)) {
          await renderAvailability();
          if (!isAvailable || checkedHandle !== handle) return;
        }
        if (handle !== savedHandle) {
          const confirmation = savedHandle
            ? textMap.accountHandleChangeConfirm(handle)
            : textMap.accountHandleConfirm(handle);
          if (!window.confirm(confirmation)) return;
        }
        accountSave.disabled = true;
        setTopbarSaveStatus(textMap.saving);
        if (accountSaveStatus) accountSaveStatus.textContent = "";
        try {
          if (nextName !== user.displayName) {
            await updateProfile(user, { displayName: nextName });
          }
          if (nextCompany !== previousCompany) {
            await setDoc(
              doc(db, "users", user.uid),
              { company: nextCompany, updatedAt: serverTimestamp() },
              { merge: true }
            );
            profile = { ...profile, company: nextCompany };
          }
          if (handle !== savedHandle) {
            setHandleStatus(textMap.accountHandleSaving);
            const result = savedHandle
              ? await changeAccountHandle(handle)
              : await claimAccountHandle(handle);
            savedHandle = normalizeAccountHandle(result.handle || handle);
            profile = { ...profile, accountHandle: savedHandle };
            handleInput.value = savedHandle;
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
          accountSave.disabled = false;
          setTopbarSaveStatus("");
        }
      });
      if (!savedHandle) renderAvailability();
    }

    await Promise.all([
      loadCounts(user.uid),
      loadStorageUsage(user.uid),
      initTabOrderPreferences(user.uid)
    ]);
    setTopbarLogoLoading("settings", false);
    upsertAccountDirectory(user).catch(() => {});

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
        });
      });
    }

    if (preferencesSave) {
      preferencesSave.addEventListener("click", async () => {
        preferencesSave.disabled = true;
        setTopbarSaveStatus(textMap.saving);
        if (preferencesSaveStatus) preferencesSaveStatus.textContent = "";
        try {
          await saveTabOrderPreference();
          const selectedTheme = prefsBody?.querySelector(
            'input[name="profile-theme"]:checked'
          )?.value;
          if (selectedTheme) {
            try {
              localStorage.setItem("theme", selectedTheme);
            } catch {}
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
          preferencesSave.disabled = false;
          setTopbarSaveStatus("");
        }
      });
    }

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
