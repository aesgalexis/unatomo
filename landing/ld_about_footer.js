(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const render = (dict) => {
    const year = new Date().getFullYear();
    const text = dict?.legal_footer || "UNATOMO CORE SL \u00b7 Todos los derechos reservados.";
    if (window.renderLandingDisclosureFooter) {
      window.renderLandingDisclosureFooter({ legalFooterText: text });
    } else {
      legalFooter.textContent = "\u00a9 " + year + " " + text;
    }
  };

  render(window.unatomoI18n && window.unatomoI18n.getLanguage
    ? {
        legal_footer:
          document.documentElement.lang === "en"
            ? "UNATOMO CORE SL \u00b7 All rights reserved."
            : document.documentElement.lang === "it"
              ? "UNATOMO CORE SL \u00b7 Tutti i diritti riservati."
              : document.documentElement.lang === "el"
                ? "UNATOMO CORE SL \u00b7 Me epifylaxi pantos dikaiomatos."
                : "UNATOMO CORE SL \u00b7 Todos los derechos reservados.",
      }
    : null);

  document.addEventListener("app:language-change", (event) => {
    render(event?.detail?.dict || null);
  });
})();
