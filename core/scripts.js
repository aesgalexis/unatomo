// scripts.js (ES module)

// === Imports para el mapa ===
import { geoMercator, geoPath } from "https://esm.sh/d3-geo@3";
import { feature } from "https://esm.sh/topojson-client@3";

/* ===========================
   1) Botón modo claro/oscuro
   =========================== */
(() => {
  'use strict';
  const STORAGE_KEY = 'ui-theme'; // 'light' | 'dark'
  const btn = document.getElementById('themeToggle');
  const metaColor = document.querySelector('meta[name="color-scheme"]');

  // Preferencia: guardada o blanco por defecto
  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = (saved === 'light' || saved === 'dark') ? saved : 'light';
  applyTheme(initial);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (e) => {
    const hasManual = localStorage.getItem(STORAGE_KEY);
    if (hasManual) return;
    applyTheme(e.matches ? 'dark' : 'light');
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);

  btn?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;

    const icon  = mode === 'dark' ? '☀️' : '🌙';
    const text  = mode === 'dark' ? 'Light' : 'Dark'; // etiqueta visible
    const label = mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

    btn?.querySelector('.icon')?.replaceChildren(document.createTextNode(icon));
    btn?.querySelector('.label')?.replaceChildren(document.createTextNode(text));
    if (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }

    if (metaColor) metaColor.setAttribute('content', mode === 'dark' ? 'dark light' : 'light dark');
  }
})();

