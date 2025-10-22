(() => {
  'use strict';

  // --- Mapeo de secciones -> partials ---
  const SECTION_TO_PARTIAL = {
    'inicio': '/static/content/inicio.html',
    'servicios': '/static/content/servicios.html',
  };

  const contentEl = document.getElementById('content');
  const sidebar = document.getElementById('sidebar-menu');
  const cache = new Map(); // key: partial path -> html string

  // --- Utils de routing ---
  const parseHash = () => {
    // formatos: #inicio | #servicios | #servicios/asesoria
    const raw = (location.hash || '#inicio').slice(1);
    const [section = 'inicio', anchor = ''] = raw.split('/');
    return { section, anchor };
  };

  const setAriaCurrent = ({ section, anchor }) => {
    sidebar.querySelectorAll('a[aria-current]').forEach(a => a.removeAttribute('aria-current'));

    // marca activo el enlace exacto (con data-anchor si aplica)
    let selector = `a[data-section="${section}"]`;
    if (anchor) selector += `[data-anchor="${anchor}"]`;

    const active = sidebar.querySelector(selector) ||
                   sidebar.querySelector(`a[data-section="${section}"]:not([data-anchor])`);
    if (active) active.setAttribute('aria-current', 'page');

    // abrir/cerrar <details> según sección
    sidebar.querySelectorAll('details.nav-group').forEach(d => {
      d.open = (d.dataset.section === section);
    });
  };

  const focusMain = () => document.getElementById('app')?.focus({ preventScroll: true });

  const fetchPartial = async (path) => {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(path, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
    const html = await res.text();
    cache.set(path, html);
    return html;
  };

  // --- Render helpers ---
  const renderHTML = (html) => {
    contentEl.innerHTML = html;
    focusMain();
  };

  const renderError = (msg) => {
    renderHTML(`<section><h1>Error</h1><p>${msg}</p></section>`);
  };

  // Extrae solo la subsección pedida: desde <h2 id="anchor"> hasta el siguiente <h2> o fin
  const extractSubsection = (fullHTML, anchor) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHTML, 'text/html');

    // localiza el h2 con ese id
    const start = doc.getElementById(anchor);
    if (!start || start.tagName.toLowerCase() !== 'h2') return null;

    const wrapper = doc.createElement('section');
    wrapper.id = `${anchor}-content`;

    // incluir el propio h2
    wrapper.appendChild(start.cloneNode(true));

    // ir cogiendo hermanos siguientes hasta el próximo H2
    let node = start.nextElementSibling;
    while (node && node.tagName.toLowerCase() !== 'h2') {
      wrapper.appendChild(node.cloneNode(true));
      node = node.nextElementSibling;
    }

    return wrapper.outerHTML;
  };

  const renderServiciosOverview = () => `
    <section id="servicios-overview">
      <h1>Servicios</h1>
      <p>Selecciona una categoría en el menú: asistencia técnica, mantenimiento, asesoría, control de producción,
         optimización de procesos o formación.</p>
    </section>
  `;

  const scrollToAnchor = (anchor) => {
  if (!anchor) return;

  const target = document.getElementById(anchor) || document.getElementById(`${anchor}-content`);
  if (!target) return;

  // Calcula si el elemento está visible en pantalla
  const rect = target.getBoundingClientRect();
  const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

  if (!isVisible) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

  // --- Router principal ---
  const route = async () => {
    const { section, anchor } = parseHash();
    setAriaCurrent({ section, anchor });

    try {
      // INICIO
      if (section === 'inicio') {
        const html = await fetchPartial(SECTION_TO_PARTIAL.inicio);
        renderHTML(html);
        return;
      }

      // SERVICIOS (overview o subsección)
      if (section === 'servicios') {
        const full = await fetchPartial(SECTION_TO_PARTIAL.servicios);

        if (!anchor) {
          renderHTML(renderServiciosOverview());
          return;
        }

        const sliced = extractSubsection(full, anchor);
        if (sliced) {
          renderHTML(sliced);
          // highlight y scroll
          scrollToAnchor(anchor);
        } else {
          // si no existe el h2 pedido, mostramos overview
          renderHTML(renderServiciosOverview());
        }
        return;
      }

      // Si llega aquí, sección desconocida → fallback a inicio
      location.hash = '#inicio';
    } catch (err) {
      renderError('No se pudo cargar el contenido. Inténtalo de nuevo.');
      // console.error(err);
    }
  };

  // --- Enlaces del sidebar (evita navegación plena, usamos hash) ---
  sidebar.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-section]');
    if (!a) return;
    e.preventDefault();

    const section = a.getAttribute('data-section');
    const anchor = a.getAttribute('data-anchor') || '';
    const next = anchor ? `#${section}/${anchor}` : `#${section}`;

    if (location.hash !== next) {
      location.hash = next; // disparará hashchange→route
    } else {
      route(); // mismo hash, forzamos render (útil si reclick)
    }
  });

  window.addEventListener('hashchange', route);

  // --- Arranque ---
  (async () => {
    // hash por defecto
    if (!location.hash) location.hash = '#inicio';
    await route();
  })();
})();
