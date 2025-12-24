const mount = document.getElementById("page-nav-mount");
if (mount) {
  try {
    const res = await fetch("/es/ui/page-nav.html", { cache: "no-store" });
    if (!res.ok) throw new Error("page-nav fetch failed");
    mount.innerHTML = await res.text();
  } catch {
    mount.innerHTML = "";
  }

  const topBtn = document.getElementById("scroll-top-button");
  if (topBtn) {
    const topWrap = topBtn.closest(".scroll-top-container") || topBtn;

    const updateTopBtnVisibility = () => {
      topWrap.hidden = true;

      const doc = document.documentElement;
      const overflow = doc.scrollHeight - doc.clientHeight;
      const needsScroll = overflow > 8;

      topWrap.hidden = !needsScroll;
    };

    updateTopBtnVisibility();
    window.addEventListener("resize", updateTopBtnVisibility, { passive: true });
    window.addEventListener("load", updateTopBtnVisibility, { once: true });
    setTimeout(updateTopBtnVisibility, 250);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(updateTopBtnVisibility);
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }

    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const backBtn = document.getElementById("back-button");
  const backHref = (document.body?.dataset?.backHref || "").trim();
  const backMode = (document.body?.dataset?.backMode || "").trim();

  if (backBtn) {
    backBtn.type = "button";

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
}
