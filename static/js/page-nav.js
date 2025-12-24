const mount = document.getElementById("page-nav-mount");
if (!mount) {}

try {
  const res = await fetch("/es/ui/page-nav.html", { cache: "no-store" });
  if (!res.ok) throw new Error("page-nav fetch failed");
  mount.innerHTML = await res.text();
} catch {
  mount.innerHTML = "";
}

const topBtn = document.getElementById("scroll-top-button");
if (topBtn) {
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const backBtn = document.getElementById("back-button");
const backHref = (document.body?.dataset?.backHref || "").trim();
const backMode = (document.body?.dataset?.backMode || "").trim();

if (backBtn) {
  if (backHref) {
    backBtn.hidden = false;
    backBtn.addEventListener("click", () => (window.location.href = backHref));
  } else if (backMode === "history") {
    backBtn.hidden = false;
    backBtn.addEventListener("click", () => history.back());
  } else {
    backBtn.hidden = true;
  }
}
