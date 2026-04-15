import { initThemeToggle } from "/static/js/theme/theme-toggle.js";
import { getCurrentLang, getLocalizedHref, getUiPath, setSavedLang } from "/static/js/site/locale.js";

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
const isControlPanelPage = /^\/controlpanel(?:\/|$)/i.test(window.location.pathname);

if (langEs && langEn) {
  if (isControlPanelPage) {
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    langEs.href = currentHref;
    langEn.href = currentHref;
  } else {
    langEs.href = getLocalizedHref("es");
    langEn.href = getLocalizedHref("en");
  }
  langEs.setAttribute("aria-current", currentLang === "es" ? "page" : "false");
  langEn.setAttribute("aria-current", currentLang === "en" ? "page" : "false");
  langEs.classList.toggle("is-active", currentLang === "es");
  langEn.classList.toggle("is-active", currentLang === "en");
  langEs.addEventListener("click", () => setSavedLang("es"));
  langEn.addEventListener("click", () => setSavedLang("en"));
}

initThemeToggle();

await import("/static/js/registro/session-menu.js");
const { initTopbarNotifications } = await import(
  "/static/js/notifications/topbar-notifications.js"
);
initTopbarNotifications();
