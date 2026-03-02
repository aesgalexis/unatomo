import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js";

export function initAtomWidget({
  container,
  pixelRatioCap = 1.8,
  onClick,
  atomScale = 1,
  orbitStyle = "adaptive",
  protonScale = 1,
  canvasScale = 1,
  renderMode = "container",
  interactionTarget = null,
  cameraFov = 45,
  cameraNear = 0.1,
  minCameraDistance = 2.2,
  maxCameraDistance = null,
} = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new Error("initAtomWidget requires a valid HTMLElement in 'container'.");
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(cameraFov, 1, cameraNear, 50);
  camera.position.set(0, 0, 5.2);
  let camDist = camera.position.length();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = "none";
  const scale = Math.max(1, canvasScale);
  const hasScaledCanvas = scale > 1.001;
  const isFloating = renderMode === "floating";
  if (isFloating) {
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.zIndex = "0";
    renderer.domElement.style.transform = "translate(-50%, -50%)";
  } else if (hasScaledCanvas) {
    container.style.position = "relative";
    container.style.overflow = "visible";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.left = "50%";
    renderer.domElement.style.top = "50%";
    renderer.domElement.style.transform = "translate(-50%, -50%)";
    renderer.domElement.style.width = `${(scale * 100).toFixed(0)}%`;
    renderer.domElement.style.height = `${(scale * 100).toFixed(0)}%`;
  }
  if (isFloating) document.body.appendChild(renderer.domElement);
  else container.appendChild(renderer.domElement);

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
    color: 0xaed7ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    wireframe: false,
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
    if (orbitStyle === "original") {
      orbitMat.color.set(0x8b5cf6);
      orbitMat.opacity = 0.35;
      orbitMat.wireframe = true;
      electronMat.color.set(0x22d3ee);
      electronMat.emissive.set(0x0ea5e9);
      electronMat.emissiveIntensity = 0.85;
      return;
    }

    if (orbitStyle === "grid") {
      orbitMat.color.set(0x5f6672);
      orbitMat.opacity = 0.62;
      orbitMat.wireframe = true;
    }

    if (getTheme() === "light") {
      if (orbitStyle !== "grid") {
        orbitMat.color.set(0x5f6672);
        orbitMat.opacity = 0.62;
        orbitMat.wireframe = false;
      }
      electronMat.color.set(0x2563eb);
      electronMat.emissive.set(0x1d4ed8);
      electronMat.emissiveIntensity = 0.9;
    } else {
      if (orbitStyle !== "grid") {
        orbitMat.color.set(0xaed7ff);
        orbitMat.opacity = 0.52;
        orbitMat.wireframe = false;
      }
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

  const electronGeo = new THREE.SphereGeometry(0.024, 14, 14);
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

    const tubeRadius =
      orbitStyle === "original"
        ? cfg.radius * 0.012
        : Math.max(cfg.radius * 0.012, 0.012);
    const ringRadialSegments = orbitStyle === "grid" ? 6 : 12;
    const ringTubularSegments = orbitStyle === "grid" ? 90 : 180;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        cfg.radius,
        tubeRadius,
        ringRadialSegments,
        ringTubularSegments
      ),
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
  let dragDistance = 0;
  let spinVelocityX = 0;
  let spinVelocityY = 0;
  const FRICTION = 0.985;
  let elapsed = 0;
  let maxCamDist = typeof maxCameraDistance === "number" ? maxCameraDistance : 14;

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
    let renderWidth = width;
    let renderHeight = height;
    if (isFloating && hasScaledCanvas) {
      const viewportDiag = Math.hypot(
        Math.max(1, window.innerWidth),
        Math.max(1, window.innerHeight)
      );
      const base = Math.max(viewportDiag, Math.max(width, height) * 2);
      const floatingSize = base * scale;
      renderWidth = floatingSize;
      renderHeight = floatingSize;
    } else if (hasScaledCanvas) {
      renderWidth = width * scale;
      renderHeight = height * scale;
    }

    camera.aspect = renderWidth / renderHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(renderWidth, renderHeight, false);

    if (isFloating) {
      const rect = container.getBoundingClientRect();
      renderer.domElement.style.left = `${rect.left + rect.width / 2}px`;
      renderer.domElement.style.top = `${rect.top + rect.height / 2}px`;
      renderer.domElement.style.width = `${Math.round(renderWidth)}px`;
      renderer.domElement.style.height = `${Math.round(renderHeight)}px`;
    }
  };

  const applyCameraDistance = (nextDist) => {
    camDist = Math.max(minCameraDistance, Math.min(maxCamDist, nextDist));
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(camDist));
    camera.lookAt(0, 0, 0);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", resize, { passive: true });

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
    dragDistance = 0;
    if (inputTarget.setPointerCapture) {
      try {
        inputTarget.setPointerCapture(event.pointerId);
      } catch {}
    }
    if (useGrabCursor) inputTarget.style.cursor = "grabbing";
  };

  const onPointerMove = (event) => {
    if (!isDragging || event.pointerId !== dragPointerId) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    dragDistance += Math.hypot(dx, dy);
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
    const wasClick = dragDistance < 6;
    isDragging = false;
    try {
      if (inputTarget.releasePointerCapture) inputTarget.releasePointerCapture(event.pointerId);
    } catch {}
    dragPointerId = null;
    dragDistance = 0;
    if (useGrabCursor) inputTarget.style.cursor = "grab";
    if (wasClick && typeof onClick === "function") onClick(event);
  };

  inputTarget.addEventListener("pointerdown", onPointerDown);
  inputTarget.addEventListener("pointermove", onPointerMove);
  inputTarget.addEventListener("pointerup", finishPointer);
  inputTarget.addEventListener("pointercancel", finishPointer);
  inputTarget.addEventListener("lostpointercapture", finishPointer);

  const onWheel = (event) => {
    event.preventDefault();
    const factor = 1 + Math.sign(event.deltaY) * 0.08;
    applyCameraDistance(camDist * factor);
  };
  inputTarget.addEventListener("wheel", onWheel, { passive: false });

  const touchDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  let touchPinching = false;
  let lastPinchDist = 0;

  const onTouchStart = (event) => {
    if (!event.touches || event.touches.length !== 2) return;
    touchPinching = true;
    lastPinchDist = touchDist(event.touches[0], event.touches[1]);
  };

  const onTouchMove = (event) => {
    if (!touchPinching || !event.touches || event.touches.length !== 2) return;
    event.preventDefault();
    const dist = touchDist(event.touches[0], event.touches[1]);
    if (lastPinchDist > 0) applyCameraDistance(camDist * (lastPinchDist / dist));
    lastPinchDist = dist;
  };

  const onTouchEnd = (event) => {
    if (event.touches && event.touches.length >= 2) return;
    touchPinching = false;
    lastPinchDist = 0;
  };

  inputTarget.addEventListener("touchstart", onTouchStart, { passive: false });
  inputTarget.addEventListener("touchmove", onTouchMove, { passive: false });
  inputTarget.addEventListener("touchend", onTouchEnd, { passive: true });
  inputTarget.addEventListener("touchcancel", onTouchEnd, { passive: true });

  if (isFloating && hasScaledCanvas) {
    const baseDist = camDist * scale;
    const autoMax = Math.max(18, baseDist * 2);
    maxCamDist = typeof maxCameraDistance === "number" ? maxCameraDistance : autoMax;
    applyCameraDistance(maxCamDist);
  }

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
    window.removeEventListener("scroll", resize);
    if (themeMq) {
      if (themeMq.removeEventListener) themeMq.removeEventListener("change", onThemeChange);
      else if (themeMq.removeListener) themeMq.removeListener(onThemeChange);
    }
    inputTarget.removeEventListener("pointerdown", onPointerDown);
    inputTarget.removeEventListener("pointermove", onPointerMove);
    inputTarget.removeEventListener("pointerup", finishPointer);
    inputTarget.removeEventListener("pointercancel", finishPointer);
    inputTarget.removeEventListener("lostpointercapture", finishPointer);
    inputTarget.removeEventListener("wheel", onWheel);
    inputTarget.removeEventListener("touchstart", onTouchStart);
    inputTarget.removeEventListener("touchmove", onTouchMove);
    inputTarget.removeEventListener("touchend", onTouchEnd);
    inputTarget.removeEventListener("touchcancel", onTouchEnd);

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
