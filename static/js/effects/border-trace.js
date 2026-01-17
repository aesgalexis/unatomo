(function () {
  const TARGET_SELECTOR = "#index-content-mount .card";
  const INSET = 8;
  const TRAIL_RATIO = 0.2;
  const SPEED_PX = 120;

  let card;
  let overlay;
  let svg;
  let trailPath;
  let dot;
  let perimeter = 0;
  let width = 0;
  let height = 0;
  let progress = 0;
  let lastTs = 0;
  let paused = false;
  let dragging = false;
  let returning = false;

  function ensureStyles() {
    if (document.getElementById("border-trace-styles")) return;
    const style = document.createElement("style");
    style.id = "border-trace-styles";
    style.textContent = `
      .border-trace-overlay{
        position:absolute;
        inset:0;
        pointer-events:none;
        z-index:2;
      }
      .border-trace-dot{
        position:absolute;
        width:12px;
        height:12px;
        border-radius:50%;
        background:#d4af37;
        box-shadow:0 0 6px rgba(212,175,55,.6);
        transform:translate(-50%,-50%);
        pointer-events:auto;
        cursor:grab;
      }
      .border-trace-dot.is-dragging{
        cursor:grabbing;
        box-shadow:0 0 4px rgba(212,175,55,.35);
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getRectMetrics() {
    width = Math.max(0, card.clientWidth - INSET * 2);
    height = Math.max(0, card.clientHeight - INSET * 2);
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

    trailPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trailPath.setAttribute("fill", "none");
    trailPath.setAttribute("stroke", "rgba(212,175,55,0.8)");
    trailPath.setAttribute("stroke-width", "2");
    trailPath.setAttribute("stroke-linecap", "round");
    trailPath.style.filter = "drop-shadow(0 0 6px rgba(212,175,55,.5))";

    svg.appendChild(trailPath);
    overlay.appendChild(svg);

    dot = document.createElement("div");
    dot.className = "border-trace-dot";
    dot.setAttribute("role", "button");
    dot.setAttribute("aria-label", "Punto dorado");
    overlay.appendChild(dot);

    card.appendChild(overlay);
  }

  function updatePath() {
    const w = card.clientWidth;
    const h = card.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    trailPath.setAttribute(
      "d",
      `M ${INSET} ${INSET} H ${w - INSET} V ${h - INSET} H ${INSET} Z`
    );
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
    trailPath.style.strokeDasharray = `${trailLength} ${perimeter - trailLength}`;
    trailPath.style.strokeDashoffset = `${-(distance - trailLength)}`;
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
    const rect = card.getBoundingClientRect();
    const left = rect.left + INSET;
    const right = rect.right - INSET;
    const top = rect.top + INSET;
    const bottom = rect.bottom - INSET;

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
      dot.style.left = `${startX + dx * eased}px`;
      dot.style.top = `${startY + dy * eased}px`;
      if (t < 1) requestAnimationFrame(animate);
      else {
        returning = false;
        done();
      }
    }
    requestAnimationFrame(animate);
  }

  function bindDrag() {
    dot.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dot.setPointerCapture(e.pointerId);
      paused = true;
      dragging = true;
      dot.classList.add("is-dragging");
      trailPath.style.opacity = "0";
      dot.style.position = "fixed";
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    });

    dot.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    });

    dot.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      dot.classList.remove("is-dragging");
      dot.releasePointerCapture(e.pointerId);

      const target = closestPointOnBorder(e.clientX, e.clientY);
      returnToBorder(target, () => {
        const rect = card.getBoundingClientRect();
        dot.style.position = "absolute";
        dot.style.left = `${target.x - rect.left}px`;
        dot.style.top = `${target.y - rect.top}px`;
        const distance = getDistanceAtPoint(target.x - rect.left, target.y - rect.top);
        progress = perimeter > 0 ? distance / perimeter : 0;
        paused = false;
      });
    });
  }

  function init(target) {
    card = target;
    ensureStyles();
    buildOverlay();
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