/* =========================================
   2) Navegación, submenús y resaltados (UI)
   ========================================= */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const sections = [...document.querySelectorAll('.section')];
  const brand = document.querySelector('.brand');
  const menuItems = [...document.querySelectorAll('.menu .menu-item')];

  // Submenú abierto (null = ninguno). Por defecto queremos Bienvenidos abierto.
  let openKey = 'home';

  // Utilidad: slug simple si hiciera falta generar ids
  const slug = (t) => t.toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu,'')
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-')
    .slice(0,64);

  // Asegura un id único sobre un elemento (con base opcional)
  function ensureId(el, base = 'sub') {
    if (el.id) return el.id;
    const seed = slug((el.textContent || base).slice(0, 64)) || base;
    let id = seed, n = 1;
    while (document.getElementById(id)) id = `${seed}-${n++}`;
    el.id = id;
    return id;
  }

  // Helpers de scroll/visibilidad
  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  // ¿El elemento es visible en el viewport (aunque sea parcialmente)?
  function isInViewport(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return r.bottom >= 0 && r.right >= 0 && r.top <= vh && r.left <= vw;
  }

  // Utilidad: quitar un wrapper .hl-wrap manteniendo su contenido
  function unwrap(el) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  // Activa una sección
  function activate(sectionKey) {
    sections.forEach(s => s.classList.toggle('is-active', s.dataset.section === sectionKey));
    menuItems.forEach(mi => {
      const a = mi.querySelector('a[data-section]');
      a.classList.toggle('is-active', a.dataset.section === sectionKey);
    });
    if (app) app.focus({ preventScroll: true });
  }

  // Visual de submenú abierto
  function updateOpenVisual() {
    menuItems.forEach(mi => mi.classList.toggle('is-open', mi.dataset.key === openKey));
  }

  // Reset de un submenú y su contenido (quita estado de subitems y resaltados)
  function resetSubmenu(key) {
    if (!key) return;
    const mi = document.querySelector(`.menu .menu-item[data-key="${key}"]`);
    if (mi) mi.querySelectorAll('.submenu a.is-sub-active').forEach(a => a.classList.remove('is-sub-active'));

    const sec = document.querySelector(`.section[data-section="${key}"]`);
    if (sec) {
      sec.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(h => h.classList.remove('is-highlighted'));
      sec.querySelectorAll('.hl-wrap').forEach(unwrap);
    }
  }

  // Abre/cierra submenús (y resetea cuando corresponde)
  function setOpen(nextKey) {
    const prev = openKey;
    openKey = nextKey;
    updateOpenVisual();

    if (prev && prev !== nextKey) resetSubmenu(prev);
    if (nextKey === null) resetSubmenu(prev);
  }

  // Construye submenús con criterio y scroll inteligente
  // - No incluye el H2 principal de la sección (evita duplicar títulos).
  // - Si el H2 tiene debajo un <p><strong>…</strong></p>, lo usa como primer ítem (tagline), excepto en "home".
  function buildSubmenus() {
    menuItems.forEach(mi => {
      const key = mi.dataset.key;
      const section = sections.find(s => s.dataset.section === key);
      const box = mi.querySelector('.submenu');
      if (!box || !section) return;

      box.innerHTML = '';

      // Título principal (primer h2 de la sección)
      const allHeads = [...section.querySelectorAll('h2, h3')];
      const mainH2 = section.querySelector('h2');
      const isHome = key === 'home';

      // 1) Tagline (p > strong) justo bajo el h2 principal -> primer ítem (excepto en "home")
      if (!isHome && mainH2) {
        const next = mainH2.nextElementSibling;
        const strongInP = next?.tagName?.toLowerCase() === 'p' && next.querySelector('strong');

        if (strongInP) {
          const targetEl = next; // anclamos al <p> del tagline
          const label = next.querySelector('strong').textContent.trim();
          ensureId(targetEl, 'tagline');

          const a = document.createElement('a');
          a.href = `#${key}`;
          a.dataset.section = key;
          a.dataset.target = targetEl.id;
          a.textContent = label;

          a.addEventListener('click', (e) => {
            e.preventDefault();

            if (!section.classList.contains('is-active')) {
              history.pushState({ key }, '', `#${key}`);
              activate(key);
            }

            box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

            // limpiar resaltados anteriores en ESTA sección
            section.querySelectorAll('.hl-wrap').forEach(unwrap);
            section.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));

            // resaltar el STRONG del tagline
            const strong = targetEl.querySelector('strong');
            if (strong && !strong.querySelector('.hl-wrap')) {
              const span = document.createElement('span');
              span.className = 'hl-wrap';
              while (strong.firstChild) span.appendChild(strong.firstChild);
              strong.appendChild(span);
            }

            // scroll condicional: solo si NO está visible
            if (!isInViewport(targetEl)) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            setOpen(key);
          });

          box.appendChild(a);
        }
      }

      // 2) Resto de subapartados: todos los h2/h3 MENOS el h2 principal
      const heads = allHeads.filter(h => h !== mainH2);

      heads.forEach((h, idx) => {
        ensureId(h, `sub-${idx + 1}`);

        const a = document.createElement('a');
        a.href = `#${key}`;
        a.dataset.section = key;
        a.dataset.target = h.id;
        a.textContent = (h.textContent || '').trim();

        a.addEventListener('click', (e) => {
          e.preventDefault();

          if (!section.classList.contains('is-active')) {
            history.pushState({ key }, '', `#${key}`);
            activate(key);
          }

          box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

          section.querySelectorAll('.hl-wrap').forEach(unwrap);
          section.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));

          if (!h.querySelector('.hl-wrap')) {
            const span = document.createElement('span');
            span.className = 'hl-wrap';
            while (h.firstChild) span.appendChild(h.firstChild);
            h.appendChild(span);
          }
          h.classList.add('is-highlighted');

          // scroll condicional: solo si NO está visible
          if (!isInViewport(h)) {
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          setOpen(key);
        });

        box.appendChild(a);
      });
    });
  }

  // Click en top-level: toggle abrir/cerrar, y navegar a su sección
  function wireTopLevel() {
    menuItems.forEach(mi => {
      const a = mi.querySelector('a[data-section]');
      const key = a.dataset.section;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const willClose = openKey === key;

        history.pushState({ key, from: 'top' }, '', `#${key}`);
        activate(key);
        setOpen(willClose ? null : key);

        // siempre al inicio al cambiar de sección
        scrollToTop();
      });
    });
  }

  // Logo: a "home" y abre solo su submenú
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    const key = 'home';
    history.pushState({ key, from: 'top' }, '', `#${key}`);
    activate(key);
    setOpen('home');

    // subir al inicio
    scrollToTop();
  });

  // Arranque: ir a hash válido o a home; submenú abierto solo en "home"
  const initialKey = 'home';
  const fromHash = (location.hash || `#${initialKey}`).slice(1);
  const valid = sections.some(s => s.dataset.section === fromHash);
  const startKey = valid ? fromHash : initialKey;
  if (startKey !== fromHash) history.replaceState({ key: initialKey }, '', `#${initialKey}`);

  buildSubmenus();
  wireTopLevel();
  activate(startKey);
  setOpen('home'); // todos colapsados salvo Bienvenidos

  // Back/forward: sincroniza sección y abre su submenú + arriba del todo
  window.addEventListener('popstate', () => {
    const key = (location.hash || '#home').slice(1);
    activate(key);
    setOpen(key);

    // subir al principio también con back/forward
    scrollToTop();
  });
})();

