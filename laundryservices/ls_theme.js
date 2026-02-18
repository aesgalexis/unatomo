(() => {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const THEME_KEY = "ls_theme";

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {}

  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }

  updateButton(getCurrentTheme());

  if (btn) {
    btn.addEventListener("click", () => {
      const current = getCurrentTheme();
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      updateButton(next);
    });
  }

  if (!saved && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      root.removeAttribute("data-theme");
      updateButton(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  function getCurrentTheme() {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return prefersDark ? "dark" : "light";
  }

  function updateButton(mode) {
    if (!btn) return;
    btn.setAttribute("data-theme", mode);
    btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
    const lang = document.documentElement.lang || "es";
    const labels = {
      es: {
        dark: "Cambiar a modo claro",
        light: "Cambiar a modo oscuro",
      },
      en: {
        dark: "Switch to light mode",
        light: "Switch to dark mode",
      },
      el: {
        dark: "Αλλαγη σε φωτεινη λειτουργια",
        light: "Αλλαγη σε σκοτεινη λειτουργια",
      },
    };
    const current = labels[lang] || labels.es;
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? current.dark : current.light
    );
  }

  document.addEventListener("app:language-change", () => {
    updateButton(getCurrentTheme());
  });
})();
