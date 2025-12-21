import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const btn = document.getElementById("session-menu-btn");
const menu = document.getElementById("session-menu");
const label = document.getElementById("session-menu-label");
const action = document.getElementById("session-menu-action");
const themeToggle = document.getElementById("theme-toggle");

if (!btn || !menu || !label || !action) {
} else {
  let state = "guest";

  function setLabel(text) {
    label.textContent = text;
  }

  function setGuest() {
    state = "guest";
    setLabel("Invitado");
    action.textContent = "Iniciar sesión";
  }

  function setUser(user) {
    state = "user";
    const t = user?.displayName || user?.email || "Usuario";
    setLabel(t);
    action.textContent = "Cerrar sesión";
  }

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  function syncSizeToThemeToggle() {
    if (!themeToggle) return;
    const r = themeToggle.getBoundingClientRect();
    if (r.width && r.height) {
      btn.style.width = `${r.width}px`;
      btn.style.height = `${r.height}px`;
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
    }
  }

  syncSizeToThemeToggle();
  window.addEventListener("resize", syncSizeToThemeToggle);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", () => closeMenu());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  action.addEventListener("click", async (e) => {
    e.preventDefault();

    if (state === "guest") {
      closeMenu();
      window.location.href = "/es/auth/login.html";
      return;
    }

    try {
      action.disabled = true;
      await signOut(auth);
      closeMenu();
      window.location.href = "/?setup=1";
    } catch {
      action.disabled = false;
    }
  });

  setGuest();
  onAuthStateChanged(auth, (user) => {
    if (user) setUser(user);
    else setGuest();
  });
}
