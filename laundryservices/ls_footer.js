(() => {
  const legalFooter = document.getElementById("legal-footer");
  const control = legalFooter?.querySelector(".ls-footer-disclosure-control");
  const toggle = control?.querySelector(".ls-footer-disclosure-toggle");
  const panel = control?.querySelector(".ls-footer-disclosure-panel");
  if (!legalFooter || !control || !toggle || !panel) return;
  let closeTimer = null;
  let scrollFrame = null;

  const scrollToDocumentEnd = () => {
    const documentHeight = Math.max(document.documentElement?.scrollHeight || 0, document.body?.scrollHeight || 0);
    window.scrollTo({top: documentHeight, left: 0, behavior: "auto"});
  };
  const followExpansion = (until) => {
    if (!control.classList.contains("is-open")) {
      scrollFrame = null;
      return;
    }
    scrollToDocumentEnd();
    if (performance.now() < until) {
      scrollFrame = window.requestAnimationFrame(() => followExpansion(until));
    } else {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollToDocumentEnd();
        scrollFrame = null;
      });
    }
  };
  const close = ({restoreFocus = false} = {}) => {
    if (panel.hidden) return;
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    control.classList.remove("is-open");
    control.classList.add("is-closing");
    toggle.setAttribute("aria-expanded", "false");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer = window.setTimeout(() => {
      panel.hidden = true;
      control.classList.remove("is-closing");
      closeTimer = null;
    }, reducedMotion ? 0 : 180);
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    if (!opening) {
      close();
      return;
    }
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    panel.hidden = false;
    control.classList.remove("is-closing");
    toggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      control.classList.add("is-open");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      followExpansion(performance.now() + (reducedMotion ? 0 : 420));
    });
  });
  document.addEventListener("click", (event) => {
    if (!legalFooter.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      close({restoreFocus: true});
    }
  });
})();
