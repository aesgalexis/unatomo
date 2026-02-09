import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db } from "/static/js/firebase/firebaseApp.js";
import { fetchLinksForAdmin } from "/static/js/dashboard/admin/adminLinksRepo.js";

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
  const wrap = document.createElement("div");
  wrap.className = "profile-wrap";

  const accountCard = createCard("Cuenta");
  const preferencesCard = createCard("Preferencias");
  const activityCard = createCard("Actividad");
  const securityCard = createCard("Seguridad");

  wrap.appendChild(accountCard);
  wrap.appendChild(preferencesCard);
  wrap.appendChild(activityCard);
  wrap.appendChild(securityCard);
  mount.appendChild(wrap);

  const accountBody = accountCard.querySelector(".profile-card-body");
  const prefsBody = preferencesCard.querySelector(".profile-card-body");
  const activityBody = activityCard.querySelector(".profile-card-body");
  const securityBody = securityCard.querySelector(".profile-card-body");

  if (accountBody) {
    accountBody.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">Nombre</span>
        <input class="profile-input" id="profile-name" type="text" maxlength="40" />
      </div>
      <div class="profile-row">
        <span class="profile-label">Correo electrónico</span>
        <span class="profile-value" id="profile-email">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Fecha de creación</span>
        <span class="profile-value" id="profile-created">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">UID</span>
        <span class="profile-value" id="profile-uid">-</span>
      </div>
    `;
  }

  if (prefsBody) {
    prefsBody.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">Tema</span>
        <div class="profile-theme-options" role="radiogroup" aria-label="Tema">
          <label class="profile-theme-option">
            <input type="radio" name="profile-theme" value="light" />
            <span>Claro</span>
          </label>
          <label class="profile-theme-option">
            <input type="radio" name="profile-theme" value="dark" />
            <span>Oscuro</span>
          </label>
        </div>
      </div>
    `;
  }

  if (activityBody) {
    activityBody.innerHTML = `
      <div class="profile-row">
        <span class="profile-label">Máquinas propias</span>
        <span class="profile-value" id="profile-owner-count">-</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Máquinas como administrador</span>
        <span class="profile-value" id="profile-admin-count">-</span>
      </div>
    `;
  }

  if (securityBody) {
    securityBody.innerHTML = `
      <div class="profile-row">
        <a class="profile-link" id="profile-reset" href="/es/auth/reset.html">Cambiar contraseña</a>
      </div>
      <div class="profile-row">
        <a class="profile-link" id="profile-logout" href="#">Cerrar sesión</a>
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
  const logoutLink = securityBody?.querySelector("#profile-logout");

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

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/es/auth/login.html";
      return;
    }

    const displayName = user.displayName || user.email || "Usuario";
    if (nameInput) nameInput.value = displayName;
    setText(emailEl, user.email || "-");
    if (createdEl) {
      const created = user.metadata?.creationTime
        ? new Date(user.metadata.creationTime)
        : null;
      setText(
        createdEl,
        created ? created.toLocaleDateString("es-ES") : "-"
      );
    }
    setText(uidEl, user.uid || "-");

    loadCounts(user.uid);

    if (nameInput) {
      nameInput.addEventListener("blur", async () => {
        const next = nameInput.value.trim();
        if (!next || next === user.displayName) return;
        try {
          await updateProfile(user, { displayName: next });
        } catch {
          nameInput.value = user.displayName || user.email || "Usuario";
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
          window.location.href = "/es/index.html";
        }
      });
    }
  });
}
