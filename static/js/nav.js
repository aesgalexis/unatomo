(() => {
  'use strict';

  // Config (podrás ampliar cuando añadas más secciones)
const SECTION_TO_PARTIAL = {
  'inicio': '/static/content/inicio.html',
  'servicios': '/static/content/servicios.html',
};

// 2) Default al arrancar:
const parseHash = () => {
  const raw = (location.hash || '#inicio').slice(1);
  const [section = 'inicio', anchor = ''] = raw.split('/');
  return { section, anchor };
};

  const contentEl = document.getElementById('content');
  const sidebar = document.getElementById('sidebar-menu');
  const cache = new Map(); // sección -> HTML string

  // --- Utils ---
  const parseHash = () => {
    const raw = (location.hash || '#servicios').slice(1); // sin "#"
    const [section = 'servicios', anchor = ''] = raw.split('/');
    return { section, anchor };
  };

  const setAriaCurrent = ({ section, anchor }) => {
    // Limpia estados
    sidebar.querySelectorAll('a[aria-current]').forEach(a => a.removeAttribute('aria-current'));
    // Marca el activo
    const sel = `a[data-section="${section}"]${anchor ? `[data-anchor="${anchor}"]` : ''}`;
    const active = sidebar.querySelector(sel);
    if (active) active.setAttribute('aria-current', 'page');
  };

  const syncAccordion = (section) => {
    // Abre el <details> de esa sección; aquí solo existe "servicios"
    sidebar.querySelectorAll('details.nav-group').forEach(d => {
      if (d.dataset.section === section) d.open = true;
      else d.open = false;
    });
  };

  const highlight = (el) => {
    if (!el) return;
    el.classList.add('is-highlighted');
    setTimeout(() => el.classList.remove('is-highlighted'), 1200);
  };

  const scrollToAnchor = (anchor) => {
    if (!anchor) return;
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlight(target);
    }
  };

  const loadSection = async (section) => {
    if (cache.has(section)) return cache.get(section);
    const url = SECTION_TO_PARTIAL[section];
    if (!url) return '';
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return '';
    const html = await res.text();
    cache.set(section, html);
    return html;
  };

  const render = (html) => {
    contentEl.innerHTML = html || '<p>Contenido no disponible.</p>';
    // Enfoca el main para accesibilidad
    document.getElementById('app')?.focus({ preventScroll: true });
  };

  // --- Router principal ---
  const route = async () => {
    const { section, anchor } = parseHash();

    // sólo gestionamos "servicios" por ahora
    if (section !== 'servicios') {
      location.hash = '#servicios';
      return;
    }

    syncAccordion(section);
    setAriaCurrent({ section, anchor });

    const html = await loadSection(section);
    render(html);
    if (anchor) scrollToAnchor(anchor);
  };

  // --- Eventos ---
  // Navegación por clic en el sidebar (evita recargar y gestiona hash)
  sidebar.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-section]');
    if (!a) return;
    e.preventDefault();
    const section = a.getAttribute('data-section');
    const anchor = a.getAttribute('data-anchor') || '';
    const nextHash = anchor ? `#${section}/${anchor}` : `#${section}`;
    if (location.hash !== nextHash) {
      location.hash = nextHash; // disparará hashchange -> route()
    } else {
      // mismo hash: dispara routing manual (útil si el usuario vuelve a pulsar)
      route();
    }
  });

  window.addEventListener('hashchange', route);

  // --- Arranque ---
  (async () => {
    // Hash por defecto
    if (!location.hash) location.hash = '#servicios';
    await route();
  })();
})();
