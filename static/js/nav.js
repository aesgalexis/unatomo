(() => {
  'use strict';

  const app = document.getElementById('app');
  const sections = [...document.querySelectorAll('.section')];
  const brand = document.querySelector('.brand');

  const menuRoot = document.getElementById('sidebar-menu');
  const topItems = [...menuRoot.querySelectorAll(':scope > .menu-item')];
  const hasChildrenItems = [...menuRoot.querySelectorAll(':scope > .menu-item.has-children')];

  // "Servicios" (para su lvl3 autogenerado actual)
  const servicesItem = menuRoot.querySelector('.menu-item[data-key="servicios"]');
  const level2GroupsServices = servicesItem
    ? [...servicesItem.querySelectorAll('.submenu-group')]
    : [];

  const topAnchors = topItems.map(mi => mi.querySelector(':scope > a[data-section]')).filter(Boolean);

  // Estado
  let openKey = 'seccion-1';   // item top abierto (por defecto: Inicio)
  let openSecondKey = null;    // SOLO para lvl3 de Servicios (seccion_lvl2-...)

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
    menuRoot.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));

    // Oculta todos los lvl2 de cualquier item con hijos
    menuRoot.querySelectorAll('.menu-item.has-children .submenu.lvl2').forEach(box => {
      box.hidden = true;
      box.style.display = 'none';
    });

    // Oculta todos los lvl3
    menuRoot.querySelectorAll('.submenu.lvl3').forEach(box => {
      box.hidden = true;
      box.style.display = 'none';
    });
  })();

  // Activar sección + marcas activas
  function activate(sectionKey) {
    sections.forEach(s => s.classList.toggle('is-active', s.dataset.section === sectionKey));
    topAnchors.forEach(a => a.classList.remove('is-active'));

    // Marca activo el anchor de top que apunte a esa sección
    const topA = topAnchors.find(a => a.dataset.section === sectionKey);
    if (topA) topA.classList.add('is-active');

    app?.focus({ preventScroll: true });
  }

  // Mostrar/ocultar lvl2 y lvl3
  function setDisplay(el, visible) {
    if (!el) return;
    el.hidden = !visible;
    el.style.display = visible ? '' : 'none';
  }

  function updateMenuVisibility() {
    // Cierra todos los lvl2
    menuRoot.querySelectorAll('.menu-item.has-children .submenu.lvl2')
      .forEach(box => setDisplay(box, false));

    // Abre el lvl2 del item abierto (si existe)
    const openItemLvl2 = menuRoot.querySelector(`.menu-item.has-children[data-key="${openKey}"] .submenu.lvl2`);
    setDisplay(openItemLvl2, !!openItemLvl2);

    // Lvl3 SOLO para Servicios (si usas ese árbol interno)
    if (servicesItem) {
      level2GroupsServices.forEach(g => {
        const box = g.querySelector('.submenu.lvl3');
        const visible = openKey === 'servicios' && g.dataset.key === openSecondKey;
        setDisplay(box, visible);
      });
    }
  }

  function updateOpenVisual() {
    topItems.forEach(mi => mi.classList.toggle('is-open', mi?.dataset?.key === openKey));
    updateMenuVisibility();
  }

  function resetHighlightsIn(sectionEl) {
    if (!sectionEl) return;
    sectionEl.querySelectorAll('.hl-wrap').forEach(unwrap);
    sectionEl.querySelectorAll('h2.is-highlighted, h3.is-highlighted').forEach(x => x.classList.remove('is-highlighted'));
  }

  function setOpen(nextKey) {
    const prev = openKey;
    openKey = nextKey || null;

    // Si abrimos Servicios y no hay grupo activo, cerramos todos los lvl3
    if (openKey === 'servicios' && !openSecondKey && servicesItem) {
      level2GroupsServices.forEach(g => setDisplay(g.querySelector('.submenu.lvl3'), false));
    }

    updateOpenVisual();

    // Al cerrar o cambiar de item, resetea subnivel de Servicios
    if (prev !== nextKey && prev === 'servicios') {
      openSecondKey = null;
      if (servicesItem) {
        level2GroupsServices.forEach(g => {
          const k = g.dataset.key;
          const sec = document.querySelector(`.section[data-section="${k}"]`);
          resetHighlightsIn(sec);
        });
      }
    }
  }

  // ---- Submenús genéricos (lvl2) en cualquier item.has-children ----
  function wireGenericLevel2() {
    // Toggle de los items con hijos (abre/cierra su lvl2)
    hasChildrenItems.forEach(mi => {
      const a = mi.querySelector(':scope > a[data-section]');
      if (!a) return;
      const itemKey = mi.dataset.key; // ej: "servicios", "seccion-8", etc.

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const willClose = openKey === itemKey;
        setOpen(willClose ? null : itemKey);
      });
    });

    // Clic en enlaces de lvl2 (navegan a una sección y, si tiene data-target, a su h3)
    menuRoot.querySelectorAll('.menu-item.has-children .lvl2-link[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        // ¿De qué item procede este lvl2?
        const parentItem = link.closest('.menu-item.has-children');
        const parentKey = parentItem?.dataset.key;
        const sectionKey = link.getAttribute('data-section');
        const targetId = link.getAttribute('data-target'); // opcional (p.ej. h3 dentro de la misma sección)

        // Activa la sección indicada
        activate(sectionKey);
        setOpen(parentKey || null);

        // Resalta destino si existe
        const sectionEl = document.querySelector(`.section[data-section="${sectionKey}"]`);
        resetHighlightsIn(sectionEl);

        if (targetId) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            if (!targetEl.querySelector('.hl-wrap')) {
              const span = document.createElement('span');
              span.className = 'hl-wrap';
              while (targetEl.firstChild) span.appendChild(targetEl.firstChild);
              targetEl.appendChild(span);
            }
            targetEl.classList.add('is-highlighted');
            if (!isInViewport(targetEl)) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        } else {
          scrollToTop();
        }

        // Si el item padre es Servicios y el lvl2 es una sección dedicada (seccion_lvl2-…),
        // activamos su segundo nivel para que funcione tu lvl3 existente:
        if (parentKey === 'servicios') {
          openSecondKey = sectionKey; // ej: "seccion_lvl2-1"
          updateMenuVisibility();
        }
      });
    });
  }

  // ---- Solo para Servicios: construir lvl3 desde H2/H3 de cada sección de lvl2 ----
  function buildServicesLvl3() {
    if (!servicesItem) return;

    level2GroupsServices.forEach(group => {
      const key = group.dataset.key; // ej: "seccion_lvl2-1"
      const section = sections.find(s => s.dataset.section === key);
      const box = group.querySelector('.submenu.lvl3');
      if (!box || !section) return;

      box.innerHTML = '';

      const allHeads = [...section.querySelectorAll('h2, h3')];
      const mainH2 = section.querySelector('h2');

      // 1) Tagline (p > strong) tras el H2 principal
      if (mainH2) {
        const next = mainH2.nextElementSibling;
        const strongInP = next?.tagName?.toLowerCase() === 'p' && next.querySelector('strong');
        if (strongInP) {
          const targetEl = next;
          const label = next.querySelector('strong')?.textContent?.trim() || next.textContent.trim();
          ensureId(targetEl, 'tagline');

          const a = document.createElement('a');
          a.href = '#';
          a.dataset.section = key;
          a.dataset.target = targetEl.id;
          a.textContent = label;

          a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!section.classList.contains('is-active')) activate(key);

            box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

            resetHighlightsIn(section);

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
            openSecondKey = key;
            updateMenuVisibility();
          });

          box.appendChild(a);
        }
      }

      // 2) Resto de H2/H3 (excepto el H2 principal)
      const heads = allHeads.filter(h => h !== mainH2);
      heads.forEach((h, idx) => {
        ensureId(h, `sub-${idx + 1}`);

        const a = document.createElement('a');
        a.href = '#';
        a.dataset.section = key;
        a.dataset.target = h.id;
        a.textContent = (h.textContent || '').trim();

        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (!section.classList.contains('is-active')) activate(key);

          box.querySelectorAll('a').forEach(x => x.classList.toggle('is-sub-active', x === a));

          resetHighlightsIn(section);

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
          openSecondKey = key;
          updateMenuVisibility();
        });

        box.appendChild(a);
      });

      setDisplay(box, false); // lvl3 empieza colapsado
    });
  }

  // Top-level (nivel 1) para items SIN hijos (navegación directa)
  function wireTopLevelSingles() {
    const singles = topItems.filter(mi => !mi.classList.contains('has-children'));
    singles.forEach(mi => {
      const a = mi.querySelector(':scope > a[data-section]');
      if (!a) return;
      const key = a.dataset.section;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        activate(key);
        setOpen(key);
        openSecondKey = null;
        scrollToTop();
      });
    });
  }

  // Logo → Inicio
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    const key = 'seccion-1';
    activate(key);
    setOpen(key);
    openSecondKey = null;
    scrollToTop();
  });

  // Arranque
  const startKey = 'seccion-1';

  buildServicesLvl3();     // solo Servicios (si existe)
  wireTopLevelSingles();   // top sin hijos
  wireGenericLevel2();     // top con hijos + lvl2 genérico
  activate(startKey);

  setOpen(startKey);
  openSecondKey = null;
  updateMenuVisibility();
})();
