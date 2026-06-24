import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { fetchDashboardLayout, upsertDashboardLayout } from "/static/js/dashboard/firestoreRepo.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
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
const DEFAULT_TAB_ORDER = ["quehaceres", "historial", "general", "configuracion"];
const tabLabels = {
  quehaceres: textMap.tasksTab,
  general: textMap.generalTab,
  historial: textMap.historyTab,
  configuracion: textMap.settingsTab
};

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

const createCard = (title) => {
  const card = document.createElement("div");
  card.className = "profile-card";
  card.dataset.expanded = "false";
  card.innerHTML = `
    <button type="button" class="profile-card-toggle" aria-expanded="false">
      <span class="profile-card-title">${title}</span>
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
  const topbarTitle = document.getElementById("topbar-title");
  if (topbarTitle) topbarTitle.textContent = textMap.settings;
  document.title = `${textMap.settings} | unatomo`;

  const wrap = document.createElement("div");
  wrap.className = "profile-wrap";

  const languageCard = createCard(textMap.language);
  const accountCard = createCard(textMap.account);
  const storageCard = createCard(textMap.storage);
  const preferencesCard = createCard(textMap.preferences);
  const activityCard = createCard(textMap.activity);
  const securityCard = createCard(textMap.security);

  wrap.appendChild(languageCard);
  wrap.appendChild(accountCard);
  wrap.appendChild(storageCard);
  wrap.appendChild(preferencesCard);
  wrap.appendChild(activityCard);
  wrap.appendChild(securityCard);
  mount.appendChild(wrap);

  const languageBody = languageCard.querySelector(".profile-card-body");
  const accountBody = accountCard.querySelector(".profile-card-body");
  const storageBody = storageCard.querySelector(".profile-card-body");
  const prefsBody = preferencesCard.querySelector(".profile-card-body");
  const activityBody = activityCard.querySelector(".profile-card-body");
  const securityBody = securityCard.querySelector(".profile-card-body");

  if (languageBody) {
    languageBody.innerHTML = `
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
    `;
  }

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
          <button class="profile-mini-btn profile-handle-claim" id="profile-handle-claim" type="button">${textMap.accountHandleClaim}</button>
          <button class="profile-mini-btn" id="profile-handle-edit" type="button" hidden>${textMap.accountHandleChange}</button>
          <button class="profile-mini-btn" id="profile-handle-cancel" type="button" hidden>${textMap.accountHandleCancel}</button>
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
  const handleClaim = accountBody?.querySelector("#profile-handle-claim");
  const handleEdit = accountBody?.querySelector("#profile-handle-edit");
  const handleCancel = accountBody?.querySelector("#profile-handle-cancel");
  const handleStatus = accountBody?.querySelector("#profile-handle-status");
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
  const languageInputs = languageBody?.querySelectorAll(
    "input[name=\"profile-language\"]"
  );

  if (languageInputs && languageInputs.length) {
    languageInputs.forEach((input) => {
      input.checked = input.value === currentLang;
      input.addEventListener("change", () => {
        if (!input.checked || input.value === currentLang) return;
        setSavedLang(input.value);
        window.location.href = getLocalizedHref(input.value);
      });
    });
  }

  const setText = (el, value) => {
    if (!el) return;
    el.textContent = value;
  };

  const loadCounts = async (uid) => {
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
    }
  };

  const loadStorageUsage = async (uid) => {
    if (!storageBody) return;
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
    }
  };

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
        up.addEventListener("click", async () => {
          if (index === 0) return;
          [tabOrder[index - 1], tabOrder[index]] = [tabOrder[index], tabOrder[index - 1]];
          renderTabOrder();
          await saveTabOrder();
        });

        const down = document.createElement("button");
        down.type = "button";
        down.className = "profile-mini-btn";
        down.textContent = textMap.moveDown;
        down.disabled = index === tabOrder.length - 1;
        down.addEventListener("click", async () => {
          if (index >= tabOrder.length - 1) return;
          [tabOrder[index + 1], tabOrder[index]] = [tabOrder[index], tabOrder[index + 1]];
          renderTabOrder();
          await saveTabOrder();
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
    if (handleInput && handleClaim && handleEdit && handleCancel) {
      const suggestedHandle = normalizeAccountHandle(
        (user.email || "").split("@")[0]
      );
      let checkTimer = 0;
      let checkedHandle = "";
      let isAvailable = false;
      const lockHandle = (handle) => {
        savedHandle = handle;
        handleInput.value = handle;
        handleInput.disabled = true;
        handleClaim.hidden = true;
        handleCancel.hidden = true;
        handleEdit.hidden = false;
        setHandleStatus("");
      };
      const startEditing = () => {
        handleInput.disabled = false;
        handleInput.value = savedHandle || suggestedHandle;
        handleClaim.textContent = savedHandle
          ? textMap.accountHandleSave
          : textMap.accountHandleClaim;
        handleClaim.hidden = false;
        handleClaim.disabled = true;
        handleCancel.hidden = !savedHandle;
        handleEdit.hidden = true;
        checkedHandle = "";
        isAvailable = false;
        setHandleStatus("");
        handleInput.focus();
        handleInput.select();
      };
      const renderAvailability = async () => {
        const handle = normalizeAccountHandle(handleInput.value);
        handleInput.value = handle;
        checkedHandle = "";
        isAvailable = false;
        handleClaim.disabled = true;
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
          handleClaim.disabled = !isAvailable;
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
      handleEdit.addEventListener("click", startEditing);
      handleCancel.addEventListener("click", () => lockHandle(savedHandle));
      handleClaim.addEventListener("click", async () => {
        const handle = normalizeAccountHandle(handleInput.value);
        if (!isAvailable || checkedHandle !== handle) {
          await renderAvailability();
          return;
        }
        const confirmation = savedHandle
          ? textMap.accountHandleChangeConfirm(handle)
          : textMap.accountHandleConfirm(handle);
        if (!window.confirm(confirmation)) return;
        handleInput.disabled = true;
        handleClaim.disabled = true;
        setHandleStatus(textMap.accountHandleSaving);
        try {
          const result = savedHandle
            ? await changeAccountHandle(handle)
            : await claimAccountHandle(handle);
          const confirmedHandle = normalizeAccountHandle(result.handle || handle);
          profile = {...profile, accountHandle: confirmedHandle};
          lockHandle(confirmedHandle);
        } catch (error) {
          handleInput.disabled = false;
          const message = (error?.message || "").toString();
          if (message.includes("handle-taken")) {
            setHandleStatus(textMap.accountHandleTaken, "error");
          } else if (message.includes("handle-reserved")) {
            setHandleStatus(textMap.accountHandleReserved, "error");
          } else if (message.includes("handle-change-cooldown")) {
            setHandleStatus(textMap.accountHandleCooldown, "error");
          } else {
            setHandleStatus(textMap.accountHandleError, "error");
          }
          isAvailable = false;
          checkedHandle = "";
        }
      });
      if (savedHandle) lockHandle(savedHandle);
      else startEditing();
      if (!savedHandle) renderAvailability();
    }

    loadCounts(user.uid);
    loadStorageUsage(user.uid);
    initTabOrderPreferences(user.uid);
    upsertAccountDirectory(user).catch(() => {});

    if (nameInput) {
      nameInput.addEventListener("blur", async () => {
        const next = nameInput.value.trim();
        if (!next || next === user.displayName) return;
        try {
          await updateProfile(user, { displayName: next });
          await upsertAccountDirectory(user);
        } catch {
          nameInput.value = user.displayName || user.email || textMap.user;
        }
      });
    }

    if (companyInput) {
      companyInput.addEventListener("blur", async () => {
        const next = companyInput.value.trim().replace(/\s+/g, " ").slice(0, 60);
        const previous = (profile.company || profile.companyName || "").toString().trim();
        companyInput.value = next;
        if (next === previous) return;
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              company: next,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
          profile = { ...profile, company: next };
        } catch {
          companyInput.value = previous;
          return;
        }
        upsertAccountDirectory({ ...user, company: next }).catch(() => {});
      });
    }

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
          try {
            localStorage.setItem("theme", input.value);
          } catch {}
        });
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
