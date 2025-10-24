(function () {
  const scroller = document.querySelector('#screen3 .servicios .grid');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
  const dotsWrap = document.querySelector('#screen3 .dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];
  const screen3  = document.getElementById('screen3');

  // --- Mostrar los dots solo cuando #screen3 ocupa toda la pantalla ---
  function updateDotsVisibility() {
    if (!screen3 || !dotsWrap) return;
    const r = screen3.getBoundingClientRect();
    const fullyVisible = r.top <= 0 && r.bottom >= window.innerHeight;
    dotsWrap.hidden = !fullyVisible;
    document.body.classList.toggle('in-screen3', fullyVisible);
  }
  // ocultar en cuanto empieza a moverse y decidir al asentarse
  window.addEventListener('scroll', updateDotsVisibility, { passive: true });
  window.addEventListener('resize', updateDotsVisibility);
  window.addEventListener('load',   updateDotsVisibility);
  updateDotsVisibility();

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
