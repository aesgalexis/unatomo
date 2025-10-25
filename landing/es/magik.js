// magik.js — añade botón ✕ a cada tarjeta y la cierra con pop!
// Además, en móvil, sincroniza los "dots" eliminando el correspondiente.

(function () {
  'use strict';

  // Pantallas objetivo y sus selectores de contenedor/dots
  const SCREENS = [
    { id: 'screen2', gridSel: '#screen2 .acerca .grid', dotsSel: '#screen2 .dots-acerca' },
    { id: 'screen3', gridSel: '#screen3 .servicios .grid', dotsSel: '#screen3 .dots' },
    { id: 'screen4', gridSel: '#screen4 .tecno .grid',     dotsSel: '#screen4 .dots' },
  ];

  // Util: comprueba si estamos en modo móvil (coincide con tus CSS @media)
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;

  // Inyecta botón de cierre en todas las tarjetas encontradas
  function enhanceCards() {
    SCREENS.forEach(({ gridSel }) => {
      const grid = document.querySelector(gridSel);
      if (!grid) return;

      grid.querySelectorAll('.card').forEach((card) => {
        if (card.dataset.magikReady === '1') return; // evitar duplicados
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

  // Cerrar tarjeta con animación y sincronizar dots en móvil
  function handleClose(evt, card) {
    evt.stopPropagation();
    const screenEl = card.closest('.screen');
    const screen = SCREENS.find(s => screenEl && screenEl.id === s.id);
    if (!screen) return;

    const grid = document.querySelector(screen.gridSel);
    const dotsWrap = document.querySelector(screen.dotsSel);

    // Calcula índice de la tarjeta dentro del grid en ese momento
    const cardsArr = Array.from(grid.querySelectorAll('.card'));
    const idx = cardsArr.indexOf(card);

    // Reproduce animación y, al terminar, retira del DOM
    card.classList.add('magik-pop-out');
    const removeNode = () => {
      card.remove();
      // Sincroniza dots en móvil: elimina el dot correspondiente
      if (isMobile() && dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll('.dot'));
        if (idx >= 0 && idx < dots.length) {
          dots[idx].remove();
        }
        // Si no quedan tarjetas o queda 0/1, ajusta visibilidad de dots
        const remainingCards = grid.querySelectorAll('.card').length;
        if (remainingCards <= 1) {
          // con 0 o 1 tarjeta, los dots sobran
          dotsWrap.style.display = 'none';
        } else {
          dotsWrap.style.display = '';
        }
      }
    };

    // Espera a que termine la animación o haz fallback por si no dispara
    card.addEventListener('animationend', removeNode, { once: true });
    setTimeout(() => {
      if (card.isConnected) removeNode();
    }, 350);
  }

  // Observar mutaciones para nuevas tarjetas (si las hubiese en el futuro)
  function observeGrids() {
    const mo = new MutationObserver((muts) => {
      let needsEnhance = false;
      muts.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) needsEnhance = true;
      });
      if (needsEnhance) enhanceCards();
    });
    SCREENS.forEach(({ gridSel }) => {
      const grid = document.querySelector(gridSel);
      if (grid) mo.observe(grid, { childList: true, subtree: true });
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    enhanceCards();
    observeGrids();
    // Reaplica al cambiar de tamaño (por si cambia a móvil/escritorio)
    window.addEventListener('resize', () => {}, { passive: true });
  }
})();
