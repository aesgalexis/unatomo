/* mobile_nav.js — Carruseles móviles + dots sincronizados */
(function () {
  'use strict';

  const SCREENS = [
  { grid: '#screen2 .acerca .acerca-mobile', cardSel: '.acerca-card', dots: '#screen2 .dots-acerca' },
  { grid: '#screen3 .servicios .grid',       cardSel: '.card',        dots: '#screen3 .dots' },
  { grid: '#screen4 .soft .grid',            cardSel: '.card',        dots: '#screen4 .dots' },
];


  SCREENS.forEach(({ grid, cardSel, dots }) => {
    const scroller = document.querySelector(grid);
    const cards    = scroller ? Array.from(scroller.querySelectorAll(cardSel)) : [];
    const dotsWrap = document.querySelector(dots);
    const dotBtns  = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

    if (!scroller || cards.length === 0 || dotBtns.length !== cards.length) return;

    /* --- 1. Activar el punto correspondiente --- */
    function setActive(i) {
      dotBtns.forEach((d, idx) => {
        const on = idx === i;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
    }

    /* --- 2. Detectar qué tarjeta está centrada --- */
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          const i = cards.indexOf(e.target);
          if (i >= 0) setActive(i);
        }
      });
    }, { root: scroller, threshold: [0.6] });

    cards.forEach(card => observer.observe(card));

    /* --- 3. Al hacer clic en un punto, mover al slide --- */
    dotBtns.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setActive(i);
      });
    });

    /* --- 4. Estado inicial --- */
    setActive(0);
  });
})();
