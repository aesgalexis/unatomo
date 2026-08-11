export const installQrPrintShell = () => {
  try {
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {}

  let scrollFrame = 0;
  const scrollDivider = document.createElement("div");
  scrollDivider.className = "qr-print-scroll-divider";
  scrollDivider.setAttribute("aria-hidden", "true");
  document.body.appendChild(scrollDivider);

  const sync = () => {
    scrollFrame = 0;
    const fixedMenus = document.querySelector(".qr-print-fixed-menus");
    const fixedMenusSpace = document.querySelector(".qr-print-fixed-menus-space");
    if (!fixedMenus || !fixedMenusSpace) return;
    fixedMenusSpace.style.height = `${fixedMenus.offsetHeight}px`;
    scrollDivider.style.top = `${Math.round(fixedMenus.getBoundingClientRect().bottom)}px`;
    scrollDivider.classList.toggle("is-visible", window.scrollY > 0);
    const groupTree = document.querySelector("#qr-print-mount .dashboard-group-tree");
    groupTree?.classList.toggle("is-content-scrolled", window.scrollY > 0);
    scrollDivider.style.left = groupTree && !groupTree.hidden
      ? `${Math.round(groupTree.getBoundingClientRect().right)}px`
      : "0px";
  };

  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(sync);
  }, { passive: true });
  window.addEventListener("resize", sync);
  return { sync };
};
