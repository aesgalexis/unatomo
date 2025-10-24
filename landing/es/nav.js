(function () {
  const sections = Array.from(document.querySelectorAll('.screen'));
  if (!sections.length) return;

  let isLock = false;          // candado por gesto
  let curIndex = 0;            // índice “oficial” de pantalla visible
  const LOCK_MS = 700;         // tiempo de bloqueo por gesto

  // Observa qué pantalla está “realmente” visible (≥60%)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        curIndex = sections.indexOf(e.target);
      }
    });
  }, { threshold: [0.6] });
  sections.forEach(s => io.observe(s));
  // Fija --vh al alto real; evita saltos cuando la barra se oculta/muestra
function setVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('DOMContentLoaded', setVH);
window.addEventListener('resize', setVH);

  // Utilidad
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function scrollToIndex(idx) {
    const target = sections[clamp(idx, 0, sections.length - 1)];
    if (!target) return;
    isLock = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { isLock = false; }, LOCK_MS);
  }

  // Asegura empezar en la pantalla 0 y activa snap (si usas body.snap)
  window.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      document.body.classList.add('snap');
    });
  });

  // WHEEL (ratón/pad): 1 paso por gesto (ignora magnitud)
  window.addEventListener('wheel', (e) => {
    if (isLock) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (dir === 0) return;
    scrollToIndex(curIndex + dir);
  }, { passive: true });

  // TOUCH (móvil): 1 paso por gesto
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isLock) return;
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    const THRESH = 10; // gesto mínimo
    if (Math.abs(deltaY) < THRESH) return;
    const dir = deltaY > 0 ? 1 : -1;
    scrollToIndex(curIndex + dir);
  }, { passive: true });

  // (Opcional) Teclas ↑/↓ para probar en desktop
  window.addEventListener('keydown', (e) => {
    if (isLock) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') scrollToIndex(curIndex + 1);
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   scrollToIndex(curIndex - 1);
  });
})();
