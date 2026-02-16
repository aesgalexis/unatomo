export function initThemeToggle(options = {}) {
  const root = document.documentElement;
  const btnId = options.buttonId || "theme-toggle";
  const btn = document.getElementById(btnId);
  const ICONS = `
    <span class="icon" data-icon="sun" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <circle cx="12" cy="12" r="4.5" fill="currentColor"></circle>
        <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"></path>
      </svg>
    </span>
    <span class="icon" data-icon="moon" aria-hidden="true">
      ☾
    </span>
  `;

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  let saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch {}

  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }

  setBtnLabel(getCurrentTheme());

  if (btn) {
    btn.addEventListener("click", () => {
      const current = getCurrentTheme();
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch {}
      setBtnLabel(next);
    });
  }

  if (!saved && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      root.removeAttribute("data-theme");
      setBtnLabel(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  function getCurrentTheme() {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return prefersDark ? "dark" : "light";
  }

  function setBtnLabel(mode) {
    if (!btn) return;
    if (!btn.querySelector("[data-icon='sun']")) {
      btn.innerHTML = ICONS;
    }
    btn.setAttribute("data-theme", mode);
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }
}
