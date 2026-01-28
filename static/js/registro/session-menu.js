import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const btn = document.getElementById("session-menu-btn");
const menu = document.getElementById("session-menu");
const label = document.getElementById("session-menu-label");
const action = document.getElementById("session-menu-action");
const registerBtn = document.getElementById("session-menu-register");

if (!btn || !menu || !label || !action) {
} else {
  let state = "guest";

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
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function setGuest() {
    setAuthState("guest");
    label.textContent = "Invitado";

    action.textContent = "Iniciar sesión";
    action.classList.remove("btn-secondary");
    action.classList.add("btn-primary");
    action.onclick = () => {
      closeMenu();
      window.location.href = "/es/auth/login.html";
    };

    if (registerBtn) {
      registerBtn.hidden = false;
      registerBtn.style.display = "";
      registerBtn.setAttribute("aria-hidden", "false");
      registerBtn.onclick = () => {
        closeMenu();
        window.location.href = "/es/auth/registro.html";
      };
    }

    applyButtonColor();
  }

  function setUser(user) {
    setAuthState("user");
    const name = (user.displayName || user.email || "Usuario").toString();
    label.textContent = name;

    action.textContent = "Cerrar sesión";
    action.classList.remove("btn-primary");
    action.classList.add("btn-secondary");
    action.onclick = async () => {
      try {
        action.disabled = true;
        await signOut(auth);
        closeMenu();
        window.location.href = "/es/index.html";
      } finally {
        action.disabled = false;
      }
    };

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

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  setGuest();

  onAuthStateChanged(auth, (user) => {
    if (user) setUser(user);
    else setGuest();
  });
}
