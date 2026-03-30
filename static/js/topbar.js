import { initThemeToggle } from "/static/js/theme/theme-toggle.js";
import { getCurrentLang, getLocalizedHref, getUiPath } from "/static/js/site/locale.js";

const mount =
  document.getElementById("topbar-mount") ||
  (() => {
    const d = document.createElement("div");
    d.id = "topbar-mount";
    document.body.insertBefore(d, document.body.firstChild);
    return d;
  })();

try {
  const res = await fetch(getUiPath("topbar.html"), { cache: "no-store" });
  if (!res.ok) throw new Error("topbar fetch failed");
  mount.innerHTML = await res.text();
} catch {
  mount.innerHTML = "";
}

const titleEl = document.getElementById("topbar-title");
if (titleEl) {
  const t = (document.body.dataset.topbarTitle || "").trim();
  if (t) titleEl.textContent = t;
}

const currentLang = getCurrentLang();
const langEs = document.getElementById("lang-link-es");
const langEn = document.getElementById("lang-link-en");

if (langEs && langEn) {
  langEs.href = getLocalizedHref("es");
  langEn.href = getLocalizedHref("en");
  langEs.setAttribute("aria-current", currentLang === "es" ? "page" : "false");
  langEn.setAttribute("aria-current", currentLang === "en" ? "page" : "false");
  langEs.classList.toggle("is-active", currentLang === "es");
  langEn.classList.toggle("is-active", currentLang === "en");
}

initThemeToggle();

await import("/static/js/registro/session-menu.js");
const { initTopbarNotifications } = await import(
  "/static/js/notifications/topbar-notifications.js"
);
initTopbarNotifications();

let backdrop = document.querySelector(".topbar-menu-backdrop");
if (!backdrop) {
  backdrop = document.createElement("div");
  backdrop.className = "topbar-menu-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.appendChild(backdrop);
}

const logoGroup = document.querySelector(".topbar-logo-group");
const closeTopbarMenu = () => {
  document.body.classList.remove("menu-open");
  document.body.classList.remove("menu-locked");
};
if (logoGroup) {
  logoGroup.addEventListener("mouseenter", () => {
    document.body.classList.add("menu-open");
  });
  logoGroup.addEventListener("mouseleave", () => {
    document.body.classList.remove("menu-open");
    document.body.classList.remove("menu-locked");
  });
  logoGroup.addEventListener("focusin", () => {
    document.body.classList.add("menu-open");
  });
  logoGroup.addEventListener("focusout", () => {
    document.body.classList.remove("menu-open");
    document.body.classList.remove("menu-locked");
  });
}

document.querySelectorAll(".topbar-menu-link").forEach((link) => {
  link.addEventListener("click", () => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    closeTopbarMenu();
  });
});

if (backdrop) {
  backdrop.addEventListener("click", closeTopbarMenu);
}

const logoLink = document.querySelector(".topbar-logo-link");
if (logoLink) {
  logoLink.addEventListener("click", () => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    closeTopbarMenu();
    document.body.classList.add("menu-locked");
  });
}
