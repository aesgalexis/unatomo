import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "/static/js/registro/firebase-init.js";

const ADMIN_EMAIL = "aesg.alexis@gmail.com";
const STORAGE_KEY = "ls-admin-dot-position";
const DEFAULT_TOP = 87;
const DEFAULT_RIGHT = 18;
const DOT_SIZE = 10;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isAdminUser = (user) => normalizeEmail(user?.email) === ADMIN_EMAIL;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const loadPosition = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Number.isFinite(parsed.top) || !Number.isFinite(parsed.left)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const savePosition = (top, left) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ top, left }));
  } catch {}
};

const applyPosition = (dot, top, left) => {
  dot.style.top = `${top}px`;
  dot.style.left = `${left}px`;
  dot.style.right = "auto";
};

const buildDot = () => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "ls-admin-dot";
  dot.hidden = true;
  dot.setAttribute("aria-label", "Admin dot");

  const saved = loadPosition();
  if (saved) {
    applyPosition(dot, saved.top, saved.left);
  }

  let pointerId = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const stopDrag = () => {
    pointerId = null;
    dot.classList.remove("is-dragging");
  };

  dot.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    const rect = dot.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    dot.setPointerCapture(pointerId);
    dot.classList.add("is-dragging");
  });

  dot.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const maxLeft = Math.max(0, window.innerWidth - DOT_SIZE);
    const maxTop = Math.max(0, window.innerHeight - DOT_SIZE);
    const nextLeft = clamp(event.clientX - dragOffsetX, 0, maxLeft);
    const nextTop = clamp(event.clientY - dragOffsetY, 0, maxTop);
    applyPosition(dot, nextTop, nextLeft);
    savePosition(nextTop, nextLeft);
  });

  dot.addEventListener("pointerup", stopDrag);
  dot.addEventListener("pointercancel", stopDrag);

  window.addEventListener("resize", () => {
    const rect = dot.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - DOT_SIZE);
    const maxTop = Math.max(0, window.innerHeight - DOT_SIZE);
    const nextLeft = clamp(rect.left, 0, maxLeft);
    const nextTop = clamp(rect.top, 0, maxTop);
    applyPosition(dot, nextTop, nextLeft);
    savePosition(nextTop, nextLeft);
  });

  return dot;
};

const dot = buildDot();
document.body.appendChild(dot);

if (!loadPosition()) {
  const defaultLeft = Math.max(0, window.innerWidth - DEFAULT_RIGHT - DOT_SIZE);
  applyPosition(dot, DEFAULT_TOP, defaultLeft);
}

onAuthStateChanged(auth, (user) => {
  dot.hidden = !isAdminUser(user);
});
