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
  let cachedDashboardTitle = "";
  const isDashboardPage = /^\/nfc\/(?:es|en)\/index\.html$/i.test(window.location.pathname);
  if (isDashboardPage) {
    try {
      cachedDashboardTitle = (localStorage.getItem("unatomo_dashboard_title_v1") || "").trim();
    } catch {}
  }
  const t = (document.body.dataset.topbarTitle || "").trim();
  if (cachedDashboardTitle) titleEl.textContent = cachedDashboardTitle;
  else if (t) titleEl.textContent = t;
}

const currentLang = getCurrentLang();
const langEs = document.getElementById("lang-link-es");
const langEn = document.getElementById("lang-link-en");
const langButton = document.getElementById("topbar-lang-button");
const langMenu = document.getElementById("topbar-lang-menu");
const langLabel = langButton?.querySelector(".topbar-lang-label");
const isControlPanelPage = /^\/(?:nfc\/)?controlpanel(?:\/|$)/i.test(window.location.pathname);

if (langLabel) langLabel.textContent = currentLang.toUpperCase();

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

const closeLangMenu = () => {
  if (!langButton || !langMenu) return;
  langMenu.hidden = true;
  langButton.setAttribute("aria-expanded", "false");
};

langButton?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!langMenu) return;
  const opening = langMenu.hidden;
  if (opening) {
    window.dispatchEvent(
      new CustomEvent("unatomo:topbar-open", { detail: { id: "language" } })
    );
  }
  langMenu.hidden = !opening;
  langButton.setAttribute("aria-expanded", opening ? "true" : "false");
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".topbar-lang-toggle")) return;
  closeLangMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLangMenu();
});
window.addEventListener("unatomo:topbar-open", (event) => {
  if (event.detail?.id !== "language") closeLangMenu();
});

initThemeToggle();

await import("/static/js/registro/session-menu.js");
const { initTopbarNotifications } = await import(
  "/static/js/notifications/topbar-notifications.js"
);
initTopbarNotifications();
