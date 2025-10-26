(function () {
  /* ===== Carrusel + dots para SCREEN 2 (Acerca) ===== */
  (function () {
    const scroller = document.querySelector('#screen2 .acerca .acerca-mobile');
    const cards    = scroller ? Array.from(scroller.querySelectorAll('.acerca-card')) : [];
    const dotsWrap = document.querySelector('#screen2 .dots-acerca');
    const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

    if (!scroller || cards.length === 0 || dots.length !== cards.length) return;

    // activa punto según tarjeta visible (~60%)
    function setActive(i) {
      dots.forEach((d, idx) => {
        const on = idx === i;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          const i = cards.indexOf(e.target);
          if (i >= 0) setActive(i);
        }
      });
    }, { root: scroller, threshold: [0.6] });
    cards.forEach(c => io.observe(c));

    // click en puntos → ir a esa tarjeta
    dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });

    setActive(0);
  })();

  /* ===== Carrusel + dots para SCREEN 3 (Servicios) ===== */
  (function () {
    const scroller = document.querySelector('#screen3 .servicios .grid');
    const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
    const dotsWrap = document.querySelector('#screen3 .dots');
    const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

    if (!scroller || cards.length === 0 || dots.length !== cards.length) return;

    function setActive(i) {
      dots.forEach((d, idx) => {
        const on = idx === i;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          const i = cards.indexOf(e.target);
          if (i >= 0) setActive(i);
        }
      });
    }, { root: scroller, threshold: [0.6] });
    cards.forEach(c => io.observe(c));

    dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });

    setActive(0);
  })();
})();
/* ===== Carrusel + dots para SCREEN 4 (Tecnología) ===== */
(function () {
  const scroller = document.querySelector('#screen4 .tecno .grid');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
  const dotsWrap = document.querySelector('#screen4 .dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

  if (!scroller || cards.length === 0 || dots.length !== cards.length) return;

  function setActive(i) {
    dots.forEach((d, idx) => {
      const on = idx === i;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        const i = cards.indexOf(e.target);
        if (i >= 0) setActive(i);
      }
    });
  }, { root: scroller, threshold: [0.6] });
  cards.forEach(c => io.observe(c));

  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  setActive(0);
})();



/* ===== Visibilidad FIJA de dots por pantalla =====
   Muestra los dots de la pantalla que esté ≥60% en viewport y oculta el resto.
*/
(function () {
  const entries = [
    { screen: document.getElementById('screen2'), dots: document.querySelector('#screen2 .dots-acerca') },
    { screen: document.getElementById('screen3'), dots: document.querySelector('#screen3 .dots') },
    { screen: document.getElementById('screen4'), dots: document.querySelector('#screen4 .dots') },
  ].filter(x => x.screen && x.dots);

  if (!entries.length) return;

  const io = new IntersectionObserver((obs) => {
    // 1) ¿cuál(es) pasan del umbral?
    const visibleIds = new Set(
      obs.filter(e => e.isIntersecting && e.intersectionRatio >= 0.6)
         .map(e => e.target.id)
    );

    // 2) Activar solo los dots de las pantallas visibles (prácticamente será una)
    entries.forEach(({ screen, dots }) => {
      const on = visibleIds.has(screen.id);
      dots.classList.toggle('is-visible', on);
    });
  }, { threshold: [0.6] });

  entries.forEach(({ screen }) => io.observe(screen));
})();
/* ===== Carrusel + dots para SCREEN 5 (Software) ===== */
(function () {
  const scroller = document.querySelector('#screen5 .soft .grid');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
  const dotsWrap = document.querySelector('#screen5 .dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

  if (!scroller || cards.length === 0 || dots.length !== cards.length) return;

  function setActive(i) {
    dots.forEach((d, idx) => {
      const on = idx === i;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        const i = cards.indexOf(e.target);
        if (i >= 0) setActive(i);
      }
    });
  }, { root: scroller, threshold: [0.6] });

  cards.forEach(c => io.observe(c));

  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  setActive(0);
})();