/* ===========================
   3) Mapa (D3 + TopoJSON)
   =========================== */
(() => {
  'use strict';
  const container = document.getElementById("action-map");
  if (!container) return;

  /* Países permitidos (ISO 3166-1 alpha-2) -> azul */
  const ALLOWED = new Set([
    "ES","PT","FR","DE","IT","GB","IE","BE","NL","LU","CH","AT",
    "DK","NO","SE","FI","PL","CZ","SK","HU","SI","HR","BA","RS","ME","MK","AL",
    "GR","BG","RO","MD","UA","LT","LV","EE","IS","TR","CY","MT","AD","MC","SM",
    "VA","LI"/*, "MA","TN","DZ" si quieres norte de África */
  ]);

  /* world-atlas usa IDs numéricos (ISO numeric). Mapeo mínimo -> alpha-2 */
  const NUM_TO_A2 = {
    "724":"ES","620":"PT","250":"FR","276":"DE","380":"IT","826":"GB","372":"IE",
    "056":"BE","528":"NL","442":"LU","756":"CH","040":"AT","208":"DK","578":"NO",
    "752":"SE","246":"FI","616":"PL","203":"CZ","703":"SK","348":"HU","705":"SI",
    "191":"HR","070":"BA","688":"RS","499":"ME","807":"MK","008":"AL","300":"GR",
    "100":"BG","642":"RO","498":"MD","804":"UA","440":"LT","428":"LV","233":"EE",
    "352":"IS","792":"TR","196":"CY","470":"MT","020":"AD","492":"MC","674":"SM",
    "336":"VA","438":"LI","112":"BY","643":"RU"
  };

  async function loadTopology() {
    // 1) Intenta local
    try {
      const r = await fetch("./assets/countries-110m.json", { cache: "force-cache" });
      if (r.ok) return r.json();
      throw new Error("local not found");
    } catch {
      // 2) Fallback CDN
      const r = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
      return r.json();
    }
  }

  function drawMap(topo) {
    // Base virtual 700x500; el SVG escalará con CSS (aspect-ratio)
    const W = 700, H = 500, PAD = 12;

    // Crea SVG
    container.innerHTML = "";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    container.appendChild(svg);

    const proj = geoMercator();
    const path = geoPath(proj, null);

    // Enfocar Europa con un bbox aproximado
    const europeBBox = { type:"Polygon", coordinates:[[[-25,32],[40,32],[40,72],[-25,72],[-25,32]]] };

    proj.fitExtent([[PAD, PAD], [W - PAD, H - PAD]], europeBBox);

    const countries = feature(topo, topo.objects.countries).features;

    // Dibujo
    const g = document.createElementNS(svgNS, "g");
    svg.appendChild(g);

    for (const f of countries) {
      const id = String(f.id).padStart(3, "0");
      const a2 = NUM_TO_A2[id];
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", path(f));
      p.setAttribute("class", `country${a2 && ALLOWED.has(a2) ? " allowed" : ""}`);
      p.setAttribute("data-iso", a2 || id);
      g.appendChild(p);
    }
  }

  (async () => {
    const topo = await loadTopology();
    drawMap(topo);
  })();
})();

// === Cargar footer externo (footer.html) ===
(async () => {
  try {
    const r = await fetch('./footer.html', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No se pudo cargar el footer');
    const html = await r.text();

    // Inserta al final del <body>
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const footerEl = temp.querySelector('#site-footer');
    if (footerEl) document.body.appendChild(footerEl);

    // Año dinámico
    const y = footerEl?.querySelector('#year-now');
    if (y) y.textContent = String(new Date().getFullYear());

    // Enlaces del footer que apuntan a secciones -> SPA + arriba del todo
    footerEl?.querySelectorAll('a[data-section]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const key = a.getAttribute('data-section');
        if (!key) return;

        history.pushState({ key, from: 'top' }, '', `#${key}`);
        window.dispatchEvent(new PopStateEvent('popstate'));

        // foco y arriba del todo
        document.getElementById('app')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    });

  } catch (err) {
    console.warn('[footer] carga diferida falló:', err);
  }
})();
