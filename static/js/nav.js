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
  let openKey = 'seccion-1';     // top-level abierto por defecto (Inicio)
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

  // --- Colapsar todo al inicio para evitar flash ---
  (function preCollapse() {
    topItems.forEach(mi => mi.classList.remove('is-open'));
    level2Groups.forEach(g => g.classList.remove('is-open'));
    menuRoot.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));

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
    topItems.forEach(mi => mi.classList.toggle('is-open', mi?.dataset?.key === openKey));
    level2Groups.forEach(g => g.classList.toggle('is-open', g.dataset.key === openSecondKey));
    updateMenuVisibility();
  }

  // Visibilidad real
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
          a.href = '#'; // accesible, pero no cambia URL
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
        a.href = '#'; // no cambia URL
        a.dataset.section = key;
        a.dataset.target = h.id;
        a.textContent = (h.textContent || '').trim();

        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (!section.classList.contains('is-active')) {
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
      const isServices = mi.dataset.key === 'servicios';

      a.addEventListener('click', (e) => {
        e.preventDefault();

        if (isServices) {
          const willClose = openKey === 'servicios';
          setOpen(willClose ? null : 'servicios');
          if (!willClose) setOpenSecond(null);
          return;
        }

        // Resto de top-level: navegar internamente SIN tocar la URL
        activate(key);
        setOpen(key);
        setOpenSecond(null);
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

        if (openSecondKey === key) {
          setOpenSecond(null);
          return;
        }

        activate(key);
        setOpen('servicios');
        setOpenSecond(key);
        scrollToTop();
      });
    });
  }

  // Logo → Inicio (seccion-1)
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    const key = 'seccion-1';
    activate(key);
    setOpen(key);
    setOpenSecond(null);
    scrollToTop();
  });

  // Arranque simple: ignora location.hash y empieza en Inicio
  const startKey = 'seccion-1';

  buildSubmenus();
  wireTopLevel();
  wireLevel2();
  activate(startKey);

  if (/^seccion_lvl2-\d+$/.test(startKey)) {
    setOpen('servicios');
    setOpenSecond(startKey);
  } else {
    setOpen(startKey);
    setOpenSecond(null);
  }
  updateMenuVisibility(); // estado visual inicial
})();
