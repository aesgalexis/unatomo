
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

  // Construye submenús con criterio:
// - No incluye el H2 principal de la sección (evita duplicar, p.ej. "Asesoría").
// - Si el H2 principal tiene justo debajo un <p><strong>…</strong></p>, lo usa como primer ítem (tagline).
function buildSubmenus() {
  menuItems.forEach(mi => {
    const key = mi.dataset.key;
    const section = sections.find(s => s.dataset.section === key);
    const box = mi.querySelector('.submenu');
    if (!box || !section) return;

    box.innerHTML = '';

    // Encuentra el H2 principal de la sección (el título grande)
    const allHeads = [...section.querySelectorAll('h2, h3')];
    const mainH2 = section.querySelector('h2'); // primer h2 del bloque
    const isHome = key === 'home';

    // 1) Tagline: <p><strong>...</strong></p> inmediatamente después del H2 principal
    //    (lo añadimos como PRIMER item, excepto en "home").
    if (!isHome && mainH2) {
      const next = mainH2.nextElementSibling;
      const strongInP =
        next?.tagName?.toLowerCase() === 'p' &&
        next.querySelector('strong');

      if (strongInP) {
        const targetEl = next; // anclamos al <p> del tagline
        const label = next.querySelector('strong').textContent.trim();
        const id = ensureId(targetEl, 'tagline');

        const a = document.createElement('a');
        a.href = `#${key}`;
        a.dataset.section = key;
        a.dataset.target = id;
        a.textContent = label;

        a.addEventListener('click', (e) => {
          e.preventDefault();

          // Activa la sección si no lo está
          if (!section.classList.contains('is-active')) {
            history.pushState({ key }, '', `#${key}`);
            activate(key);
          }

          // Marca el subitem activo
          box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

          // Limpia resaltados previos SOLO de esta sección
          section.querySelectorAll('.hl-wrap').forEach(unwrap);
          section.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));

          // Resalta el STRONG del tagline
          const strong = targetEl.querySelector('strong');
          if (strong && !strong.querySelector('.hl-wrap')) {
            const span = document.createElement('span');
            span.className = 'hl-wrap';
            while (strong.firstChild) span.appendChild(strong.firstChild);
            strong.appendChild(span);
          }
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Mantener abierto este submenú
          setOpen(key);
        });

        box.appendChild(a);
      }
    }

    // 2) Subapartados: todos los h2/h3 MENOS el H2 principal
    const heads = allHeads.filter(h => h !== mainH2);

    heads.forEach((h, idx) => {
      const id = ensureId(h, `sub-${idx + 1}`);

      const a = document.createElement('a');
      a.href = `#${key}`;
      a.dataset.section = key;
      a.dataset.target = id;
      a.textContent = (h.textContent || '').trim();

      a.addEventListener('click', (e) => {
        e.preventDefault();

        // Activa la sección si no lo está
        if (!section.classList.contains('is-active')) {
          history.pushState({ key }, '', `#${key}`);
          activate(key);
        }

        // Marca este subitem y desmarca el resto dentro de este submenú
        box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

        // Limpia resaltados previos de ESTE section y aplica nuevo wrapper
        section.querySelectorAll('.hl-wrap').forEach(unwrap);
        section.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));

        if (!h.querySelector('.hl-wrap')) {
          const span = document.createElement('span');
          span.className = 'hl-wrap';
          while (h.firstChild) span.appendChild(h.firstChild);
          h.appendChild(span);
        }
        h.classList.add('is-highlighted');
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Mantener abierto este submenú
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
        const willClose = openKey === key; // segundo clic sobre el mismo => colapsa

        history.pushState({ key }, '', `#${key}`);
        activate(key);
        setOpen(willClose ? null : key); // si colapsa, resetea subitems y marcado
      });
    });
  }

  // Logo: a "home" y abre solo su submenú (resetea el que estuviera)
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    const key = 'home';
    history.pushState({ key }, '', `#${key}`);
    activate(key);
    setOpen('home');
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

  // Back/forward: sincroniza sección y abre su submenú
  window.addEventListener('popstate', () => {
    const key = (location.hash || '#home').slice(1);
    activate(key);
    setOpen(key);
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

// === Cargar footer externo  ===
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

    // Los enlaces del footer que apuntan a secciones usan tu navegación SPA
    footerEl?.querySelectorAll('a[data-section]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const key = a.getAttribute('data-section');
        if (!key) return;
        history.pushState({ key }, '', `#${key}`);
        // Reutilizamos funciones del router ya cargado:
        // Simulamos un popstate para sincronizar (como ya haces)
        window.dispatchEvent(new PopStateEvent('popstate'));
        // Foco al contenido principal
        document.getElementById('app')?.focus({ preventScroll: true });
      });
    });

  } catch (err) {
    console.warn('[footer] carga diferida falló:', err);
  }
})();
