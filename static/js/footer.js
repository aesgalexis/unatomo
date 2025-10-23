(() => {
  'use strict';

  const slot = document.getElementById('footer-slot');
  if (!slot) return;

  const lang = (document.documentElement.lang || 'es').toLowerCase();
  const footerPath = `/${lang}/footer.html`;

  fetch(footerPath, { credentials: 'same-origin', cache: 'no-store' })
    .then(res => res.ok ? res.text() : Promise.reject(res.status))
    .then(html => {
      slot.outerHTML = html || '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Footer no disponible.</p></footer>';

      const footer = document.getElementById('site-footer');
      const toggle = footer?.querySelector('.footer-toggle');
      const panel  = footer?.querySelector('.footer-panel');
      const caret  = footer?.querySelector('.footer-caret');
      if (!footer || !toggle || !panel || !caret) return;

      let open = false;

      const setOpen = (next) => {
        open = !!next;
        footer.dataset.state = open ? 'open' : 'closed';

        if (open) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          panel.setAttribute('aria-hidden', 'false');
          toggle.setAttribute('aria-expanded', 'true');
          caret.textContent = '▾';   // abierto
        } else {
          panel.style.maxHeight = '0px';
          panel.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
          caret.textContent = '▴';   // cerrado
        }
      };

      // Recalcular si el contenido interno cambia (fuentes, ancho, etc.)
      const ro = new ResizeObserver(() => {
        if (open) panel.style.maxHeight = panel.scrollHeight + 'px';
      });
      ro.observe(panel);

      toggle.addEventListener('click', () => setOpen(!open));

      footer.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          toggle.focus();
        }
      });

      setOpen(false);
    })
    .catch(() => {
      slot.outerHTML = '<footer id="site-footer"><p style="text-align:center;opacity:.6;">Error al cargar el footer.</p></footer>';
    });
})();
