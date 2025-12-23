const mount =
  document.getElementById("topbar-mount") ||
  (() => {
    const d = document.createElement("div");
    d.id = "topbar-mount";
    document.body.insertBefore(d, document.body.firstChild);
    return d;
  })();

try {
  const res = await fetch("/es/topbar.html", { cache: "no-store" });
  if (!res.ok) throw new Error("topbar fetch failed");
  mount.innerHTML = await res.text();
} catch {
  mount.innerHTML = "";
}

const titleEl = document.getElementById("topbar-title");
if (titleEl) {
  const t = (document.body?.dataset?.topbarTitle || "").trim();
  if (t) titleEl.textContent = t;
}

const root = document.documentElement;
const btn = document.getElementById("theme-toggle");

const prefersDark =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

let saved = null;
try {
  saved = localStorage.getItem("theme");
} catch {}

if (saved === "light" || saved === "dark") {
  root.setAttribute("data-theme", saved);
}

setBtnLabel(getCurrentTheme());

if (btn) {
  btn.addEventListener("click", () => {
    const current = getCurrentTheme();
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setBtnLabel(next);
  });
}

if (!saved && window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e) => {
    root.removeAttribute("data-theme");
    setBtnLabel(e.matches ? "dark" : "light");
  };
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else if (mq.addListener) mq.addListener(handler);
}

function getCurrentTheme() {
  const attr = root.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return prefersDark ? "dark" : "light";
}

function setBtnLabel(mode) {
  if (!btn) return;
  btn.textContent = mode === "dark" ? "☼" : "☾";
  btn.setAttribute(
    "aria-label",
    mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
  );
}

await import("/static/js/registro/session-menu.js");
