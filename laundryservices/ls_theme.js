(() => {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const THEME_KEY = "ls_theme";

  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {}

  const initialTheme = saved === "light" || saved === "dark" ? saved : "dark";
  root.setAttribute("data-theme", initialTheme);

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

  function getCurrentTheme() {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return "dark";
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
