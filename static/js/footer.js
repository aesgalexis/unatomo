(() => {
  'use strict';

  const footerTargetId = 'footer-slot';

  // Crea un contenedor al final del body si no existe
  let footerContainer = document.getElementById(footerTargetId);
  if (!footerContainer) {
    footerContainer = document.createElement('footer');
    footerContainer.id = footerTargetId;
    document.body.appendChild(footerContainer);
  }

  // Ruta del footer según idioma
  const lang = document.documentElement.lang || 'es';
  const footerPath = `/${lang}/footer.html`;

  // Cargar el footer
  fetch(footerPath)
    .then(res => res.ok ? res.text() : '')
    .then(html => {
      footerContainer.innerHTML = html || '<p style="text-align:center;opacity:.6;">Footer no disponible.</p>';
    })
    .catch(() => {
      footerContainer.innerHTML = '<p style="text-align:center;opacity:.6;">Error al cargar el footer.</p>';
    });
})();
