import { auth, getUserRegistrationState } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requestInviteCodeAndRedirect } from "/static/js/registro/invite-gate.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { getCurrentLang, getLocaleText, localizeEsPath } from "/static/js/site/locale.js";
import { applySuperadminLanguageTogglePreference } from "/static/js/site/superadmin-preferences.js";
import { getControlPanelPath, isControlPanelUser } from "/nfc/controlpanel/access.js";

const btn = document.getElementById("session-menu-btn");
const menu = document.getElementById("session-menu");
const label = document.getElementById("session-menu-label");
const profileLink = document.getElementById("session-menu-profile");
const action = document.getElementById("session-menu-action");
const registerBtn = document.getElementById("session-menu-register");

const MENU_ICONS = {
  panel: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3h4v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10v4h-.08A1.7 1.7 0 0 0 19.4 15Z"></path>',
  access: '<path d="M21 2 13.5 9.5"></path><circle cx="8" cy="16" r="5"></circle><path d="m14 8 2 2"></path><path d="m17 5 2 2"></path>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m14 17 5-5-5-5"></path><path d="M19 12H7"></path>',
  register: '<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path>',
};

function setMenuLinkContent(link, icon, text) {
  if (!link) return;
  const iconEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  iconEl.setAttribute("viewBox", "0 0 24 24");
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.setAttribute("focusable", "false");
  iconEl.setAttribute("fill", "none");
  iconEl.setAttribute("stroke", "currentColor");
  iconEl.setAttribute("stroke-width", "1.8");
  iconEl.setAttribute("stroke-linecap", "round");
  iconEl.setAttribute("stroke-linejoin", "round");
  iconEl.classList.add("session-menu-link-icon");
  iconEl.innerHTML = MENU_ICONS[icon];

  const textEl = document.createElement("span");
  textEl.textContent = text;
  link.replaceChildren(iconEl, textEl);
}

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
    access: localizeEsPath("/es/accesos.html", lang),
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
    setMenuLinkContent(panelLink, "panel", "Panel");
    if (profileLink && profileLink.parentNode) {
      profileLink.parentNode.insertBefore(panelLink, profileLink);
    } else if (action && action.parentNode) {
      action.parentNode.insertBefore(panelLink, action);
    }
  }

  let accessLink = document.getElementById("session-menu-access");
  if (!accessLink) {
    accessLink = document.createElement("a");
    accessLink.id = "session-menu-access";
    accessLink.href = paths.access;
    accessLink.setAttribute("role", "menuitem");
    accessLink.className = "session-menu-link";
    accessLink.hidden = true;
    if (profileLink && profileLink.parentNode) {
      profileLink.parentNode.insertBefore(accessLink, profileLink.nextSibling);
    } else if (action && action.parentNode) {
      action.parentNode.insertBefore(accessLink, action);
    }
  }

  const insertAfter = (node, reference) => {
    if (!node || !reference?.parentNode) return;
    const parent = reference.parentNode;
    const next = reference.nextSibling;
    if (next === node) return;
    parent.insertBefore(node, next);
  };

  const syncSessionMenuOrder = () => {
    const parent = profileLink?.parentNode || action?.parentNode || null;
    if (!parent || !profileLink) return;
    if (panelLink) parent.insertBefore(panelLink, profileLink);
    insertAfter(accessLink, profileLink);
  };
  syncSessionMenuOrder();

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
    delete document.documentElement.dataset.superadmin;
    delete document.documentElement.dataset.superadminLanguageToggle;

    label.hidden = false;
    label.textContent = text.session.guest;

    if (profileLink) {
      profileLink.hidden = true;
      profileLink.replaceChildren();
    }

    if (accessLink) {
      accessLink.hidden = true;
      accessLink.replaceChildren();
    }

    if (panelLink) {
      panelLink.hidden = true;
      panelLink.replaceChildren();
    }

    setMenuLinkContent(action, "login", text.session.login);
    action.setAttribute("href", paths.login);
    action.onclick = () => {
      closeMenu();
    };

    if (registerBtn) {
      registerBtn.hidden = false;
      registerBtn.style.display = "";
      registerBtn.setAttribute("aria-hidden", "false");
      setMenuLinkContent(registerBtn, "register", text.session.register);
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
      setMenuLinkContent(profileLink, "settings", text.session.settings);
      profileLink.setAttribute("href", paths.settings);
    }

    if (accessLink) {
      accessLink.hidden = false;
      setMenuLinkContent(accessLink, "access", text.session.access || (lang === "en" ? "Access" : "Accesos"));
      accessLink.setAttribute("href", paths.access);
    }

    if (panelLink) {
      const allowed = await isControlPanelUser(user);
      document.documentElement.dataset.superadmin = allowed ? "true" : "false";
      if (allowed) applySuperadminLanguageTogglePreference();
      else delete document.documentElement.dataset.superadminLanguageToggle;
      panelLink.hidden = !allowed;
      if (allowed) setMenuLinkContent(panelLink, "panel", "Panel");
      else panelLink.replaceChildren();
      panelLink.setAttribute("href", paths.panel);
    }

    setMenuLinkContent(action, "logout", text.session.logout);
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

  if (accessLink) {
    accessLink.addEventListener("click", (event) => {
      if (!currentUser || accessLink.hidden) return;
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
    if (!user) {
      setGuest();
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        setGuest();
        return;
      }
      await setUser(user);
      upsertAccountDirectory(user).catch(() => {});
    } catch {
      setGuest();
    }
  });
}
