/* mobile_nav.js — carruseles móviles + dots robustos */
(function () {
  'use strict';

  // Candidatos que pueden existir según tu HTML/CSS actual
  const CANDIDATES = [
    { grid: '#screen2 .acerca .acerca-mobile', cardSel: '.acerca-card', dots: '#screen2 .dots-acerca' },
    { grid: '#screen3 .servicios .grid',       cardSel: '.card',        dots: '#screen3 .dots' },
    { grid: '#screen4 .soft .grid',            cardSel: '.card',        dots: '#screen4 .dots' },
    { grid: '#screen5 .tecno .grid',           cardSel: '.card',        dots: '#screen5 .dots' }, // <- añadida
  ];

  function ensureSameCount(dotsWrap, count) {
    if (!dotsWrap) return [];
    const now = Array.from(dotsWrap.querySelectorAll('.dot'));
    const diff = count - now.length;
    if (diff > 0) {
      // crea los que falten
      const frag = document.createDocumentFragment();
      for (let i = 0; i < diff; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dot';
        b.setAttribute('aria-label', `Tarjeta ${now.length + i + 1}`);
        frag.appendChild(b);
      }
      dotsWrap.appendChild(frag);
    } else if (diff < 0) {
      // elimina sobrantes del final
      for (let i = 0; i < -diff; i++) {
        const last = dotsWrap.querySelector('.dot:last-of-type');
        if (last) last.remove();
      }
    }
    return Array.from(dotsWrap.querySelectorAll('.dot'));
  }

  function setActive(dotBtns, i) {
    dotBtns.forEach((d, idx) => {
      const on = idx === i;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  function setupCarousel({ grid, cardSel, dots }) {
    const scroller = document.querySelector(grid);
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll(cardSel));
    if (cards.length === 0) return;

    const dotsWrap = document.querySelector(dots);
    const dotBtns  = ensureSameCount(dotsWrap, cards.length);

    // Click en dot → centrar tarjeta
    dotBtns.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setActive(dotBtns, i);
      });
    });

    // Observa qué tarjeta está más centrada
    let observer = null;
    const useIO = 'IntersectionObserver' in window;

    if (useIO) {
      const root = scroller;
      observer = new IntersectionObserver((entries) => {
        // Elige la tarjeta con mayor intersección (visible/centrada)
        let bestIdx = 0, best = -1;
        entries.forEach(e => {
          const idx = cards.indexOf(e.target);
          if (idx !== -1) {
            const score = e.intersectionRatio;
            if (score > best) { best = score; bestIdx = idx; }
          }
        });
        setActive(dotBtns, bestIdx);
      }, {
        root,
        threshold: [0.51, 0.6, 0.7, 0.8, 0.9, 1], // más de la mitad visible ≈ “actual”
      });

      cards.forEach(c => observer.observe(c));
    } else {
      // Fallback: calcula la más centrada con scroll + rAF
      let ticking = false;
      const handler = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const sRect = scroller.getBoundingClientRect();
          const sCenter = (sRect.left + sRect.right) / 2;
          let best = 0, bestDist = Infinity;
          for (let i = 0; i < cards.length; i++) {
            const r = cards[i].getBoundingClientRect();
            const cCenter = (r.left + r.right) / 2;
            const dist = Math.abs(cCenter - sCenter);
            if (dist < bestDist) { bestDist = dist; best = i; }
          }
          setActive(dotBtns, best);
        });
      };
      scroller.addEventListener('scroll', handler, { passive: true });
      window.addEventListener('resize', handler, { passive: true });
    }

    // Estado inicial
    setTimeout(() => {
      // fuerza un primer cálculo
      if (useIO) {
        // IO disparará en cuanto mida; por si acaso, activa la 0
        setActive(dotBtns, 0);
      } else {
        const evt = new Event('scroll');
        scroller.dispatchEvent(evt);
      }
    }, 0);
  }

  // Inicializa sólo los carruseles que existen realmente en el DOM
  CANDIDATES.forEach(c => setupCarousel(c));
})();
