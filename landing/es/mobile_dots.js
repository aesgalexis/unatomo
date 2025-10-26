// /landing/es/mobile_dots.js — Muestra SOLO los dots de la pantalla visible
(function () {
  'use strict';

  // Mapea cada screen con su contenedor de dots
  const maps = [
    { screen: document.getElementById('screen2'), dots: document.querySelector('#screen2 .dots-acerca') },
    { screen: document.getElementById('screen3'), dots: document.querySelector('#screen3 .dots') },
    { screen: document.getElementById('screen4'), dots: document.querySelector('#screen4 .dots') },
    { screen: document.getElementById('screen5'), dots: document.querySelector('#screen5 .dots') },
  ].filter(x => x.screen && x.dots);

  if (!maps.length) return;

  // Helpers
  function showOnly(targetScreenId) {
    maps.forEach(({ screen, dots }) => {
      const on = screen.id === targetScreenId;
      dots.classList.toggle('is-visible', on);
    });
  }

  // IO al 60%: cuando una screen entra >=60% en viewport, activamos sus dots
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        showOnly(e.target.id);
      }
    });
  }, { threshold: [0.6] });

  maps.forEach(({ screen }) => io.observe(screen));

  // Estado inicial: decide cuál está más centrada
  function initVisible() {
    let best = null, bestArea = 0;
    maps.forEach(({ screen }) => {
      const r = screen.getBoundingClientRect();
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const ix = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const iy = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const area = ix * iy;
      if (area > bestArea) { bestArea = area; best = screen.id; }
    });
    if (best) showOnly(best);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisible, { once: true });
  } else {
    initVisible();
  }
})();
