(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const render = (dict) => {
    const year = new Date().getFullYear();
    const text = dict?.legal_footer || "UNATOMO CORE SL - Todos los derechos reservados.";
    const lang = document.documentElement.lang;
    const contactLabel = lang === "en" ? "Contact" : lang === "it" ? "Contatto" : lang === "el" ? "Επικοινωνία" : "Contacto";
    legalFooter.textContent = "\u00a9 " + year + " " + text;

    const nav = document.createElement("div");
    nav.className = "footer-nav-links";

    [
      { href: "/nfc/", label: dict?.nfc_link || "NFC" },
      { href: "#", label: dict?.contact_link || contactLabel },
    ].forEach(({ href, label }) => {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = label;
      nav.appendChild(anchor);
    });

    legalFooter.prepend(nav);
  };

  render(window.unatomoI18n && window.unatomoI18n.getLanguage
    ? {
        legal_footer:
          document.documentElement.lang === "en"
            ? "UNATOMO CORE SL - All rights reserved."
            : document.documentElement.lang === "it"
              ? "UNATOMO CORE SL - Tutti i diritti riservati."
              : document.documentElement.lang === "el"
                ? "UNATOMO CORE SL - Με επιφύλαξη παντός δικαιώματος."
                : "UNATOMO CORE SL - Todos los derechos reservados.",
      }
    : null);

  document.addEventListener("app:language-change", (event) => {
    render(event?.detail?.dict || null);
  });
})();
