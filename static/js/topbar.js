import { initThemeToggle } from "/static/js/theme-toggle.js";

const mount =
  document.getElementById("topbar-mount") ||
  (() => {
    const d = document.createElement("div");
    d.id = "topbar-mount";
    document.body.insertBefore(d, document.body.firstChild);
    return d;
  })();

try {
  const res = await fetch("/es/ui/topbar.html", { cache: "no-store" });
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

initThemeToggle();

await import("/static/js/registro/session-menu.js");
