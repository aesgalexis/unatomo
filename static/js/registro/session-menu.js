import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requestInviteCodeAndRedirect } from "/static/js/registro/invite-gate.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";

const btn = document.getElementById("session-menu-btn");
const menu = document.getElementById("session-menu");
const label = document.getElementById("session-menu-label");
const profileLink = document.getElementById("session-menu-profile");
const action = document.getElementById("session-menu-action");
const registerBtn = document.getElementById("session-menu-register");

if (!btn || !menu || !label || !action) {
} else {
  let state = "guest";
  let currentUser = null;

  const FG = "var(--fg)";
  const ACCENT = "var(--accent)";

  function setAuthState(nextState) {
    state = nextState;
    document.documentElement.dataset.auth = state;
    window.dispatchEvent(new CustomEvent("unatomo:auth", { detail: { state } }));
  }

  function applyButtonColor() {
    btn.style.color = state === "user" ? ACCENT : FG;
  }

  function openMenu() {
    window.dispatchEvent(
      new CustomEvent("unatomo:topbar-open", { detail: { id: "session" } })
    );
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function setGuest() {
    setAuthState("guest");
    currentUser = null;
    if (label) {
      label.hidden = false;
      label.textContent = "Invitado";
    }
    if (profileLink) {
      profileLink.hidden = true;
      profileLink.textContent = "";
    }

    if (action) {
      action.textContent = "Iniciar sesión";
      action.setAttribute("href", "/es/auth/login.html");
      action.onclick = () => {
        closeMenu();
      };
    }

    if (registerBtn) {
      registerBtn.hidden = false;
      registerBtn.style.display = "";
      registerBtn.setAttribute("aria-hidden", "false");
      registerBtn.textContent = "Registrarse";
      registerBtn.setAttribute("href", "/es/auth/registro.html");
      registerBtn.onclick = (e) => {
        e.preventDefault();
        closeMenu();
        requestInviteCodeAndRedirect("/es/auth/registro.html");
      };
    }

    applyButtonColor();
  }

  function setUser(user) {
    setAuthState("user");
    currentUser = user;
    const name = (user.displayName || user.email || "Usuario").toString();
    if (label) {
      label.hidden = false;
      label.textContent = name;
    }
    if (profileLink) {
      profileLink.hidden = false;
      profileLink.textContent = "Configuración";
      profileLink.setAttribute("href", "/es/configuracion.html");
    }

    if (action) {
      action.textContent = "Cerrar sesión";
      action.setAttribute("href", "#");
      action.onclick = async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          closeMenu();
          window.location.href = "/es/index.html";
        } catch {
          // ignore
        }
      };
    }

    if (registerBtn) {
      registerBtn.hidden = true;
      registerBtn.style.display = "none";
      registerBtn.setAttribute("aria-hidden", "true");
      registerBtn.onclick = null;
    }

    applyButtonColor();
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  if (profileLink) {
    profileLink.addEventListener("click", (e) => {
      if (!currentUser) return;
      e.stopPropagation();
      closeMenu();
    });
  }

  window.addEventListener("unatomo:topbar-open", (e) => {
    if (e.detail && e.detail.id !== "session") closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  setGuest();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setUser(user);
      upsertAccountDirectory(user).catch(() => {});
    } else {
      setGuest();
    }
  });
}
