import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requestInviteCodeAndRedirect } from "/static/js/registro/invite-gate.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { getCurrentLang, getLocaleText, localizeEsPath } from "/static/js/site/locale.js";
import { getControlPanelPath, isControlPanelUser } from "/controlpanel/access.js";

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

  const lang = getCurrentLang();
  const text = getLocaleText(lang);
  const paths = {
    login: localizeEsPath("/es/auth/login.html", lang),
    register: localizeEsPath("/es/auth/registro.html", lang),
    settings: localizeEsPath("/es/configuracion.html", lang),
    home: localizeEsPath("/es/index.html", lang),
    panel: getControlPanelPath(),
  };

  let panelLink = document.getElementById("session-menu-panel");
  if (!panelLink) {
    panelLink = document.createElement("a");
    panelLink.id = "session-menu-panel";
    panelLink.href = paths.panel;
    panelLink.setAttribute("role", "menuitem");
    panelLink.className = "session-menu-link";
    panelLink.hidden = true;
    panelLink.textContent = lang === "en" ? "Panel" : "Panel";
    if (profileLink && profileLink.parentNode) {
      profileLink.parentNode.insertBefore(panelLink, profileLink);
    } else if (action && action.parentNode) {
      action.parentNode.insertBefore(panelLink, action);
    }
  }

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

    label.hidden = false;
    label.textContent = text.session.guest;

    if (profileLink) {
      profileLink.hidden = true;
      profileLink.textContent = "";
    }

    if (panelLink) {
      panelLink.hidden = true;
      panelLink.textContent = "";
    }

    action.textContent = text.session.login;
    action.setAttribute("href", paths.login);
    action.onclick = () => {
      closeMenu();
    };

    if (registerBtn) {
      registerBtn.hidden = false;
      registerBtn.style.display = "";
      registerBtn.setAttribute("aria-hidden", "false");
      registerBtn.textContent = text.session.register;
      registerBtn.setAttribute("href", paths.register);
      registerBtn.onclick = (event) => {
        event.preventDefault();
        closeMenu();
        requestInviteCodeAndRedirect(paths.register);
      };
    }

    applyButtonColor();
  }

  async function setUser(user) {
    setAuthState("user");
    currentUser = user;

    label.hidden = false;
    label.textContent = (user.displayName || user.email || text.session.user).toString();

    if (profileLink) {
      profileLink.hidden = false;
      profileLink.textContent = text.session.settings;
      profileLink.setAttribute("href", paths.settings);
    }

    if (panelLink) {
      const allowed = await isControlPanelUser(user);
      panelLink.hidden = !allowed;
      panelLink.textContent = allowed ? (lang === "en" ? "Panel" : "Panel") : "";
      panelLink.setAttribute("href", paths.panel);
    }

    action.textContent = text.session.logout;
    action.setAttribute("href", "#");
    action.onclick = async (event) => {
      event.preventDefault();
      try {
        await signOut(auth);
        closeMenu();
        window.location.href = paths.home;
      } catch {}
    };

    if (registerBtn) {
      registerBtn.hidden = true;
      registerBtn.style.display = "none";
      registerBtn.setAttribute("aria-hidden", "true");
      registerBtn.onclick = null;
    }

    applyButtonColor();
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  if (profileLink) {
    profileLink.addEventListener("click", (event) => {
      if (!currentUser) return;
      event.stopPropagation();
      closeMenu();
    });
  }

  if (panelLink) {
    panelLink.addEventListener("click", (event) => {
      if (!currentUser || panelLink.hidden) return;
      event.stopPropagation();
      closeMenu();
    });
  }

  window.addEventListener("unatomo:topbar-open", (event) => {
    if (event.detail && event.detail.id !== "session") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== btn) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  setGuest();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await setUser(user);
      upsertAccountDirectory(user).catch(() => {});
    } else {
      setGuest();
    }
  });
}
