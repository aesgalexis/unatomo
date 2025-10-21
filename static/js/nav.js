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
  const topAnchors = topItems.map(mi => mi.querySelector(':scope > a[data-section]')).filter(Boolean);
  const lvl2Links = level2Groups.map(g => g.querySelector(':scope > a.lvl2-link[data-section]')).filter(Boolean);

  // Estado de apertura
  let openKey = 'home';          // top-level abierto (home/servicios/…)
  let openSecondKey = null;      // si openKey === 'servicios': seccion_lvl2-…

  // Utils
  const slug = (t) => t.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,64);

  function ensureId(el, base = 'sub') {
    if (el.id) return el.id;
    const seed = slug((el.textContent || base).slice(0, 64)) || base;
    let id = seed, n = 1;
    while (document.getElementById(id)) id = `${seed}-${n++}`;
    el.id = id;
    return id;
  }

  function scrollToTop() { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }
  function isInViewport(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return r.bottom >= 0 && r.right >= 0 && r.top <= vh && r.left <= vw;
  }
  function unwrap(el) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  // --- Colapsar todo al inicio para evitar flash abierto y clases duras ---
  (function preCollapse() {
    // quita 'is-open' hardcodeadas del HTML
    topItems.forEach(mi => mi.classList.remove('is-open'));
    level2Groups.forEach(g => g.classList.remove('is-open'));
    menuRoot.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
     
    // oculta lvl2 y todos los lvl3
    const lvl2 = servicesItem?.querySelector('.submenu.lvl2');
    if (lvl2) { lvl2.hidden = true; lvl2.style.display = 'none'; }
    level2Groups.forEach(g => {
      const box = g.querySelector('.submenu.lvl3');
      if (box) { box.hidden = true; box.style.display = 'none'; }
    });
  })();

  // Activa una sección (marca activo nivel 1 o nivel 2 según corresponda)
  function activate(sectionKey) {
    sections.forEach(s => s.classList.toggle('is-active', s.dataset.section === sectionKey));
    topAnchors.forEach(a => a.classList.remove('is-active'));
    lvl2Links.forEach(a => a.classList.remove('is-active'));

    // ⬇️ cambio: nivel 2 ahora es seccion_lvl2-n
    const isLv2 = /^seccion_lvl2-\d+$/.test(sectionKey);

    if (isLv2) {
      servicesItem?.querySelector(':scope > a[data-section]')?.classList.add('is-active');
      lvl2Links.find(a => a.dataset.section === sectionKey)?.classList.add('is-active');
    } else {
      topAnchors.find(a => a.dataset.section === sectionKey)?.classList.add('is-active');
    }
    app?.focus({ preventScroll: true });
  }

  // Acordeones (estado visual)
  function updateOpenVisual() {
    topItems.forEach(mi => mi.classList.toggle('is-open', mi.dataset.key === openKey));
    level2Groups.forEach(g => g.classList.toggle('is-open', g.dataset.key === openSecondKey));
    updateMenuVisibility();
  }

  // Visibilidad real (robusta): usa hidden + style.display para evitar overrides
  function setDisplay(el, visible) {
    if (!el) return;
    el.hidden = !visible;
    el.style.display = visible ? '' : 'none';
  }
  function updateMenuVisibility() {
    const lvl2 = servicesItem?.querySelector('.submenu.lvl2');
    setDisplay(lvl2, openKey === 'servicios');

    level2Groups.forEach(g => {
      const box = g.querySelector('.submenu.lvl3');
      const visible = openKey === 'servicios' && g.dataset.key === openSecondKey;
      setDisplay(box, visible);
    });
  }

  function resetSubmenu(key) {
    if (!key) return;
    const group = level2Groups.find(g => g.dataset.key === key);
    if (group) group.querySelectorAll('.submenu.lvl3 a.is-sub-active').forEach(a => a.classList.remove('is-sub-active'));
    const sec = document.querySelector(`.section[data-section="${key}"]`);
    if (sec) {
      sec.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(h => h.classList.remove('is-highlighted'));
      sec.querySelectorAll('.hl-wrap').forEach(unwrap);
    }
  }

  function setOpen(nextKey) {
    const prev = openKey;
    openKey = nextKey;
    // si abrimos Servicios sin grupo, asegúrate de que lvl3 estén cerrados
    if (openKey === 'servicios' && !openSecondKey) level2Groups.forEach(g => setDisplay(g.querySelector('.submenu.lvl3'), false));
    updateOpenVisual();

    if (nextKey !== 'servicios') resetSecondLevel();
    if (prev && prev !== nextKey) {
      if (prev === 'servicios') level2Groups.forEach(g => resetSubmenu(g.dataset.key));
      else resetSubmenu(prev);
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

  // Construye submenús (nivel 3)
  function buildSubmenus() {
    level2Groups.forEach(group => {
      const key = group.dataset.key; // ej: "seccion_lvl2-1"
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

      // Asegura que al iniciar, TODOS los lvl3 estén colapsados
      setDisplay(box, false);
    });
  }

  // Top-level (nivel 1)
  function wireTopLevel() {
    topItems.forEach(mi => {
      const a = mi.querySelector(':scope > a[data-section]');
      if (!a) return;
      const key = a.dataset.section;
      const isServices = mi.dataset.key === 'servicios'; // ⬅️ robusto

      a.addEventListener('click', (e) => {
        e.preventDefault();

        if (isServices) {
          const willClose = openKey === 'servicios';
          // toggle Servicios; si lo abrimos, lvl2 visible y lvl3 cerrados
          setOpen(willClose ? null : 'servicios');
          if (!willClose) {
            setOpenSecond(null); // categorías empiezan cerradas
          }
          return;
        }

        // Resto de top-level: navegar directamente
        history.pushState({ key, from: 'top' }, '', `#${key}`);
        activate(key);
        setOpen(key);
        scrollToTop();
      });
    });
  }

  // Nivel 2 dentro de "Servicios" (toggle por grupo)
  function wireLevel2() {
    level2Groups.forEach(group => {
      const link = group.querySelector(':scope > a.lvl2-link[data-section]');
      if (!link) return;
      const key = link.dataset.section; // seccion_lvl2-…

      link.addEventListener('click', (e) => {
        e.preventDefault();

        // Toggle del grupo
        if (openSecondKey === key) {
          setOpenSecond(null);           // cerrar si ya estaba abierto
          return;
        }

        // Abrir este grupo y navegar a su sección
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
const rawStart = valid ? fromHash : initialKey;

// Normaliza: si el hash es el contenedor de Servicios (seccion-2), empezamos en home
const startKey = (rawStart === 'seccion-2') ? 'home' : rawStart;

if (startKey !== fromHash) {
  history.replaceState({ key: startKey }, '', `#${startKey}`);
}

buildSubmenus();
wireTopLevel();
wireLevel2();
activate(startKey);

  // ⬇️ cambio: detección de nivel 2 por patrón seccion_lvl2-…
  if (/^seccion_lvl2-\d+$/.test(startKey)) {
    setOpen('servicios');
    setOpenSecond(startKey);
  } else {
    setOpen(startKey); // home / seccion-3..9, etc.
    setOpenSecond(null);
  }
  updateMenuVisibility(); // estado visual inicial robusto

  // Back/forward
  window.addEventListener('popstate', () => {
    const key = (location.hash || '#home').slice(1);
    activate(key);

    if (/^seccion_lvl2-\d+$/.test(key)) {
      setOpen('servicios');
      setOpenSecond(key);
    } else {
      setOpen(key);
      setOpenSecond(null);
    }

    updateMenuVisibility();
    scrollToTop();
  });
})();

/* ===========================
   3) Footer: carga diferida
   =========================== */
(() => {
  const y = document.getElementById('year-now');
  if (y) y.textContent = String(new Date().getFullYear());

  // Si tienes enlaces con data-section en el footer inline:
  document.querySelectorAll('#site-footer a[data-section]').forEach(a => {
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
})();

