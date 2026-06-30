(function () {
  const getBasePrefix = () => (/^\/nfc(?:\/|$)/i.test(window.location.pathname) ? "/nfc" : "");
  const getCurrentLang = () => {
    const pathMatch = window.location.pathname.match(/^\/(?:nfc\/)?([a-z]{2})(?:\/|$)/i);
    const fromPath = pathMatch ? pathMatch[1].toLowerCase() : "";
    if (fromPath === "en") return "en";
    const fromHtml = (document.documentElement.lang || "").trim().toLowerCase();
    if (fromHtml === "en") return "en";
    return "es";
  };

  const lang = getCurrentLang();
  const basePrefix = getBasePrefix();
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
        { href: `${basePrefix}/en/index.html#/novedades`, label: "What’s new" },
        { href: `${basePrefix}/en/index.html#/tags`, label: "Physical tags" },
        { href: `${basePrefix}/en/index.html#/contacto`, label: "Contact" }
      ]
    : [
        { href: `${basePrefix}/es/index.html#/novedades`, label: "Novedades" },
        { href: `${basePrefix}/es/index.html#/tags`, label: "Tags f\u00edsicos" },
        { href: `${basePrefix}/es/index.html#/contacto`, label: "Contacto" }
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
