(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const render = () => {
    const year = new Date().getFullYear();
    const text = document.body.dataset.legalFooter || "UNATOMO CORE SL \u00b7 Todos los derechos reservados.";
    if (window.renderLandingDisclosureFooter) {
      window.renderLandingDisclosureFooter({ legalFooterText: text });
    } else {
      legalFooter.textContent = "\u00a9 " + year + " " + text;
    }
  };

  render();
})();
