/* mobile_nav.js — Activación de dots por tarjeta centrada (robusto) */
(function () {
  'use strict';

  // Carruseles que queremos gestionar (ajusta selectores si cambian)
  const CARRUSELES = [
    { grid: '#screen2 .acerca .acerca-mobile', cardSel: '.acerca-card', dots: '#screen2 .dots-acerca' },
    { grid: '#screen3 .servicios .grid',       cardSel: '.card',        dots: '#screen3 .dots' },
    { grid: '#screen4 .soft .grid',            cardSel: '.card',        dots: '#screen4 .dots' },
    { grid: '#screen5 .tecno .grid',           cardSel: '.card',        dots: '#screen5 .dots' },
    { grid: '#screen6 .tinto .grid',           cardSel: '.card',        dots: '#screen6 .dots' },
    { grid: '#screen7 .indus .grid',           cardSel: '.card',        dots: '#screen7 .dots' },
  ];

  function getDots(dotsWrap) {
    return dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];
  }

  function setActive(dotBtns, index) {
    if (!dotBtns || dotBtns.length === 0) return;
    dotBtns.forEach((d, i) => {
      const on = i === index;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  function closestCardIndex(scroller, cards) {
    const sRect = scroller.getBoundingClientRect();
    const sCenter = (sRect.left + sRect.right) / 2;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const cCenter = (r.left + r.right) / 2;
      const dist = Math.abs(cCenter - sCenter);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  function setupCarousel({ grid, cardSel, dots }) {
    const scroller = document.querySelector(grid);
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll(cardSel));
    if (cards.length === 0) return; // sin tarjetas, no hay nada que activar

    const dotsWrap = document.querySelector(dots);
    const dotBtns  = getDots(dotsWrap);

    // Si hay dots pero su número no coincide, no abortamos:
    // usamos el mínimo común para evitar estado “muerto”.
    const usable = Math.min(dotBtns.length, cards.length);

    // Click en dot → centrar tarjeta
    dotBtns.forEach((d, i) => {
      if (i >= cards.length) return;
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setActive(dotBtns, i);
      });
    });

    // Handler único de cálculo por centro
    let ticking = false;
    const recalc = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        // si no hay dots útiles, nada que actualizar visualmente
        if (usable === 0) return;
        const idx = closestCardIndex(scroller, cards);
        setActive(dotBtns, idx);
      });
    };

    // Escuchar scroll del contenedor y resize de ventana
    scroller.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc, { passive: true });

    // Primer estado (tras imágenes / fuentes)
    window.addEventListener('load', recalc);
    setTimeout(recalc, 0);
  }

  CARRUSELES.forEach(setupCarousel);
})();
