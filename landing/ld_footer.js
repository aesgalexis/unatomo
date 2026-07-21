(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  let downbar = document.querySelector(".landing-downbar");
  if (!downbar) {
    downbar = document.createElement("nav");
    downbar.className = "landing-downbar";
    downbar.setAttribute("aria-label", "Primary");
    document.body.appendChild(downbar);
  }

  const fallbackLabels = (lang) => ({
    about:
      lang === "en"
        ? "About us"
        : lang === "it"
          ? "Chi siamo"
          : lang === "el"
            ? "\u03a3\u03c7\u03b5\u03c4\u03b9\u03ba\u03ac \u03bc\u03b5 \u03b5\u03bc\u03ac\u03c2"
            : "Nosotros",
    contact:
      lang === "en"
        ? "Contact"
        : lang === "it"
          ? "Contatto"
          : lang === "el"
            ? "\u0395\u03c0\u03b9\u03ba\u03bf\u03b9\u03bd\u03c9\u03bd\u03af\u03b1"
            : "Contacto"
  });

  const createNavLinks = (links, className) => {
    const nav = document.createElement("div");
    nav.className = className;

    links.forEach(({ href, label }) => {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = label;
      nav.appendChild(anchor);
    });

    return nav;
  };

  const render = (dict) => {
    const year = new Date().getFullYear();
    const lang = document.documentElement.lang;
    const labels = fallbackLabels(lang);
    const text = dict?.legal_footer || "UNATOMO CORE SL - Todos los derechos reservados.";
    const links = [
      { href: "/landing/nosotros/", label: dict?.about_link || labels.about },
      { href: "/nfc/", label: dict?.nfc_link || "NFC" },
      { href: "/landing/contacto/", label: dict?.contact_link || labels.contact },
    ];

    if (window.renderLandingDisclosureFooter) {
      window.renderLandingDisclosureFooter({ legalFooterText: text });
    } else {
      legalFooter.textContent = "\u00a9 " + year + " " + text;
    }

    downbar.innerHTML = "";
    downbar.appendChild(createNavLinks(links, "landing-downbar-links"));
  };

  render(window.unatomoI18n && window.unatomoI18n.getLanguage
    ? {
        legal_footer:
          document.documentElement.lang === "en"
            ? "UNATOMO CORE SL - All rights reserved."
            : document.documentElement.lang === "it"
              ? "UNATOMO CORE SL - Tutti i diritti riservati."
              : document.documentElement.lang === "el"
                ? "UNATOMO CORE SL - \u039c\u03b5 \u03b5\u03c0\u03b9\u03c6\u03cd\u03bb\u03b1\u03be\u03b7 \u03c0\u03b1\u03bd\u03c4\u03cc\u03c2 \u03b4\u03b9\u03ba\u03b1\u03b9\u03ce\u03bc\u03b1\u03c4\u03bf\u03c2."
                : "UNATOMO CORE SL - Todos los derechos reservados.",
      }
    : null);

  document.addEventListener("app:language-change", (event) => {
    render(event?.detail?.dict || null);
  });
})();
