(() => {
  const root = document.documentElement;
  const host = document.body;
  if (!host) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "ls-particles-canvas";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  host.insertBefore(canvas, host.firstChild);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    particles: [],
    rafId: 0,
    running: true,
    staticMode: false,
    baseAlpha: 0.08,
    particleColor: { r: 210, g: 90, b: 255 }
  };
  const PARTICLE_SPEED_MULTIPLIER = 1.25;

  const getTheme = () => {
    const attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    if (window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  };

  const updateTheme = () => {
    if (getTheme() === "dark") {
      state.baseAlpha = 0.15125;
      state.particleColor = { r: 224, g: 132, b: 255 };
    } else {
      state.baseAlpha = 0.20625;
      state.particleColor = { r: 198, g: 58, b: 255 };
    }
  };

  const resize = () => {
    state.width = Math.max(window.innerWidth, 1);
    state.height = Math.max(window.innerHeight, 1);
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    initParticles();
  };

  const makeParticle = () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    vx: (Math.random() - 0.5) * 0.14,
    vy: (Math.random() - 0.5) * 0.14,
    radius: 1.2 + Math.random() * 2.5,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.002 + Math.random() * 0.008,
    speedScale: 0.65 + Math.random() * 0.85
  });

  const initParticles = () => {
    const area = state.width * state.height;
    const count = Math.max(16, Math.min(52, Math.round(area / 35000)));
    state.particles = Array.from({ length: count }, makeParticle);
  };

  const drawFrame = (animate = true) => {
    ctx.clearRect(0, 0, state.width, state.height);
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      if (animate) {
        const driftX = Math.sin(p.phase * 0.75) * 0.018;
        const driftY = Math.cos(p.phase * 0.62) * 0.018;
        p.x += (p.vx + driftX) * p.speedScale * PARTICLE_SPEED_MULTIPLIER;
        p.y += (p.vy + driftY) * p.speedScale * PARTICLE_SPEED_MULTIPLIER;
      }

      if (p.x < -4) p.x = state.width + 4;
      if (p.x > state.width + 4) p.x = -4;
      if (p.y < -4) p.y = state.height + 4;
      if (p.y > state.height + 4) p.y = -4;

      if (animate) p.phase += p.phaseSpeed * PARTICLE_SPEED_MULTIPLIER;
      const pulse = 0.78 + Math.sin(p.phase) * 0.22;
      const r = p.radius * pulse;
      const zone =
        0.82 +
        (Math.sin((p.x / Math.max(state.width, 1)) * Math.PI * 2.1 + p.phase * 0.35) +
          Math.cos((p.y / Math.max(state.height, 1)) * Math.PI * 1.8 - p.phase * 0.25)) *
          0.14;
      const a = state.baseAlpha * (0.6 + pulse * 0.6) * zone;
      const c = state.particleColor;

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${a.toFixed(4)})`;
      ctx.fill();
    }

  };

  const animateLoop = () => {
    if (!state.running) return;
    drawFrame(true);
    state.rafId = window.requestAnimationFrame(animateLoop);
  };

  const start = () => {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.staticMode = false;
    if (prefersReducedMotion) {
      state.running = false;
      drawFrame(false);
      return;
    }
    state.running = true;
    animateLoop();
  };

  const stop = () => {
    state.running = false;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  };

  const refresh = () => {
    resize();
    if (prefersReducedMotion) {
      stop();
      drawFrame(false);
      return;
    }
    if (!document.hidden) start();
  };

  updateTheme();
  resize();
  start();

  window.addEventListener("resize", refresh, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorScheme = () => updateTheme();
    if (mq.addEventListener) mq.addEventListener("change", onColorScheme);
    else if (mq.addListener) mq.addListener(onColorScheme);
  }

  const obs = new MutationObserver(updateTheme);
  obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
