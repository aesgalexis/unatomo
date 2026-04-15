(function () {
  const getCurrentLang = () => {
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
    const fromPath = pathMatch ? pathMatch[1].toLowerCase() : "";
    if (fromPath === "en") return "en";
    const fromHtml = (document.documentElement.lang || "").trim().toLowerCase();
    if (fromHtml === "en") return "en";
    return "es";
  };

  const lang = getCurrentLang();
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const year = new Date().getFullYear();
  legalFooter.textContent =
    lang === "en"
      ? `\u00A9 ${year} UNATOMO CORE SL \u00B7 All rights reserved.`
      : `\u00A9 ${year} UNATOMO CORE SL \u00B7 Todos los derechos reservados.`;

  const nav = document.createElement("div");
  nav.className = "footer-nav-links";

  const links = lang === "en"
    ? [
        { href: "/en/index.html#/faqs", label: "FAQs" },
        { href: "/en/index.html#/tags", label: "Physical tags" },
        { href: "/en/index.html#/contacto", label: "Contact" }
      ]
    : [
        { href: "/es/index.html#/faqs", label: "FAQs" },
        { href: "/es/index.html#/tags", label: "Tags f\u00edsicos" },
        { href: "/es/index.html#/contacto", label: "Contacto" }
      ];

  links.forEach(({ href, label }) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = label;
    nav.appendChild(anchor);
  });

  const existingNav = legalFooter.querySelector(".footer-nav-links");
  if (!existingNav) {
    legalFooter.prepend(nav);
  }
})();
