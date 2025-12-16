(function () {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const getSystemTheme = () => {
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    return mq && mq.matches ? "dark" : "light";
  };

  let saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch (e) {}

  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }

  syncUI(getCurrentTheme());

  btn.addEventListener("click", () => {
    const current = getCurrentTheme();
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);

    try {
      localStorage.setItem("theme", next);
    } catch (e) {}

    syncUI(next);
  });

  if (!saved && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e) => {
      root.removeAttribute("data-theme");
      syncUI(e.matches ? "dark" : "light");
    };

    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  function getCurrentTheme() {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return getSystemTheme();
  }

  function syncUI(mode) {
    setBtnLabel(mode);
    syncThemeInputs(mode);
  }

  function syncThemeInputs(mode) {
    const inputs = document.querySelectorAll('input[name="theme"]');
    if (!inputs.length) return;
    inputs.forEach((input) => {
      input.checked = input.value === mode;
    });
  }

  function setBtnLabel(mode) {
    btn.textContent = mode === "dark" ? "☼" : "☾";
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }
})();
