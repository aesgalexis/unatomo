/* mobile_nav.js — Carrusel + dots: activo por tarjeta centrada */
(function () {
  'use strict';

  // Estructura actual tras borrar la antigua #screen4 y renumerar:
  const SCREENS = [
    { grid: '#screen2 .acerca .acerca-mobile', cardSel: '.acerca-card', dots: '#screen2 .dots-acerca' },
    { grid: '#screen3 .servicios .grid',       cardSel: '.card',        dots: '#screen3 .dots' },
    { grid: '#screen4 .soft .grid',            cardSel: '.card',        dots: '#screen4 .dots' }, // <- la “nueva” 4 (software)
  ];

  // Utilidad: marcar activo
  function setActive(dotBtns, i) {
    dotBtns.forEach((d, idx) => {
      const on = idx === i;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  // Calcula el índice de la tarjeta más centrada dentro del scroller
  function centeredIndex(scroller, cards) {
    const sRect = scroller.getBoundingClientRect();
    const sCenter = (sRect.left + sRect.right) / 2;

    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const cCenter = (r.left + r.right) / 2;
      const dist = Math.abs(cCenter - sCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  // Throttle con rAF
  function onScrollRAF(scroller, cards, dots) {
    let ticking = false;
    function update() {
      ticking = false;
      const i = centeredIndex(scroller, cards);
      setActive(dots, i);
    }
    return function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
  }

  SCREENS.forEach(({ grid, cardSel, dots }) => {
    const scroller = document.querySelector(grid);
    const cards    = scroller ? Array.from(scroller.querySelectorAll(cardSel)) : [];
    const dotsWrap = document.querySelector(dots);
    const dotBtns  = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

    // Debe haber mismo número de dots y tarjetas
    if (!scroller || cards.length === 0 || dotBtns.length !== cards.length) return;

    // Scroll → recalcular activo
    const handler = onScrollRAF(scroller, cards, dotBtns);
    scroller.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', () => handler(), { passive: true });

    // Click en dot → ir a su tarjeta
    dotBtns.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setActive(dotBtns, i);
      });
    });

    // Estado inicial
    setActive(dotBtns, centeredIndex(scroller, cards));
  });
})();
