(() => {
  const root = document.documentElement;
  const host = document.querySelector(".page-shell");
  if (!host) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "ls-particles-canvas";
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  if (window.getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  host.insertBefore(canvas, host.firstChild);
  Array.from(host.children).forEach((child) => {
    if (child === canvas) return;
    const el = child;
    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    if (!el.style.zIndex) el.style.zIndex = "1";
  });

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    particles: [],
    rafId: 0,
    running: true,
    baseAlpha: 0.08,
    particleColor: { r: 210, g: 90, b: 255 }
  };

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
      state.baseAlpha = 0.11;
      state.particleColor = { r: 224, g: 132, b: 255 };
    } else {
      state.baseAlpha = 0.15;
      state.particleColor = { r: 198, g: 58, b: 255 };
    }
  };

  const resize = () => {
    state.width = Math.max(host.clientWidth, 1);
    state.height = Math.max(host.scrollHeight, host.clientHeight, 1);
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

  const drawFrame = () => {
    if (!state.running) return;
    ctx.clearRect(0, 0, state.width, state.height);
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      const driftX = Math.sin(p.phase * 0.75) * 0.018;
      const driftY = Math.cos(p.phase * 0.62) * 0.018;
      p.x += (p.vx + driftX) * p.speedScale;
      p.y += (p.vy + driftY) * p.speedScale;

      if (p.x < -4) p.x = state.width + 4;
      if (p.x > state.width + 4) p.x = -4;
      if (p.y < -4) p.y = state.height + 4;
      if (p.y > state.height + 4) p.y = -4;

      p.phase += p.phaseSpeed;
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

    state.rafId = window.requestAnimationFrame(drawFrame);
  };

  const start = () => {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.running = true;
    if (prefersReducedMotion) {
      drawFrame();
      state.running = false;
      return;
    }
    drawFrame();
  };

  const stop = () => {
    state.running = false;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  };

  updateTheme();
  resize();
  start();

  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(resize);
    ro.observe(host);
  }
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
