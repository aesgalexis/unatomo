const THEME_KEY = "theme";

const getSystemTheme = () =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export function getCurrentTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;

  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}

  return getSystemTheme();
}

export function setTheme(mode) {
  const next = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  return next;
}

const ICONS = `
  <span class="icon" data-icon="sun" aria-hidden="true">
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <circle cx="12" cy="12" r="4.5" fill="currentColor"></circle>
      <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"></path>
    </svg>
  </span>
  <span class="icon" data-icon="moon" aria-hidden="true">&#9790;</span>
`;

export function initThemeToggle(options = {}) {
  const btn = document.getElementById(options.buttonId || "theme-toggle");
  const saved = (() => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  })();

  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
  }

  const setBtnLabel = (mode) => {
    if (!btn) return;
    if (!btn.querySelector("[data-icon='sun']")) btn.innerHTML = ICONS;
    btn.setAttribute("data-theme", mode);
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  };

  setBtnLabel(getCurrentTheme());

  btn?.addEventListener("click", () => {
    const next = getCurrentTheme() === "dark" ? "light" : "dark";
    setBtnLabel(setTheme(next));
  });

  if (!saved && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => {
      document.documentElement.removeAttribute("data-theme");
      setBtnLabel(event.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
  }
}
