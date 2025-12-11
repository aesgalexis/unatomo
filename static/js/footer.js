  <script>
    (function () {
      const legalFooter = document.getElementById("legal-footer");
      if (legalFooter) {
        const year = new Date().getFullYear();
        legalFooter.textContent =
          "© " + year + " UNATOMO CORE SL · Todos los derechos reservados.";
      }
    })();
  </script>
