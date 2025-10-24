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
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function scrollToIndex(idx) {
    const target = sections[clamp(idx, 0, sections.length - 1)];
    if (!target) return;
    isScrolling = true;
    target.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isScrolling = false; }, 450);
  }

  /* NUEVO: asegúrate de empezar “encajado” en pantalla 1 */
  window.addEventListener('load', () => scrollToIndex(0));
  window.addEventListener('resize', () => scrollToIndex(currentIndex()));

  // Rueda/trackpad
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;
    const delta = e.deltaY;
    if (Math.abs(delta) < 1) return;
    scrollToIndex(currentIndex() + (delta > 0 ? 1 : -1));
  }, { passive: true });

  // Touch
  window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend',   (e) => {
    if (isScrolling) return;
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    if (Math.abs(deltaY) < 12) return;
    scrollToIndex(currentIndex() + (deltaY > 0 ? 1 : -1));
  }, { passive: true });
})();
