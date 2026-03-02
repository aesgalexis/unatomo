import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js";

export function initAtomWidget({
  container,
  pixelRatioCap = 1.8,
  atomScale = 1,
  protonScale = 1,
  renderMode = "container",
  interactionTarget = null,
  canvasScale = 1.9,
  enableZoom = true,
  zoomMaxPercent = 100,
  maxZoomOutScale = 1,
} = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new Error("initAtomWidget requires a valid HTMLElement in 'container'.");
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  const rawBaseCamDist = camera.position.length();
  const isFloating = renderMode === "floating";
  const scale = Math.max(1, canvasScale);
  const baseCamDist = isFloating ? rawBaseCamDist * scale : rawBaseCamDist;
  let camDist = baseCamDist;
  const minCamDist = Math.max(0.8, baseCamDist / (1 + Math.max(0, zoomMaxPercent) / 100));
  const maxCamDist = Math.max(minCamDist, baseCamDist * Math.max(0.1, maxZoomOutScale));

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;

  if (isFloating) {
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.transform = "translate(-50%, -50%)";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.zIndex = "0";
    document.body.appendChild(renderer.domElement);
  } else {
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);
  }

  const inputTarget =
    interactionTarget instanceof HTMLElement ? interactionTarget : renderer.domElement;
  if (inputTarget === container) inputTarget.style.touchAction = "none";
  const useGrabCursor =
    (inputTarget instanceof HTMLElement && inputTarget.classList.contains("hero-atom")) ||
    container.classList.contains("hero-atom");
  if (useGrabCursor) inputTarget.style.cursor = "grab";

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const key = new THREE.PointLight(0xcde6ff, 1.0, 20);
  key.position.set(2.4, 2.2, 3.4);
  scene.add(key);

  const rim = new THREE.PointLight(0xffc7d6, 0.5, 18);
  rim.position.set(-2.8, -2.3, -2.6);
  scene.add(rim);

  const atom = new THREE.Group();
  atom.scale.setScalar(atomScale);
  scene.add(atom);

  const nucleus = new THREE.Group();
  atom.add(nucleus);

  const protonGeo = new THREE.SphereGeometry(0.074 * protonScale, 16, 16);
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
    const spread = 0.315;
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
    color: 0x5f6672,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    wireframe: false,
  });

  const electronGeo = new THREE.SphereGeometry(0.024, 14, 14);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.1,
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
      electronMat.color.set(0x2563eb);
      electronMat.emissive.set(0x1d4ed8);
      electronMat.emissiveIntensity = 0.9;
    } else {
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

  const orbitGroups = [];
  orbitConfigs.forEach((cfg) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, Math.max(cfg.radius * 0.012, 0.012), 12, 180),
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

  const applyCameraDistance = (nextDist) => {
    camDist = Math.max(minCamDist, Math.min(maxCamDist, nextDist));
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(camDist));
    camera.lookAt(0, 0, 0);
  };

  const getSize = () => ({
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight),
  });

  const resize = () => {
    if (destroyed) return;
    const { width, height } = getSize();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));

    if (isFloating) {
      const rect = container.getBoundingClientRect();
      const renderSize = Math.max(width, height) * scale;
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      renderer.setSize(renderSize, renderSize, false);
      renderer.domElement.style.left = `${rect.left + rect.width / 2}px`;
      renderer.domElement.style.top = `${rect.top + rect.height / 2}px`;
      renderer.domElement.style.width = `${Math.round(renderSize)}px`;
      renderer.domElement.style.height = `${Math.round(renderSize)}px`;
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

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

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("resize", resize);
  if (isFloating) window.addEventListener("scroll", resize, { passive: true });

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
    try {
      inputTarget.setPointerCapture(event.pointerId);
    } catch {}
    if (useGrabCursor) inputTarget.style.cursor = "grabbing";
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
      inputTarget.releasePointerCapture(event.pointerId);
    } catch {}
    dragPointerId = null;
    if (useGrabCursor) inputTarget.style.cursor = "grab";
  };

  inputTarget.addEventListener("pointerdown", onPointerDown);
  inputTarget.addEventListener("pointermove", onPointerMove);
  inputTarget.addEventListener("pointerup", finishPointer);
  inputTarget.addEventListener("pointercancel", finishPointer);
  inputTarget.addEventListener("lostpointercapture", finishPointer);

  let touchPinching = false;
  let lastPinchDist = 0;

  const getTouchDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const onWheel = (event) => {
    if (!enableZoom) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.92 : 1.08;
    applyCameraDistance(camDist * factor);
  };

  const onTouchStart = (event) => {
    if (!enableZoom || !event.touches || event.touches.length !== 2) return;
    touchPinching = true;
    lastPinchDist = getTouchDist(event.touches[0], event.touches[1]);
  };

  const onTouchMove = (event) => {
    if (!enableZoom || !touchPinching || !event.touches || event.touches.length !== 2) return;
    event.preventDefault();
    const dist = getTouchDist(event.touches[0], event.touches[1]);
    if (lastPinchDist > 0) applyCameraDistance(camDist * (lastPinchDist / dist));
    lastPinchDist = dist;
  };

  const onTouchEnd = (event) => {
    if (!event.touches || event.touches.length < 2) {
      touchPinching = false;
      lastPinchDist = 0;
    }
  };

  if (enableZoom) {
    inputTarget.addEventListener("wheel", onWheel, { passive: false });
    inputTarget.addEventListener("touchstart", onTouchStart, { passive: false });
    inputTarget.addEventListener("touchmove", onTouchMove, { passive: false });
    inputTarget.addEventListener("touchend", onTouchEnd, { passive: true });
    inputTarget.addEventListener("touchcancel", onTouchEnd, { passive: true });
  }

  applyCameraDistance(maxCamDist);
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
    if (isFloating) window.removeEventListener("scroll", resize);
    if (themeMq) {
      if (themeMq.removeEventListener) themeMq.removeEventListener("change", onThemeChange);
      else if (themeMq.removeListener) themeMq.removeListener(onThemeChange);
    }

    inputTarget.removeEventListener("pointerdown", onPointerDown);
    inputTarget.removeEventListener("pointermove", onPointerMove);
    inputTarget.removeEventListener("pointerup", finishPointer);
    inputTarget.removeEventListener("pointercancel", finishPointer);
    inputTarget.removeEventListener("lostpointercapture", finishPointer);

    if (enableZoom) {
      inputTarget.removeEventListener("wheel", onWheel);
      inputTarget.removeEventListener("touchstart", onTouchStart);
      inputTarget.removeEventListener("touchmove", onTouchMove);
      inputTarget.removeEventListener("touchend", onTouchEnd);
      inputTarget.removeEventListener("touchcancel", onTouchEnd);
    }

    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) disposeMaterial(obj.material);
    });

    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  return { destroy };
}
