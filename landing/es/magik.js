// /landing/es/magik.js — añade botón ✕ a cada tarjeta y la cierra con pop!
// En móvil, sincroniza los dots eliminando el correspondiente.

(function () {
  'use strict';

  // Pantallas objetivo y sus selectores
  const SCREENS = [
    { id: 'screen2', gridSel: '#screen2 .acerca .grid', dotsSel: '#screen2 .dots-acerca' },
    { id: 'screen3', gridSel: '#screen3 .servicios .grid', dotsSel: '#screen3 .dots' },
    { id: 'screen4', gridSel: '#screen4 .tecno .grid',     dotsSel: '#screen4 .dots' },
  ];

  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;

  function enhanceCards() {
    SCREENS.forEach(({ gridSel }) => {
      const grid = document.querySelector(gridSel);
      if (!grid) return;
      grid.querySelectorAll('.card').forEach((card) => {
        if (card.dataset.magikReady === '1') return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'close-card';
        btn.setAttribute('aria-label', 'Cerrar tarjeta');
        btn.textContent = '×';
        btn.addEventListener('click', (e) => handleClose(e, card));
        card.appendChild(btn);
        card.dataset.magikReady = '1';
      });
    });
  }

  function handleClose(evt, card) {
    evt.stopPropagation();
    const screenEl = card.closest('.screen');
    const conf = SCREENS.find(s => screenEl && screenEl.id === s.id);
    if (!conf) return;

    const grid = document.querySelector(conf.gridSel);
    const dotsWrap = document.querySelector(conf.dotsSel);

    const cardsArr = Array.from(grid.querySelectorAll('.card'));
    const idx = cardsArr.indexOf(card);

    card.classList.add('magik-pop-out');
    const removeNode = () => {
      if (!card.isConnected) return;
      card.remove();

      // Sincroniza dots en móvil
      if (isMobile() && dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll('.dot'));
        if (idx >= 0 && idx < dots.length) dots[idx].remove();

        const remaining = grid.querySelectorAll('.card').length;
        // Si 0/1 tarjeta, oculta dots
        dotsWrap.style.display = (remaining <= 1) ? 'none' : '';
      }
    };

    card.addEventListener('animationend', removeNode, { once: true });
    setTimeout(removeNode, 400); // fallback
  }

  function observeGrids() {
    const mo = new MutationObserver(() => enhanceCards());
    SCREENS.forEach(({ gridSel }) => {
      const grid = document.querySelector(gridSel);
      if (grid) mo.observe(grid, { childList: true, subtree: true });
    });
  }

  function init() {
    enhanceCards();
    observeGrids();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
