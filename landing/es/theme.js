(function () {
  const root = document.documentElement;
  const btn  = document.getElementById("theme-toggle");
  if (!btn) return;

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Lee guardado (light|dark) o usa preferencia del sistema
  const saved = localStorage.getItem("theme");
  const effective = saved || (prefersDark ? "dark" : "light");

  // Solo fija atributo si el usuario ya eligió antes; si no, deja actuar al sistema
  if (saved) root.setAttribute("data-theme", saved);

  setBtnLabel(getCurrentTheme());

  btn.addEventListener("click", () => {
    const current = getCurrentTheme();
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setBtnLabel(next);
  });

  // Si el usuario cambia el tema del SO y NO hay elección guardada, respeta el cambio
  if (!saved && window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      // No tocamos localStorage; solo reflejamos el estado visual del botón
      setBtnLabel(e.matches ? "dark" : "light");
      root.removeAttribute("data-theme"); // vuelve a dejar que el sistema mande
    });
  }

  function getCurrentTheme() {
    // Prioriza data-theme si existe; si no, usa sistema
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return prefersDark ? "dark" : "light";
  }

  function setBtnLabel(mode) {
    // Opcional: cambia icono/label accesible
    btn.textContent = mode === "dark" ? "☼" : "☾";
    btn.setAttribute("aria-label", mode === "dark" ? "Cambiar a claro" : "Cambiar a oscuro");
  }
})();
