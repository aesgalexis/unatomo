(function () {
  const getCurrentLang = () => {
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
    const fromPath = pathMatch ? pathMatch[1].toLowerCase() : "";
    if (fromPath === "en") return "en";
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
})();
