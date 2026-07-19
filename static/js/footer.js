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
  const isPublicNfcPage =
    document.body.classList.contains("nfc-landing") ||
    document.body.classList.contains("nfc-public-page");
  const contactHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/contacto.html`
    : `${basePrefix}/${lang}/index.html#/contacto`;
  const whatsNewHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/novedades.html`
    : `${basePrefix}/${lang}/index.html#/novedades`;
  const tagsHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/tags.html`
    : `${basePrefix}/${lang}/index.html#/tags`;
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
        { href: whatsNewHref, label: "What’s new" },
        { href: tagsHref, label: "Physical tags" },
        { href: contactHref, label: "Contact" }
      ]
    : [
        { href: whatsNewHref, label: "Novedades" },
        { href: tagsHref, label: "Tags f\u00edsicos" },
        { href: contactHref, label: "Contacto" }
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
