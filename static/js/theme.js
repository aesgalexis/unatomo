(function () {
  const root = document.documentElement;
  const btn  = document.getElementById("theme-toggle");
  if (!btn) return;

  const prefersDark = window.matchMedia &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Lee (light|dark) de localStorage si existe
  const saved = localStorage.getItem("theme");
  const effective = saved || (prefersDark ? "dark" : "light");

  // Solo fijamos data-theme si el usuario ya eligió antes
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }

  setBtnLabel(getCurrentTheme());

  btn.addEventListener("click", () => {
    const current = getCurrentTheme();
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setBtnLabel(next);
  });

  // Si el usuario cambia el tema del SO y NO hay elección guardada
  if (!saved && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e) => {
      // Volvemos a dejar que el sistema mande
      root.removeAttribute("data-theme");
      setBtnLabel(e.matches ? "dark" : "light");
    };

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else if (mq.addListener) {
      // Compatibilidad con navegadores antiguos
      mq.addListener(handler);
    }
  }

  function getCurrentTheme() {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return prefersDark ? "dark" : "light";
  }

  function setBtnLabel(mode) {
    btn.textContent = mode === "dark" ? "☼" : "☾";
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }
})();
