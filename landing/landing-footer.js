(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const year = new Date().getFullYear();
  legalFooter.textContent = "\u00a9 " + year + " UNATOMO CORE SL - Todos los derechos reservados.";
})();
