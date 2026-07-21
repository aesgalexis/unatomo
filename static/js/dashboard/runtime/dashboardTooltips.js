export const createDashboardTooltips = () => {
  const clear = () => {
    document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
  };

  const attach = (target, { align = "center", placement = "top" } = {}) => {
    if (window.matchMedia &&
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tipEl = null;
    const show = () => {
      const label = target.getAttribute("data-tooltip");
      if (!label) return;
      clear();
      tipEl = document.createElement("div");
      tipEl.className = "mc-tooltip";
      tipEl.textContent = label;
      document.body.appendChild(tipEl);
      const rect = target.getBoundingClientRect();
      const sidePlacement = placement === "left" || placement === "right";
      const left = placement === "right"
        ? rect.right + 10
        : placement === "left"
          ? rect.left - tipEl.offsetWidth - 10
          : align === "right"
            ? rect.right - tipEl.offsetWidth
            : align === "left"
              ? rect.left
              : rect.left + (rect.width - tipEl.offsetWidth) / 2;
      const top = sidePlacement
        ? rect.top + (rect.height - tipEl.offsetHeight) / 2
        : placement === "bottom"
          ? rect.bottom + 10
          : rect.top - tipEl.offsetHeight - 10;
      tipEl.style.top = `${Math.max(8, top)}px`;
      tipEl.style.left = `${Math.max(8, left)}px`;
    };
    const hide = () => {
      if (tipEl?.parentNode) tipEl.parentNode.removeChild(tipEl);
      tipEl = null;
    };
    target.addEventListener("mouseenter", show);
    target.addEventListener("mouseleave", hide);
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
    target.addEventListener("click", hide);
  };

  const installGlobalCleanup = () => {
    ["pointerdown", "dragstart", "scroll", "resize"].forEach((eventName) => {
      window.addEventListener(eventName, clear, true);
    });
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
  };

  return { attach, clear, installGlobalCleanup };
};
