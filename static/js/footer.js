(() => {
  'use strict';

  const slot = document.getElementById('footer-slot');
  if (!slot) return;

  const lang = (document.documentElement.lang || 'es').toLowerCase();
  const footerPath = `/${lang}/footer.html`;

  fetch(footerPath, { credentials: 'same-origin', cache: 'no-store' })
    .then(res => res.ok ? res.text() : Promise.reject(res.status))
    .then(html => {
      // Montamos el footer
      slot.outerHTML = html || '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Footer no disponible.</p></footer>';

      // Después de montar, inicializamos el modo colapsable
      const footer = document.getElementById('site-footer');
      const toggle = footer?.querySelector('.footer-toggle');
      const panel  = footer?.querySelector('.footer-panel');

      if (!footer || !toggle || !panel) return;

      let open = false;

      const setOpen = (nextOpen) => {
        open = !!nextOpen;
        footer.classList.toggle('is-open', open);
        footer.dataset.state = open ? 'open' : 'closed';

        // Calcula altura exacta cuando abre; 0 al cerrar
        if (open) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          panel.setAttribute('aria-hidden', 'false');
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          panel.style.maxHeight = '0px';
          panel.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
        }
      };

      // Recalcula si cambia el contenido (por seguridad)
      const ro = new ResizeObserver(() => {
        if (open) panel.style.maxHeight = panel.scrollHeight + 'px';
      });
      ro.observe(panel);

      toggle.addEventListener('click', () => setOpen(!open));

      // Cerrar con Escape cuando el foco esté en el footer
      footer.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          toggle.focus();
        }
      });

      // Estado inicial: cerrado
      setOpen(false);
    })
    .catch(() => {
      slot.outerHTML = '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Error al cargar el footer.</p></footer>';
    });
})();
