import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db, getUserRegistrationState } from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { setTopbarNotifications } from "/static/js/notifications/topbar-notifications.js";
import { calculateStorageUsage, formatBytes, STORAGE_LIMIT_BYTES } from "./storageUsage.js";
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
  email: isEn ? "Email" : "Correo electr\u00f3nico",
  createdAt: isEn ? "Created at" : "Fecha de creaci\u00f3n",
  theme: isEn ? "Theme" : "Tema",
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

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = localizeEsPath("/es/auth/login.html");
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = `${appBasePrefix || ""}/?setup=1`;
        return;
      }
    } catch {
      window.location.href = `${appBasePrefix || ""}/?setup=1`;
      return;
    }

    const displayName = user.displayName || user.email || textMap.user;
    if (nameInput) nameInput.value = displayName;
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

    loadCounts(user.uid);
    loadStorageUsage(user.uid);
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
