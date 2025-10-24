(function () {
  const scroller = document.querySelector('#screen3 .servicios .grid');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
  const dotsWrap = document.querySelector('#screen3 .dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

  // --- Mostrar los dots solo cuando #screen3 está a la vista ---
  const screen3 = document.getElementById('screen3');
  if (screen3 && dotsWrap) {
    const visIO = new IntersectionObserver((entries) => {
      const e = entries[0];
      const on = e.isIntersecting && e.intersectionRatio >= 0.25;
      // control robusto por clase en <body>
      document.body.classList.toggle('in-screen3', on);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    visIO.observe(screen3);
  }

  if (!scroller || cards.length === 0 || dots.length !== cards.length) return;

  // Marca activa por índice
  function setActive(i) {
    dots.forEach((d, idx) => {
      const on = idx === i;
      d.classList.toggle('active', on);
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  // IO dentro del scroller: detecta tarjeta visible (~60%)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        const i = cards.indexOf(e.target);
        if (i >= 0) setActive(i);
      }
    });
  }, { root: scroller, threshold: [0.6] });
  cards.forEach(c => io.observe(c));

  // Click en puntitos → scroll a esa tarjeta
  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  // Estado inicial
  setActive(0);
})();
