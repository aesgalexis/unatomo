import { auth, getUserRegistrationState } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { requestInviteCodeAndRedirect } from "/static/js/registro/invite-gate.js";
import { upsertAccountDirectory } from "/static/js/dashboard/admin/accountDirectoryRepo.js";
import { getCurrentLang, getLocaleText, localizeEsPath } from "/static/js/site/locale.js";
import { getCurrentTheme, setTheme } from "/static/js/theme/theme-toggle.js";
import { applySuperadminLanguageTogglePreference } from "/static/js/site/superadmin-preferences.js";
import { getControlPanelPath, isControlPanelUser } from "/nfc/controlpanel/access.js";

const btn = document.getElementById("session-menu-btn");
const menu = document.getElementById("session-menu");
const label = document.getElementById("session-menu-label");
const emailLabel = document.getElementById("session-menu-email");
const initials = document.getElementById("session-menu-initials");
const dashboardLink = document.getElementById("session-menu-dashboard");
const profileLink = document.getElementById("session-menu-profile");
const action = document.getElementById("session-menu-action");
const registerBtn = document.getElementById("session-menu-register");
const themeToggle = document.getElementById("session-menu-theme-toggle");
const themeOptions = document.getElementById("session-menu-theme-options");
const themeLight = document.getElementById("session-menu-theme-light");
const themeDark = document.getElementById("session-menu-theme-dark");
const languageWrap = document.getElementById("session-menu-language-wrap");
const languageToggle = document.getElementById("session-menu-language-toggle");
const languageOptions = document.getElementById("session-menu-language-options");

const MENU_ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
  panel: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3h4v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10v4h-.08A1.7 1.7 0 0 0 19.4 15Z"></path>',
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

function getUserInitials(displayName, fallback = "") {
  const source = (displayName || fallback || "").toString().trim();
  if (!source) return "";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = Array.from(parts[0])[0] || "";
  const last = Array.from(parts[parts.length - 1])[0] || "";
  return (parts.length > 1 ? `${first}${last}` : first).toUpperCase();
}

function setSubmenuState(toggle, options, open) {
  if (!toggle || !options) return;
  options.hidden = !open;
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.classList.toggle("is-expanded", open);
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
    dashboard: `${localizeEsPath("/es/index.html", lang)}#/dashboard`,
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
    setMenuLinkContent(panelLink, "panel", "Panel");
    if (profileLink && profileLink.parentNode) {
      profileLink.parentNode.insertBefore(panelLink, profileLink);
    } else if (action && action.parentNode) {
      action.parentNode.insertBefore(panelLink, action);
    }
  }

  const syncSessionMenuOrder = () => {
    const parent = profileLink?.parentNode || action?.parentNode || null;
    if (!parent || !profileLink) return;
    if (panelLink) parent.insertBefore(panelLink, dashboardLink || profileLink);
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

  function closeSubmenus() {
    setSubmenuState(themeToggle, themeOptions, false);
    setSubmenuState(languageToggle, languageOptions, false);
  }

  function updateThemeSelection(mode = getCurrentTheme()) {
    [
      [themeLight, "light"],
      [themeDark, "dark"],
    ].forEach(([option, value]) => {
      if (!option) return;
      const selected = mode === value;
      option.setAttribute("aria-checked", selected ? "true" : "false");
      option.classList.toggle("is-active", selected);
    });
  }

  function toggleSubmenu(toggle, options) {
    if (!toggle || !options) return;
    const opening = options.hidden;
    closeSubmenus();
    setSubmenuState(toggle, options, opening);
    if (opening && toggle === themeToggle) updateThemeSelection();
  }

  themeToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSubmenu(themeToggle, themeOptions);
  });

  languageToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSubmenu(languageToggle, languageOptions);
  });

  themeLight?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setTheme("light");
    updateThemeSelection("light");
  });

  themeDark?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setTheme("dark");
    updateThemeSelection("dark");
  });

  updateThemeSelection();

  window.addEventListener("unatomo:superadmin-language-toggle", (event) => {
    if (!currentUser || !languageWrap) return;
    const visible = document.documentElement.dataset.superadmin === "true"
      && event.detail?.visible === true;
    languageWrap.hidden = !visible;
    if (!visible) closeSubmenus();
  });

  function openMenu() {
    window.dispatchEvent(
      new CustomEvent("unatomo:topbar-open", { detail: { id: "session" } })
    );
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    updateThemeSelection();
  }

  function closeMenu() {
    closeSubmenus();
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

    if (emailLabel) {
      emailLabel.hidden = true;
      emailLabel.textContent = "";
    }

    if (initials) initials.textContent = "";

    if (languageWrap) languageWrap.hidden = true;
    closeSubmenus();

    if (profileLink) {
      profileLink.hidden = true;
      profileLink.replaceChildren();
    }

    if (dashboardLink) {
      dashboardLink.hidden = true;
      dashboardLink.replaceChildren();
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
    const displayName = (user.displayName || "").toString().trim();
    const email = (user.email || "").toString().trim();
    label.textContent = displayName || email || text.session.user;

    if (emailLabel) {
      emailLabel.hidden = !email;
      emailLabel.textContent = email;
    }

    if (initials) {
      initials.replaceChildren();
      if (user.photoURL) {
        const image = document.createElement("img");
        image.className = "session-menu-avatar-image";
        image.width = 26;
        image.height = 26;
        image.decoding = "async";
        image.src = user.photoURL;
        image.alt = "";
        image.addEventListener("error", () => {
          initials.replaceChildren();
          initials.textContent = getUserInitials(displayName, email || text.session.user);
        }, {once: true});
        initials.appendChild(image);
      } else {
        initials.textContent = getUserInitials(displayName, email || text.session.user);
      }
    }

    if (profileLink) {
      profileLink.hidden = false;
      setMenuLinkContent(profileLink, "settings", text.session.settings);
      profileLink.setAttribute("href", paths.settings);
    }

    if (dashboardLink) {
      dashboardLink.hidden = false;
      setMenuLinkContent(dashboardLink, "dashboard", text.session.dashboard);
      dashboardLink.setAttribute("href", paths.dashboard);
    }

    if (panelLink) {
      const allowed = await isControlPanelUser(user);
      document.documentElement.dataset.superadmin = allowed ? "true" : "false";
      const languageVisible = allowed && applySuperadminLanguageTogglePreference();
      if (!allowed) delete document.documentElement.dataset.superadminLanguageToggle;
      if (languageWrap) languageWrap.hidden = !languageVisible;
      if (!languageVisible) closeSubmenus();
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

  if (dashboardLink) {
    dashboardLink.addEventListener("click", (event) => {
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

  window.addEventListener("unatomo:profile-photo-updated", () => {
    if (currentUser) setUser(auth.currentUser || currentUser);
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
