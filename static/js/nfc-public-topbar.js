import { initTopbarLogoMotion } from "/static/js/topbar/loading-logo.js";

const mount = document.getElementById("topbar-mount");
const lang = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "es";
const isLoginPage = /^\/nfc\/(?:es|en)\/auth\/login\.html$/.test(window.location.pathname);
const loginPath = `/nfc/${lang}/auth/login.html`;
const loginLabel = lang === "en" ? "Sign in" : "Iniciar sesión";

if (mount) {
  mount.innerHTML = `
    <header class="landing-header">
      <a class="landing-brand" href="/nfc/" aria-label="UNATOMO NFC">
        <img src="/static/img/logo-unatomo-round-outline-v1.0.svg" alt="unatomo" class="topbar-logo--rotating">
        <span>UNATOMO/NFC</span>
      </a>
      <div class="landing-header-actions">
        ${isLoginPage ? "" : `<a class="landing-header-login" href="${loginPath}">${loginLabel}</a>`}
        <div class="landing-lang-picker">
          <button id="lang-toggle" class="landing-control landing-lang-button" type="button" aria-expanded="false" aria-controls="lang-menu" aria-label="${lang === "en" ? "Language" : "Idioma"}">
            <span class="landing-control-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path></svg>
            </span>
            <span class="landing-lang-label">${lang.toUpperCase()}</span>
          </button>
          <div id="lang-menu" class="landing-lang-menu" role="menu" hidden>
            <button type="button" data-set-lang="es" lang="es" role="menuitemradio" aria-checked="${lang === "es"}"><span>Español</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
            <button type="button" data-set-lang="en" lang="en" role="menuitemradio" aria-checked="${lang === "en"}"><span>English</span><span class="landing-lang-check" aria-hidden="true">&#10003;</span></button>
          </div>
        </div>
      </div>
    </header>
  `;
}

initTopbarLogoMotion();

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
