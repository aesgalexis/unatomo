import { initThemeToggle } from "/static/js/theme/theme-toggle.js";

const mount = document.getElementById("topbar-mount");
const lang = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "es";
const isLoginPage = /^\/nfc\/(?:es|en)\/auth\/login\.html$/.test(window.location.pathname);
const loginPath = `/nfc/${lang}/auth/login.html`;
const loginLabel = lang === "en" ? "Sign in" : "Iniciar sesión";

if (mount) {
  mount.innerHTML = `
    <header class="landing-header">
      <a class="landing-brand" href="/nfc/" aria-label="UNATOMO NFC">
        <img src="/static/img/logo-unatomo-v1.6.svg" alt="unatomo">
        <span>UNATOMO/NFC</span>
      </a>
      <div class="landing-header-actions">
        ${isLoginPage ? "" : `<a class="landing-header-login" href="${loginPath}">${loginLabel}</a>`}
        <button id="theme-toggle" class="landing-control" type="button" aria-label="${lang === "en" ? "Change theme" : "Cambiar tema"}"></button>
        <div class="landing-lang-picker">
          <button id="lang-toggle" class="landing-control landing-lang-button" type="button" aria-expanded="false" aria-controls="lang-menu" aria-label="${lang === "en" ? "Language" : "Idioma"}">
            <span class="landing-control-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 12 2.5zm7.5 9.5a7.45 7.45 0 0 1-1.2 4h-3.1a18.9 18.9 0 0 0 .6-4 18.9 18.9 0 0 0-.6-4h3.1a7.45 7.45 0 0 1 1.2 4zM12 4.6c.9 1.1 1.7 2.7 2.2 4.4H9.8c.5-1.7 1.3-3.3 2.2-4.4zM4.5 12a7.45 7.45 0 0 1 1.2-4h3.1a18.9 18.9 0 0 0-.6 4 18.9 18.9 0 0 0 .6 4H5.7a7.45 7.45 0 0 1-1.2-4zm5.3 0a16.6 16.6 0 0 1 .7-4h3a16.6 16.6 0 0 1 .7 4 16.6 16.6 0 0 1-.7 4h-3a16.6 16.6 0 0 1-.7-4zm2.2 7.4c-.9-1.1-1.7-2.7-2.2-4.4h4.4c-.5 1.7-1.3 3.3-2.2 4.4z"></path></svg>
            </span>
            <span class="landing-lang-label">${lang.toUpperCase()}</span>
          </button>
          <div id="lang-menu" class="landing-lang-menu" role="menu" hidden>
            <button type="button" data-set-lang="es" lang="es" role="menuitem">Español</button>
            <button type="button" data-set-lang="en" lang="en" role="menuitem">English</button>
          </div>
        </div>
      </div>
    </header>
  `;
}

initThemeToggle();

const langToggle = document.getElementById("lang-toggle");
const langMenu = document.getElementById("lang-menu");

const closeLangMenu = () => {
  if (!langToggle || !langMenu) return;
  langMenu.hidden = true;
  langToggle.setAttribute("aria-expanded", "false");
};

langToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!langMenu) return;
  const willOpen = langMenu.hidden;
  langMenu.hidden = !willOpen;
  langToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".landing-lang-picker")) return;
  closeLangMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLangMenu();
});

document.querySelectorAll("[data-set-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetLang = button.dataset.setLang;
    if (targetLang !== "es" && targetLang !== "en") return;
    try { localStorage.setItem("unatomo_lang", targetLang); } catch {}
    const search = window.location.search;
    const currentPath = window.location.pathname;
    const localizedMatch = currentPath.match(/^\/nfc\/(?:es|en)(\/.*)$/);
    const localizedPath = localizedMatch
      ? `/nfc/${targetLang}${localizedMatch[1]}`
      : `/nfc/${targetLang}/contacto.html`;
    window.location.href = `${localizedPath}${search}`;
  });
});
