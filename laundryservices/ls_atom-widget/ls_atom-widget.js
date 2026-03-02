import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js";

export function initAtomWidget({ container, pixelRatioCap = 1.8 } = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new Error("initAtomWidget requires a valid HTMLElement in 'container'.");
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const key = new THREE.PointLight(0xcde6ff, 1.0, 20);
  key.position.set(2.4, 2.2, 3.4);
  scene.add(key);

  const rim = new THREE.PointLight(0xffc7d6, 0.5, 18);
  rim.position.set(-2.8, -2.3, -2.6);
  scene.add(rim);

  const atom = new THREE.Group();
  scene.add(atom);

  const nucleus = new THREE.Group();
  atom.add(nucleus);

  const protonGeo = new THREE.SphereGeometry(0.098, 16, 16);
  const protonMat = new THREE.MeshStandardMaterial({
    color: 0xff93b8,
    roughness: 0.25,
    metalness: 0.08,
    emissive: 0x220611,
    emissiveIntensity: 0.35,
  });

  const protonData = [];
  const protonCount = 8;
  for (let i = 0; i < protonCount; i += 1) {
    const proton = new THREE.Mesh(protonGeo, protonMat);
    const spread = 0.42;
    const base = new THREE.Vector3(
      (Math.random() * 2 - 1) * spread,
      (Math.random() * 2 - 1) * spread,
      (Math.random() * 2 - 1) * spread
    );
    proton.position.copy(base);
    nucleus.add(proton);

    protonData.push({
      mesh: proton,
      base,
      phase: Math.random() * Math.PI * 2,
      amp: 0.012 + Math.random() * 0.012,
      speed: 0.8 + Math.random() * 1.2,
    });
  }

  const orbitMat = new THREE.MeshBasicMaterial({
    color: 0xaed7ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });

  const getTheme = () => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  };

  const applyThemeMaterials = () => {
    if (getTheme() === "light") {
      orbitMat.color.set(0x5f6672);
      orbitMat.opacity = 0.62;
      electronMat.color.set(0x7e22ce);
      electronMat.emissive.set(0x581c87);
      electronMat.emissiveIntensity = 0.9;
    } else {
      orbitMat.color.set(0xaed7ff);
      orbitMat.opacity = 0.52;
      electronMat.color.set(0x22d3ee);
      electronMat.emissive.set(0x0ea5e9);
      electronMat.emissiveIntensity = 0.85;
    }
  };

  const orbitConfigs = [
    { radius: 1.0, periodSec: 5.0 },
    { radius: 1.27, periodSec: 6.0 },
    { radius: 1.56, periodSec: 7.0 },
  ];

  const electronGeo = new THREE.SphereGeometry(0.055, 14, 14);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.1,
  });

  const orbitGroups = [];
  orbitConfigs.forEach((cfg) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, Math.max(0.012 * cfg.radius, 0.02), 12, 160),
      orbitMat
    );
    pivot.add(ring);

    const rotator = new THREE.Group();
    pivot.add(rotator);

    const holder = new THREE.Group();
    holder.position.x = cfg.radius;
    rotator.add(holder);

    const electron = new THREE.Mesh(electronGeo, electronMat);
    holder.add(electron);

    atom.add(pivot);

    orbitGroups.push({
      pivot,
      rotator,
      omega: (Math.PI * 2) / cfg.periodSec,
      precessSpeed: (Math.random() * 0.6 - 0.3) * 0.1,
      wobblePhase: Math.random() * Math.PI * 2,
    });
  });

  applyThemeMaterials();

  let rafId = 0;
  let running = false;
  let destroyed = false;
  let inView = true;
  let isDragging = false;
  let dragPointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let spinVelocityX = 0;
  let spinVelocityY = 0;
  const FRICTION = 0.985;
  let elapsed = 0;

  const clock = new THREE.Clock();

  const render = () => {
    if (!running || destroyed) return;
    rafId = window.requestAnimationFrame(render);

    const dt = clock.getDelta();
    elapsed += dt;
    const t = elapsed;

    nucleus.rotation.y += dt * 0.25;
    const breath = 1 + Math.sin(t * 1.1) * 0.02;
    nucleus.scale.setScalar(breath);

    for (const p of protonData) {
      p.mesh.position.set(
        p.base.x + Math.sin(t * p.speed + p.phase) * p.amp,
        p.base.y + Math.cos(t * (p.speed * 1.1) + p.phase) * p.amp,
        p.base.z + Math.sin(t * (p.speed * 0.9) + p.phase) * p.amp
      );
    }

    for (const o of orbitGroups) {
      o.pivot.rotation.y += o.precessSpeed * dt;
      const wobble = 0.05 * Math.sin(t * 0.6 + o.wobblePhase);
      o.pivot.rotation.x += (wobble - o.pivot.rotation.x) * 0.02;
      o.pivot.rotation.z += (wobble * 0.6 - o.pivot.rotation.z) * 0.02;
      o.rotator.rotation.z += o.omega * dt;
    }

    if (!isDragging) {
      atom.rotation.y += spinVelocityY * dt;
      atom.rotation.x += spinVelocityX * dt;
      spinVelocityY *= FRICTION;
      spinVelocityX *= FRICTION;
      if (Math.abs(spinVelocityY) < 1e-4) spinVelocityY = 0;
      if (Math.abs(spinVelocityX) < 1e-4) spinVelocityX = 0;
    }

    atom.rotation.x = Math.max(-1.2, Math.min(1.2, atom.rotation.x));
    renderer.render(scene, camera);
  };

  const getSize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    return { width, height };
  };

  const resize = () => {
    if (destroyed) return;
    const { width, height } = getSize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(width, height, false);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("resize", resize);

  const updateRunningState = () => {
    const shouldRun = !destroyed && inView && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      clock.getDelta();
      render();
      return;
    }
    if (!shouldRun && running) {
      running = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target !== container) continue;
        inView = entry.isIntersecting && entry.intersectionRatio > 0.02;
        updateRunningState();
      }
    },
    { threshold: [0, 0.02, 0.1, 0.4] }
  );
  io.observe(container);

  const onVisibility = () => updateRunningState();
  document.addEventListener("visibilitychange", onVisibility);

  const onThemeChange = () => applyThemeMaterials();
  const themeMq = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  if (themeMq) {
    if (themeMq.addEventListener) themeMq.addEventListener("change", onThemeChange);
    else if (themeMq.addListener) themeMq.addListener(onThemeChange);
  }

  const themeObserver = new MutationObserver(onThemeChange);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const onPointerDown = (event) => {
    if (destroyed) return;
    isDragging = true;
    dragPointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!isDragging || event.pointerId !== dragPointerId) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    const factor = 0.005;
    atom.rotation.y += dx * factor;
    atom.rotation.x += dy * factor;
    atom.rotation.x = Math.max(-1.2, Math.min(1.2, atom.rotation.x));

    spinVelocityY = dx * factor * 60;
    spinVelocityX = dy * factor * 60;
  };

  const finishPointer = (event) => {
    if (event.pointerId !== dragPointerId) return;
    isDragging = false;
    try {
      renderer.domElement.releasePointerCapture(event.pointerId);
    } catch {}
    dragPointerId = null;
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", finishPointer);
  renderer.domElement.addEventListener("pointercancel", finishPointer);
  renderer.domElement.addEventListener("lostpointercapture", finishPointer);

  resize();
  updateRunningState();

  const disposeMaterial = (material) => {
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
      return;
    }
    material.dispose();
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;

    updateRunningState();
    io.disconnect();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
    if (themeMq) {
      if (themeMq.removeEventListener) themeMq.removeEventListener("change", onThemeChange);
      else if (themeMq.removeListener) themeMq.removeListener(onThemeChange);
    }
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", finishPointer);
    renderer.domElement.removeEventListener("pointercancel", finishPointer);
    renderer.domElement.removeEventListener("lostpointercapture", finishPointer);

    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) disposeMaterial(obj.material);
    });

    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return { destroy };
}
