(() => {
  const language = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  const localizedLanguage = ["es", "en", "it", "el"].includes(language) ? language : "es";
  const directRoutes = new Map([
    ["/", `/${localizedLanguage}/`],
    ["/landing", `/${localizedLanguage}/`],
    ["/landing/", `/${localizedLanguage}/`],
    ["/laundry", `/laundryservices/${localizedLanguage}/`],
    ["/laundry/", `/laundryservices/${localizedLanguage}/`],
    ["/laundryservices", `/laundryservices/${localizedLanguage}/`],
    ["/laundryservices/", `/laundryservices/${localizedLanguage}/`],
    ["/studio", `/studio/${localizedLanguage}/`],
    ["/studio/", `/studio/${localizedLanguage}/`],
  ]);
  const resolveDirectRoute = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin && url.origin !== "https://unatomo.com") return "";
      const pathname = directRoutes.get(url.pathname);
      return pathname ? `${pathname}${url.search}${url.hash}` : "";
    } catch {
      return "";
    }
  };

  document.querySelectorAll("a[href]").forEach((link) => {
    const directHref = resolveDirectRoute(link.getAttribute("href"));
    if (directHref) link.setAttribute("href", directHref);
  });
  const directBackHref = resolveDirectRoute(document.body.dataset.backHref);
  if (directBackHref) document.body.dataset.backHref = directBackHref;

  if (document.getElementById("ls-claim-loop-text")) {
    const claimLoopScript = document.createElement("script");
    claimLoopScript.src = "/laundryservices/ls_claim-loop.js";
    document.head.appendChild(claimLoopScript);
  }

  const toggle = document.getElementById("lang-toggle");
  const menu = document.getElementById("lang-menu");
  if (!toggle || !menu) return;
  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    menu.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });
  menu.addEventListener("click", closeMenu);
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
})();
