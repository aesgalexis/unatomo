/* mobile_nav.js — Carrusel + dots (solo sincronía del activo, layout aparte) */
(function () {
  'use strict';

  // Config de cada pantalla (grid, tarjetas, contenedor y dots)
  const SCREENS = [
    { grid: '#screen2 .acerca .acerca-mobile', cardSel: '.acerca-card', dots: '#screen2 .dots-acerca' },
    { grid: '#screen3 .servicios .grid',       cardSel: '.card',        dots: '#screen3 .dots' },
    { grid: '#screen4 .tecno .grid',           cardSel: '.card',        dots: '#screen4 .dots' },
    { grid: '#screen5 .soft .grid',            cardSel: '.card',        dots: '#screen5 .dots' },
  ];

  SCREENS.forEach(({ grid, cardSel, dots }) => {
    const scroller = document.querySelector(grid);
    const cards    = scroller ? Array.from(scroller.querySelectorAll(cardSel)) : [];
    const dotsWrap = document.querySelector(dots);
    const dotBtns  = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

    if (!scroller || cards.length === 0 || dotBtns.length !== cards.length) return;

    // 1) Resalta el activo
    function setActive(i) {
      dotBtns.forEach((d, idx) => {
        const on = idx === i;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
    }

    // 2) Observer dentro del carrusel (no a nivel de pantalla)
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          const i = cards.indexOf(e.target);
          if (i >= 0) setActive(i);
        }
      });
    }, { root: scroller, threshold: [0.6] });

    cards.forEach(c => io.observe(c));

    // 3) Click en dot → scroll a la tarjeta
    dotBtns.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });

    // 4) Estado inicial
    setActive(0);
  });
})();
