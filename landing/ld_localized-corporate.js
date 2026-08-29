(() => {
  try {
    localStorage.setItem("lang", (document.documentElement.lang || "es").slice(0, 2).toLowerCase());
  } catch {}

  const toggle = document.getElementById("lang-toggle");
  const menu = document.getElementById("lang-menu");
  if (!toggle || !menu) return;
  const close = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    menu.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();
