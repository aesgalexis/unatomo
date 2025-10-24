(function () {
  // --- 0) Altura estable en móviles (evita saltos por barra del navegador)
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  window.addEventListener('DOMContentLoaded', setVH);
  window.addEventListener('resize', setVH);
  window.addEventListener('load', setVH);

  // --- 1) Selección y estado
  const sections = Array.from(document.querySelectorAll('.screen'));
  if (!sections.length) return;

  let curIndex = 0;         // índice visible actual
  let isLock = false;       // bloquea acciones durante la animación/gesto
  let isAnimating = false;  // animación en curso
  let scrollEndTimer = null;

  // Observa qué pantalla está “realmente” visible (≥60%)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        curIndex = sections.indexOf(e.target);
      }
    });
  }, { threshold: [0.6] });
  sections.forEach(s => io.observe(s));

  // --- 2) Utilidades
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const enableSnap = (on) => {
    document.body.classList.toggle('snap', !!on);
  };

  function unlockAfterScrollSettles() {
    if (scrollEndTimer) clearTimeout(scrollEndTimer);
    // Consideramos “scroll finalizado” cuando pasa un tiempo sin eventos de scroll
    scrollEndTimer = setTimeout(() => {
      isAnimating = false;
      isLock = false;
      enableSnap(true);              // reactivamos snap al finalizar
    }, 160); // 160ms sin scroll ≈ scroll asentado
  }

  function scrollToIndex(idx) {
    const target = sections[clamp(idx, 0, sections.length - 1)];
    if (!target) return;
    isLock = true;
    isAnimating = true;
    enableSnap(false);               // desactiva snap para que la inercia no encadene saltos
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Por seguridad, forzamos un máximo
    setTimeout(() => { unlockAfterScrollSettles(); }, 500);
  }

  // Re-encajar al cargar y activar snap
  window.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => enableSnap(true));
  });

  // --- 3) GESTOS

  // WHEEL / TRACKPAD: 1 paso por gesto (ignoramos magnitud)
  window.addEventListener('wheel', (e) => {
    if (isLock) { e.preventDefault(); return; }
    const dir = e.deltaY > 0 ? 1 : -1;
    if (dir === 0) return;
    e.preventDefault();              // evita que el impulso nativo avance más
    scrollToIndex(curIndex + dir);
  }, { passive: false });            // importante: no-passive para poder preventDefault

  // TOUCH (móvil): 1 paso por gesto
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isLock) { e.preventDefault(); return; }
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    const THRESH = 10;               // gesto mínimo
    if (Math.abs(deltaY) < THRESH) return;
    const dir = deltaY > 0 ? 1 : -1;
    e.preventDefault();              // evita que la inercia nativa encadene
    scrollToIndex(curIndex + dir);
  }, { passive: false });

  // Mientras haya scroll en curso, vamos “reiniciando” el detector de fin de scroll
  window.addEventListener('scroll', () => {
    if (isAnimating) unlockAfterScrollSettles();
  }, { passive: true });

  // (Opcional) Teclas ↑/↓ para test en desktop
  window.addEventListener('keydown', (e) => {
    if (isLock) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); scrollToIndex(curIndex + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); scrollToIndex(curIndex - 1); }
  });
})();
// ===== Carrusel y dots para SCREEN 2 (acerca) =====
(function () {
  const scroller = document.querySelector('#screen2 .acerca .acerca-mobile');
  const cards    = scroller ? Array.from(scroller.querySelectorAll('.acerca-card')) : [];
  const dotsWrap = document.querySelector('#screen2 .dots-acerca');
  const dots     = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.dot')) : [];
  const screen2  = document.getElementById('screen2');

  // Mostrar dots solo cuando screen2 llena la pantalla
  function updateDotsVisibility2() {
    if (!screen2 || !dotsWrap) return;
    const r = screen2.getBoundingClientRect();
    const fullyVisible = r.top <= 0 && r.bottom >= window.innerHeight;
    dotsWrap.hidden = !fullyVisible;
    document.body.classList.toggle('in-screen2', fullyVisible);
  }
  window.addEventListener('scroll', updateDotsVisibility2, { passive: true });
  window.addEventListener('resize', updateDotsVisibility2);
  window.addEventListener('load',   updateDotsVisibility2);
  updateDotsVisibility2();

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
