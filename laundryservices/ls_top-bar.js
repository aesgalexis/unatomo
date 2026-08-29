(() => {
  const topbar = document.querySelector("#ls-topbar-mount .ls-topbar");
  if (!topbar) return;
  let lastY = Math.max(window.scrollY || 0, 0);
  let ticking = false;
  const syncVisibility = () => {
    ticking = false;
    const currentY = Math.max(window.scrollY || 0, 0);
    if (currentY <= 4) {
      topbar.classList.remove("is-hidden");
      lastY = currentY;
      return;
    }
    const diff = currentY - lastY;
    if (Math.abs(diff) < 6) return;
    topbar.classList.toggle("is-hidden", diff > 0);
    lastY = currentY;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncVisibility);
  }, {passive: true});
})();
