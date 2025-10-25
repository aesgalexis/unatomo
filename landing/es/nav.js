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

  let curIndex = 0;          // índice visible actual
  let isLock = false;        // bloquea acciones durante animación/gesto
  let isAnimating = false;   // animación en curso
  let scrollEndTimer = null;
  let handlersActive = false; // si los listeners de escritorio están conectados

  const isDesktop = () => window.matchMedia('(min-width: 601px)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // Observa qué pantalla está “realmente” visible (≥60%)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        curIndex = sections.indexOf(e.target);
      }
    });
  }, { threshold: [0.6] });
  sections.forEach(s => io.observe(s));

  // Utilidades
  const enableSnap = (on) => {
    document.body.classList.toggle('snap', !!on);
  };

  function unlockAfterScrollSettles() {
    if (scrollEndTimer) clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      isAnimating = false;
      isLock = false;
      enableSnap(true); // reactivamos snap al finalizar
    }, 160);
  }

  function scrollToIndex(idx) {
    const target = sections[clamp(idx, 0, sections.length - 1)];
    if (!target) return;
    isLock = true;
    isAnimating = true;
    enableSnap(false); // desactiva snap para que la inercia no encadene saltos
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { unlockAfterScrollSettles(); }, 500);
  }

  // Handlers ESCRITORIO (pantalla por gesto)
  function onWheel(e) {
    if (isLock) { e.preventDefault(); return; }
    const dir = e.deltaY > 0 ? 1 : -1;
    if (dir === 0) return;
    e.preventDefault();              // evita que el impulso nativo avance más
    scrollToIndex(curIndex + dir);
  }

  let touchStartY = 0;
  function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (isLock) { e.preventDefault(); return; }
    const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY;
    const deltaY = touchStartY - endY;
    const THRESH = 10;
    if (Math.abs(deltaY) < THRESH) return;
    const dir = deltaY > 0 ? 1 : -1;
    e.preventDefault();              // evita inercia encadenada
    scrollToIndex(curIndex + dir);
  }

  function onKeydown(e) {
    if (isLock) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); scrollToIndex(curIndex + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); scrollToIndex(curIndex - 1); }
  }

  function attachDesktopHandlers() {
    if (handlersActive) return;
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('keydown', onKeydown);
    // Mientras haya scroll en curso, reiniciamos detector de fin de scroll
    window.addEventListener('scroll', onScrollDuringAnimation, { passive: true });
    handlersActive = true;
  }
  function detachDesktopHandlers() {
    if (!handlersActive) return;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', onScrollDuringAnimation);
    handlersActive = false;
  }
  function onScrollDuringAnimation() {
    if (isAnimating) unlockAfterScrollSettles();
  }

  // Activar/desactivar modo según breakpoint
  function applyMode() {
    if (isDesktop()) {
      // ESCRITORIO: snap + handlers
      enableSnap(true);
      attachDesktopHandlers();
    } else {
      // MÓVIL: scroll nativo, sin snap ni handlers
      enableSnap(false);
      detachDesktopHandlers();
    }
  }

  // Init
  window.addEventListener('DOMContentLoaded', () => {
    // Decide por breakpoint (no forzamos scrollTo top aquí para no molestar)
    applyMode();
  });

  // Reaccionar a cambios de tamaño/orientación / breakpoint
  const mq = window.matchMedia('(min-width: 601px)');
  if (mq.addEventListener) mq.addEventListener('change', applyMode);
  else mq.addListener(applyMode); // Safari antiguo
})();
