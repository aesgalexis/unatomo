(function () {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const MESSAGES = {
    es: "UNATOMO CORE SL - Todos los derechos reservados.",
    en: "UNATOMO CORE SL - All rights reserved.",
    el: "UNATOMO CORE SL - Με επιφυλαξη παντος δικαιωματος.",
  };

  const render = (lang) => {
    const year = new Date().getFullYear();
    const text = MESSAGES[lang] || MESSAGES.es;
    legalFooter.textContent = "(c) " + year + " " + text;
  };

  render(document.documentElement.lang || "es");

  document.addEventListener("app:language-change", (event) => {
    const lang = event?.detail?.lang || "es";
    render(lang);
  });
})();
