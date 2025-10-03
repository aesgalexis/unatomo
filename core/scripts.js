// scripts.js (ES module)

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

  const menuRoot = document.getElementById('sidebar-menu');
  const topItems = [...menuRoot.querySelectorAll(':scope > .menu-item')]; // nivel 1
  const servicesItem = menuRoot.querySelector('.menu-item[data-key="servicios"]'); // "Servicios"
  const level2Groups = [...servicesItem.querySelectorAll('.submenu-group')]; // nivel 2 dentro de Servicios

  // Anchors útiles para activar clases
  const topAnchors = topItems
    .map(mi => mi.querySelector(':scope > a[data-section]'))
    .filter(Boolean);
  const lvl2Links = level2Groups
    .map(g => g.querySelector(':scope > a.lvl2-link[data-section]'))
    .filter(Boolean);

  // Estado de apertura
  let openKey = 'home';          // top-level abierto (home/servicios/…)
  let openSecondKey = null;      // si openKey === 'servicios': seccion-1..6

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
  function isInViewport(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return r.bottom >= 0 && r.right >= 0 && r.top <= vh && r.left <= vw;
  }

  // Quitar wrapper .hl-wrap manteniendo contenido
  function unwrap(el) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  // Activa una sección: marca activo nivel 1 ó nivel 2 según corresponda
  function activate(sectionKey) {
    sections.forEach(s => s.classList.toggle('is-active', s.dataset.section === sectionKey));

    topAnchors.forEach(a => a.classList.remove('is-active'));
    lvl2Links.forEach(a => a.classList.remove('is-active'));

    const isLv2 = /^seccion-[1-6]$/.test(sectionKey);
    if (isLv2) {
      servicesItem?.querySelector(':scope > a[data-section="servicios"]')?.classList.add('is-active');
      lvl2Links.find(a => a.dataset.section === sectionKey)?.classList.add('is-active');
    } else {
      topAnchors.find(a => a.dataset.section === sectionKey)?.classList.add('is-active');
    }

    app?.focus({ preventScroll: true });
  }

  // Visual de acordeones abiertos
  function updateOpenVisual() {
    topItems.forEach(mi => mi.classList.toggle('is-open', mi.dataset.key === openKey));
    level2Groups.forEach(g => g.classList.toggle('is-open', g.dataset.key === openSecondKey));
  }

  function resetSubmenu(key) {
    if (!key) return;
    const group = level2Groups.find(g => g.dataset.key === key);
    if (group) {
      group.querySelectorAll('.submenu.lvl3 a.is-sub-active').forEach(a => a.classList.remove('is-sub-active'));
    }
    const sec = document.querySelector(`.section[data-section="${key}"]`);
    if (sec) {
      sec.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(h => h.classList.remove('is-highlighted'));
      sec.querySelectorAll('.hl-wrap').forEach(unwrap);
    }
  }

  function setOpen(nextKey) {
    const prev = openKey;
    openKey = nextKey;
    updateOpenVisual();

    if (nextKey !== 'servicios') resetSecondLevel();

    if (prev && prev !== nextKey) {
      if (prev === 'servicios') {
        level2Groups.forEach(g => resetSubmenu(g.dataset.key));
      } else {
        resetSubmenu(prev);
      }
    }
  }

  function setOpenSecond(nextSecondKey) {
    const prev = openSecondKey;
    openSecondKey = nextSecondKey;
    updateOpenVisual();
    if (prev && prev !== nextSecondKey) resetSubmenu(prev);
  }

  function resetSecondLevel() {
    if (!openSecondKey) return;
    resetSubmenu(openSecondKey);
    openSecondKey = null;
    updateOpenVisual();
  }

  // Construye submenús (nivel 3) con scroll inteligente
  function buildSubmenus() {
    level2Groups.forEach(group => {
      const key = group.dataset.key; // "seccion-1"… "seccion-6"
      const section = sections.find(s => s.dataset.section === key);
      const box = group.querySelector('.submenu.lvl3');
      if (!box || !section) return;

      box.innerHTML = '';

      const allHeads = [...section.querySelectorAll('h2, h3')];
      const mainH2 = section.querySelector('h2');

      // 1) Tagline (p > strong) justo tras H2
      if (mainH2) {
        const next = mainH2.nextElementSibling;
        const strongInP = next?.tagName?.toLowerCase() === 'p' && next.querySelector('strong');

        if (strongInP) {
          const targetEl = next;
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

            section.querySelectorAll('.hl-wrap').forEach(unwrap);
            section.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));

            const strong = targetEl.querySelector('strong');
            if (strong && !strong.querySelector('.hl-wrap')) {
              const span = document.createElement('span');
              span.className = 'hl-wrap';
              while (strong.firstChild) span.appendChild(strong.firstChild);
              strong.appendChild(span);
            }

            if (!isInViewport(targetEl)) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            setOpen('servicios');
            setOpenSecond(key);
          });

          box.appendChild(a);
        }
      }

      // 2) Resto de subapartados: todos los h2/h3 MENOS el H2 principal
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

          if (!isInViewport(h)) {
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          setOpen('servicios');
          setOpenSecond(key);
        });

        box.appendChild(a);
      });
    });
  }

  // Top-level (nivel 1)
  function wireTopLevel() {
    topItems.forEach(mi => {
      const a = mi.querySelector(':scope > a[data-section]');
      if (!a) return;
      const key = a.dataset.section; // "home" | "servicios" | "seccion-7" | "seccion-8" | "seccion-9"

      a.addEventListener('click', (e) => {
        e.preventDefault();

        if (key === 'servicios') {
          const willClose = openKey === 'servicios';
          setOpen(willClose ? null : 'servicios');
          return;
        }

        const willClose = openKey === key;
        history.pushState({ key, from: 'top' }, '', `#${key}`);
        activate(key);
        setOpen(willClose ? null : key);

        scrollToTop();
      });
    });
  }

  // Nivel 2 dentro de "Servicios"
  function wireLevel2() {
    level2Groups.forEach(group => {
      const link = group.querySelector(':scope > a.lvl2-link[data-section]');
      if (!link) return;
      const key = link.dataset.section; // seccion-1..6

      link.addEventListener('click', (e) => {
        e.preventDefault();

        history.pushState({ key, from: 'top' }, '', `#${key}`);
        activate(key);

        setOpen('servicios');
        setOpenSecond(key);

        scrollToTop();
      });
    });
  }

  // Logo → home
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    const key = 'home';
    history.pushState({ key, from: 'top' }, '', `#${key}`);
    activate(key);
    setOpen('home');
    scrollToTop();
  });

  // Arranque
  const initialKey = 'home';
  const fromHash = (location.hash || `#${initialKey}`).slice(1);
  const valid = sections.some(s => s.dataset.section === fromHash);
  const startKey = valid ? fromHash : initialKey;
  if (startKey !== fromHash) history.replaceState({ key: initialKey }, '', `#${initialKey}`);

  buildSubmenus();
  wireTopLevel();
  wireLevel2();
  activate(startKey);

  if (/^seccion-[1-6]$/.test(startKey)) {
    setOpen('servicios');
    setOpenSecond(startKey);
  } else {
    setOpen(startKey); // home / seccion-7 / seccion-8 / seccion-9
  }

  // Back/forward
  window.addEventListener('popstate', () => {
    const key = (location.hash || '#home').slice(1);
    activate(key);

    if (/^seccion-[1-6]$/.test(key)) {
      setOpen('servicios');
      setOpenSecond(key);
    } else {
      setOpen(key);
    }

    scrollToTop();
  });
})();

/* ===========================
   3) Footer: carga diferida
   =========================== */
(async () => {
  try {
    const r = await fetch('./footer.html', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No se pudo cargar el footer');
    const html = await r.text();

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const footerEl = temp.querySelector('#site-footer');
    if (footerEl) document.body.appendChild(footerEl);

    // Año dinámico
    footerEl?.querySelector('#year-now')?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));

    // Enlaces del footer -> SPA + arriba
    footerEl?.querySelectorAll('a[data-section]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const key = a.getAttribute('data-section');
        if (!key) return;

        history.pushState({ key, from: 'top' }, '', `#${key}`);
        window.dispatchEvent(new PopStateEvent('popstate'));

        document.getElementById('app')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    });

  } catch (err) {
    console.warn('[footer] carga diferida falló:', err);
  }
})();
