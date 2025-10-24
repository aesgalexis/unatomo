(function () {
  const sections = Array.from(document.querySelectorAll('.screen'));
  if (!sections.length) return;

  let isScrolling = false;
  let touchStartY = 0;

  // 1) Garantiza empezar arriba y activa el snap cuando el layout ya está estable
  window.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    // espera un frame para asentar layout y luego activa el snap
    requestAnimationFrame(() => {
      document.body.classList.add('snap');
    });
  });

  function idx() {
    const y = window.scrollY;
    const h = window.innerHeight;
    return Math.round(y / h);
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function scrollToIndex(i) {
    const target = sections[clamp(i, 0, sections.length - 1)];
    if (!target) return;
    isScrolling = true;
    target.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isScrolling = false; }, 450);
  }

  // Rueda / trackpad
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;
    const delta = e.deltaY;
    if (Math.abs(delta) < 1) return;
    scrollToIndex(idx() + (delta > 0 ? 1 : -1));
  }, { passive: true });

  // Gestos táctiles
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isScrolling) return;
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    if (Math.abs(deltaY) < 12) return;
    scrollToIndex(idx() + (deltaY > 0 ? 1 : -1));
  }, { passive: true });
})();
