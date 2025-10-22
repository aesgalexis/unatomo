(() => {
  'use strict';

  const slot = document.getElementById('footer-slot');
  if (!slot) return;

  const lang = (document.documentElement.lang || 'es').toLowerCase();
  const footerPath = `/${lang}/footer.html`;

  fetch(footerPath, { credentials: 'same-origin' })
    .then(res => res.ok ? res.text() : Promise.reject(res.status))
    .then(html => {
      // Reemplaza el <div id="footer-slot"> completo por el HTML del footer
      slot.outerHTML = html || '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Footer no disponible.</p></footer>';
    })
    .catch(() => {
      slot.outerHTML = '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Error al cargar el footer.</p></footer>';
    });
})();
