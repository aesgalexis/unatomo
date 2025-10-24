(function () {
  const sections = Array.from(document.querySelectorAll('.screen'));
  if (!sections.length) return;

  let isScrolling = false;
  let touchStartY = 0;

  function currentIndex() {
    const y = window.scrollY;
    const h = window.innerHeight;
    return Math.round(y / h);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function scrollToIndex(idx) {
    const target = sections[clamp(idx, 0, sections.length - 1)];
    if (!target) return;
    isScrolling = true;
    target.scrollIntoView({ behavior: 'smooth' });
    // libera el candado tras un pequeño tiempo
    setTimeout(() => { isScrolling = false; }, 450);
  }

  // Rueda / trackpad
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;
    const delta = e.deltaY;
    if (Math.abs(delta) < 1) return; // micro-movimientos, ignorar
    const idx = currentIndex();
    scrollToIndex(idx + (delta > 0 ? 1 : -1));
  }, { passive: true });

  // Touch (móvil)
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isScrolling) return;
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    const threshold = 12; // gesto mínimo
    if (Math.abs(deltaY) < threshold) return;
    const idx = currentIndex();
    scrollToIndex(idx + (deltaY > 0 ? 1 : -1));
  }, { passive: true });

  // En caso de resize, reencaja a la pantalla más cercana
  window.addEventListener('resize', () => {
    const idx = currentIndex();
    scrollToIndex(idx);
  });
})();
