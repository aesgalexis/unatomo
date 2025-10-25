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
