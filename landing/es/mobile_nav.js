(function () {
  const scroller = document.querySelector('#screen2 .screen2class .grid');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.card')) : [];
  const dotsWrap = document.querySelector('#screen2 .dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];

  // --- Mostrar los dots solo cuando #screen2 está a la vista ---
  const screen2 = document.getElementById('screen2');
  if (screen2 && dotsWrap) {
    // oculto por defecto hasta que entre en vista
    dotsWrap.hidden = true;

    const visIO = new IntersectionObserver((entries) => {
      const e = entries[0];
      // si al menos un 25% de #screen2 está visible, mostramos los dots
      const on = e.isIntersecting && e.intersectionRatio >= 0.25;
      dotsWrap.hidden = !on;
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    visIO.observe(screen2);
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
