(() => {
  const host = document.body;
  if (!host || !host.classList.contains("landing-about-page")) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "landing-particles-canvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "0"
  });
  host.insertBefore(canvas, host.firstChild);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    canvas.remove();
    return;
  }

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    frame: 0
  };

  const createParticle = () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    vx: (Math.random() - 0.5) * 0.175,
    vy: (Math.random() - 0.5) * 0.175,
    radius: 1.2 + Math.random() * 2.5,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.002 + Math.random() * 0.008,
    speedScale: 0.65 + Math.random() * 0.85
  });

  const resize = () => {
    state.width = Math.max(window.innerWidth, 1);
    state.height = Math.max(window.innerHeight, 1);
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const baseCount = Math.max(16, Math.min(52, Math.round((state.width * state.height) / 35000)));
    state.particles = Array.from({ length: Math.round(baseCount * 1.5) }, createParticle);
  };

  const draw = (animate) => {
    ctx.clearRect(0, 0, state.width, state.height);
    state.particles.forEach((particle) => {
      if (animate) {
        particle.x += (particle.vx + Math.sin(particle.phase * 0.75) * 0.018) * particle.speedScale;
        particle.y += (particle.vy + Math.cos(particle.phase * 0.62) * 0.018) * particle.speedScale;
        particle.phase += particle.phaseSpeed;
      }

      if (particle.x < -4) particle.x = state.width + 4;
      if (particle.x > state.width + 4) particle.x = -4;
      if (particle.y < -4) particle.y = state.height + 4;
      if (particle.y > state.height + 4) particle.y = -4;

      const pulse = 0.78 + Math.sin(particle.phase) * 0.22;
      const alpha = 0.15125 * (0.6 + pulse * 0.6);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 132, 255, ${alpha.toFixed(4)})`;
      ctx.fill();
    });
  };

  const loop = () => {
    draw(true);
    state.frame = window.requestAnimationFrame(loop);
  };

  const start = () => {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    if (reducedMotion) {
      state.frame = 0;
      draw(false);
      return;
    }
    loop();
  };

  resize();
  start();
  window.addEventListener("resize", () => {
    resize();
    start();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.frame) {
      window.cancelAnimationFrame(state.frame);
      state.frame = 0;
    } else if (!document.hidden && !state.frame) {
      start();
    }
  });
})();
