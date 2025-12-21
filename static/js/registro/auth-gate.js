// FILE: static/js/registro/auth-gate.js
import { auth } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const SELECTOR = "[data-requires-auth]";

function ensureToast() {
  let el = document.getElementById("auth-toast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "auth-toast";
  el.hidden = true;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.bottom = "18px";
  el.style.transform = "translateX(-50%)";
  el.style.maxWidth = "560px";
  el.style.width = "calc(100% - 24px)";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "14px";
  el.style.border = "1px solid var(--border-subtle)";
  el.style.background = "var(--panel-bg)";
  el.style.color = "var(--fg)";
  el.style.boxShadow = "0 10px 30px rgba(0,0,0,.18)";
  el.style.zIndex = "9999";
  el.style.textAlign = "center";
  el.style.backdropFilter = "blur(8px)";
  el.style.webkitTapHighlightColor = "transparent";

  document.body.appendChild(el);
  return el;
}

let toastTimer = null;
function toast(msg) {
  const el = ensureToast();
  el.textContent = msg;
  el.hidden = false;

  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

function setDisabledVisual(el, disabled) {
  if (!el) return;

  if (disabled) {
    el.dataset._authDisabled = "1";
    el.setAttribute("aria-disabled", "true");

    if (el.tagName === "A") {
      if (!el.dataset._href && el.getAttribute("href")) el.dataset._href = el.getAttribute("href");
    }

    el.style.opacity = "0.55";
    el.style.cursor = "not-allowed";
  } else {
    delete el.dataset._authDisabled;
    el.removeAttribute("aria-disabled");

    if (el.tagName === "A") {
      if (el.dataset._href) el.setAttribute("href", el.dataset._href);
    }

    el.style.opacity = "";
    el.style.cursor = "";
  }
}

function attachGuard(el) {
  if (el.dataset._guardBound === "1") return;
  el.dataset._guardBound = "1";

  el.addEventListener("click", (e) => {
    const authed = document.documentElement.dataset.auth === "user" || !!auth.currentUser;
    if (authed) return;

    e.preventDefault();
    e.stopPropagation();

    const msg =
      el.getAttribute("data-auth-msg") ||
      "Necesitas iniciar sesión para usar esta función.";

    toast(msg);
  });
}

function applyAuthState(isAuthed) {
  document.documentElement.dataset.auth = isAuthed ? "user" : "guest";

  document.querySelectorAll(SELECTOR).forEach((el) => {
    attachGuard(el);
    setDisabledVisual(el, !isAuthed);
  });
}

applyAuthState(document.documentElement.dataset.auth === "user" || !!auth.currentUser);

onAuthStateChanged(auth, (user) => {
  applyAuthState(!!user);
});

window.addEventListener("unatomo:auth", (e) => {
  const st = e?.detail?.state;
  if (st === "user") applyAuthState(true);
  if (st === "guest") applyAuthState(false);
});
