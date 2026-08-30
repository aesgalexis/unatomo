(() => {
  if (document.getElementById("landing-claim-text")) {
    const claimLoopScript = document.createElement("script");
    claimLoopScript.src = "/landing/ld_claim-loop.js";
    document.head.appendChild(claimLoopScript);
  }

  try {
    localStorage.setItem("lang", (document.documentElement.lang || "es").slice(0, 2).toLowerCase());
  } catch {}

  const toggle = document.getElementById("landing-lang-toggle");
  const menu = document.getElementById("landing-lang-menu");
  if (toggle && menu) {
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
    menu.addEventListener("click", close);
    document.addEventListener("click", (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  const legal = document.body.dataset.legalFooter || "";
  if (window.renderLandingDisclosureFooter) {
    window.renderLandingDisclosureFooter({legalFooterText: legal});
  }
})();
