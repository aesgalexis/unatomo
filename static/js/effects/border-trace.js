(function () {
  const TARGET_SELECTOR = "#index-content-mount .card";
  const INSET = -2;
  const TRAIL_RATIO = 0.4;
  const SPEED_PX = 120;

  let card;
  let overlay;
  let svg;
  let trailPath;
  let hitPath;
  let trailGradient;
  let trailStopHead;
  let trailStopTail;
  let dot;
  let perimeter = 0;
  let width = 0;
  let height = 0;
  let progress = 0;
  let lastTs = 0;
  let paused = false;
  let dragging = false;
  let returning = false;
  let mode = "card";

  function ensureStyles() {
    if (document.getElementById("border-trace-styles")) return;
    const style = document.createElement("style");
    style.id = "border-trace-styles";
    style.textContent = `
      .border-trace-overlay{
        position:absolute;
        inset:0;
        pointer-events:auto;
        z-index:2;
        overflow:visible;
      }
      .border-trace-dot{
        position:absolute;
        width:28px;
        height:28px;
        border-radius:50%;
        background:transparent;
        transform:translate(-50%,-50%);
        pointer-events:auto;
        cursor:grab;
      }
      .border-trace-dot::before{
        content:"";
        position:absolute;
        inset:8px;
        border-radius:50%;
        background:#d4af37;
        box-shadow:0 0 10px rgba(212,175,55,1);
      }
      .border-trace-dot.is-dragging{
        cursor:grabbing;
        box-shadow:0 0 4px rgba(212,175,55,.35);
      }
      .border-trace-trail{
        pointer-events:stroke;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getBounds() {
    if (mode === "window") {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const rect = card.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function getRectMetrics() {
    const bounds = getBounds();
    width = Math.max(0, bounds.width - INSET * 2);
    height = Math.max(0, bounds.height - INSET * 2);
    perimeter = 2 * (width + height);
  }

  function buildOverlay() {
    card.style.position = "relative";
    overlay = document.createElement("div");
    overlay.className = "border-trace-overlay";

    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    trailGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    trailGradient.setAttribute("id", "border-trace-gradient");
    trailGradient.setAttribute("gradientUnits", "userSpaceOnUse");

    trailStopTail = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    trailStopTail.setAttribute("offset", "0%");
    trailStopTail.setAttribute("stop-color", "rgba(212,175,55,0)");

    const trailStopMid = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    trailStopMid.setAttribute("offset", "70%");
    trailStopMid.setAttribute("stop-color", "rgba(212,175,55,0.75)");

    trailStopHead = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    trailStopHead.setAttribute("offset", "100%");
    trailStopHead.setAttribute("stop-color", "rgba(255,255,255,0.9)");

    trailGradient.append(trailStopTail, trailStopMid, trailStopHead);
    defs.appendChild(trailGradient);
    svg.appendChild(defs);

    trailPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trailPath.setAttribute("fill", "none");
    trailPath.setAttribute("stroke", "url(#border-trace-gradient)");
    trailPath.setAttribute("stroke-width", "2");
    trailPath.setAttribute("stroke-linecap", "round");
    trailPath.setAttribute("class", "border-trace-trail");
    trailPath.style.filter = "drop-shadow(0 0 6px rgba(212,175,55,.5))";

    hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitPath.setAttribute("fill", "none");
    hitPath.setAttribute("stroke", "transparent");
    hitPath.setAttribute("stroke-width", "14");
    hitPath.setAttribute("stroke-linecap", "round");
    hitPath.style.pointerEvents = "stroke";
    hitPath.style.cursor = "grab";

    svg.appendChild(trailPath);
    svg.appendChild(hitPath);
    overlay.appendChild(svg);

    dot = document.createElement("div");
    dot.className = "border-trace-dot";
    dot.setAttribute("role", "button");
    dot.setAttribute("aria-label", "Punto dorado");
    overlay.appendChild(dot);

    card.appendChild(overlay);
  }

  function updatePath() {
    const bounds = getBounds();
    const w = bounds.width;
    const h = bounds.height;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    getRectMetrics();
  }

  function getPointAtDistance(d) {
    const w = width;
    const h = height;
    let x = 0;
    let y = 0;
    if (d <= w) {
      x = d;
      y = 0;
    } else if (d <= w + h) {
      x = w;
      y = d - w;
    } else if (d <= w + h + w) {
      x = w - (d - w - h);
      y = h;
    } else {
      x = 0;
      y = h - (d - w - h - w);
    }
    return { x: x + INSET, y: y + INSET };
  }

  function getDistanceAtPoint(x, y) {
    const localX = x - INSET;
    const localY = y - INSET;
    const distTop = Math.abs(localY);
    const distBottom = Math.abs(localY - height);
    const distLeft = Math.abs(localX);
    const distRight = Math.abs(localX - width);
    const min = Math.min(distTop, distBottom, distLeft, distRight);

    if (min === distTop) return clamp(localX, 0, width);
    if (min === distRight) return width + clamp(localY, 0, height);
    if (min === distBottom) return width + height + (width - clamp(localX, 0, width));
    return width + height + width + (height - clamp(localY, 0, height));
  }

  function setDotPosition(pos) {
    if (dragging || returning) return;
    dot.style.left = `${pos.x}px`;
    dot.style.top = `${pos.y}px`;
  }

  function setTrail(distance) {
    if (!trailPath) return;
    if (paused) {
      trailPath.style.opacity = "0";
      return;
    }
    const trailLength = perimeter * TRAIL_RATIO;
    trailPath.style.opacity = "1";
    const tail = (distance - trailLength + perimeter) % perimeter;
    const head = distance;
    const pathD = buildSegmentPath(tail, head);
    trailPath.setAttribute("d", pathD);
    hitPath.setAttribute("d", pathD);
    const tailPos = getPointAtDistance(tail);
    const headPos = getPointAtDistance(head);
    updateGradient(tailPos, headPos);
  }

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    if (!paused && !dragging && !returning && perimeter > 0) {
      const delta = SPEED_PX * dt;
      const d = (progress * perimeter + delta) % perimeter;
      progress = d / perimeter;
      const pos = getPointAtDistance(d);
      setDotPosition(pos);
      setTrail(d);
    }
    requestAnimationFrame(tick);
  }

  function closestPointOnBorder(clientX, clientY) {
    const bounds = getBounds();
    const left = bounds.left + INSET;
    const right = bounds.left + bounds.width - INSET;
    const top = bounds.top + INSET;
    const bottom = bounds.top + bounds.height - INSET;

    const x = clamp(clientX, left, right);
    const y = clamp(clientY, top, bottom);

    const dTop = Math.abs(y - top);
    const dBottom = Math.abs(y - bottom);
    const dLeft = Math.abs(x - left);
    const dRight = Math.abs(x - right);
    const min = Math.min(dTop, dBottom, dLeft, dRight);

    if (min === dTop) return { x, y: top };
    if (min === dRight) return { x: right, y };
    if (min === dBottom) return { x, y: bottom };
    return { x: left, y };
  }

  function updateGradient(tail, head) {
    if (!trailGradient) return;
    trailGradient.setAttribute("x1", tail.x);
    trailGradient.setAttribute("y1", tail.y);
    trailGradient.setAttribute("x2", head.x);
    trailGradient.setAttribute("y2", head.y);
  }

  function buildSegmentPath(tailDist, headDist) {
    const points = [];
    const corners = [
      { d: 0, x: INSET, y: INSET },
      { d: width, x: INSET + width, y: INSET },
      { d: width + height, x: INSET + width, y: INSET + height },
      { d: width + height + width, x: INSET, y: INSET + height },
      { d: perimeter, x: INSET, y: INSET },
    ];

    const addPointAt = (d) => points.push(getPointAtDistance(d));
    addPointAt(tailDist);

    const forward = (start, end) => {
      corners.forEach((corner) => {
        if (corner.d > start && corner.d < end) points.push({ x: corner.x, y: corner.y });
      });
      addPointAt(end);
    };

    if (tailDist <= headDist) {
      forward(tailDist, headDist);
    } else {
      forward(tailDist, perimeter);
      forward(0, headDist);
    }

    return points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  }

  function setReturnTrail(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const trailLen = Math.min(perimeter * TRAIL_RATIO, dist);
    const tx = to.x - (dx / dist) * trailLen;
    const ty = to.y - (dy / dist) * trailLen;
    trailPath.setAttribute("d", `M ${tx} ${ty} L ${to.x} ${to.y}`);
    updateGradient({ x: tx, y: ty }, to);
    trailPath.style.opacity = "1";
  }

  function returnToBorder(target, done) {
    returning = true;
    const startX = parseFloat(dot.style.left || "0");
    const startY = parseFloat(dot.style.top || "0");
    const dx = target.x - startX;
    const dy = target.y - startY;
    const dur = 450;
    const start = performance.now();

    function animate(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = t * (2 - t);
      const cx = startX + dx * eased;
      const cy = startY + dy * eased;
      dot.style.left = `${cx}px`;
      dot.style.top = `${cy}px`;
      setReturnTrail({ x: cx, y: cy }, target);
      if (t < 1) requestAnimationFrame(animate);
      else {
        returning = false;
        trailPath.style.opacity = "1";
        done();
      }
    }
    requestAnimationFrame(animate);
  }

  function bindDrag() {
    const startDrag = (e, captureEl) => {
      e.preventDefault();
      const rect = getBounds();
      if (mode === "card") {
        dot.style.position = "fixed";
      }
      paused = true;
      dragging = true;
      dot.classList.add("is-dragging");
      trailPath.style.opacity = "0";
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;

      const move = (ev) => {
        if (!dragging) return;
        dot.style.left = `${ev.clientX}px`;
        dot.style.top = `${ev.clientY}px`;
      };
      const end = (ev) => {
        if (!dragging) return;
        dragging = false;
        dot.classList.remove("is-dragging");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        if (isOverLogo(ev.clientX, ev.clientY)) {
          setMode("window");
        }
        const target = closestPointOnBorder(ev.clientX, ev.clientY);
        returnToBorder(target, () => {
          const bounds = getBounds();
          if (mode === "card") {
            dot.style.position = "absolute";
            dot.style.left = `${target.x - bounds.left}px`;
            dot.style.top = `${target.y - bounds.top}px`;
          } else {
            dot.style.position = "fixed";
            dot.style.left = `${target.x}px`;
            dot.style.top = `${target.y}px`;
          }
          const distance = getDistanceAtPoint(target.x - bounds.left, target.y - bounds.top);
          progress = perimeter > 0 ? distance / perimeter : 0;
          paused = false;
        });
      };

      if (captureEl && captureEl.setPointerCapture) {
        captureEl.setPointerCapture(e.pointerId);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end, { once: true });
    };

    dot.addEventListener("pointerdown", (e) => startDrag(e, dot));
    hitPath.addEventListener("pointerdown", (e) => startDrag(e, hitPath));
  }

  function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    if (mode === "window") {
      document.body.appendChild(overlay);
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      dot.style.position = "fixed";
    } else {
      card.appendChild(overlay);
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      dot.style.position = "absolute";
    }
    updatePath();
  }

  function isOverLogo(x, y) {
    const el = document.querySelector(".topbar-logo, .topbar-logo-link");
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function init(target) {
    card = target;
    ensureStyles();
    buildOverlay();
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    updatePath();
    bindDrag();
    requestAnimationFrame(tick);
    window.addEventListener("resize", updatePath);
  }

  function findTarget() {
    const target = document.querySelector(TARGET_SELECTOR);
    if (target) {
      init(target);
      return true;
    }
    return false;
  }

  function waitForContent() {
    if (findTarget()) return;
    const mount = document.getElementById("index-content-mount") || document.body;
    const obs = new MutationObserver(() => {
      if (findTarget()) obs.disconnect();
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForContent);
  } else {
    waitForContent();
  }
})();
