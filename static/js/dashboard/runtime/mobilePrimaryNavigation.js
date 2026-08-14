const MOBILE_NAV_QUERY = "(max-width: 768px)";

export const initMobilePrimaryNavigation = ({ sectionNav } = {}) => {
  if (!sectionNav) return () => {};

  const media = window.matchMedia(MOBILE_NAV_QUERY);
  const placeholder = document.createComment("dashboard-primary-navigation");
  sectionNav.parentNode?.insertBefore(placeholder, sectionNav);
  sectionNav.id = "dashboard-mobile-primary-nav";
  const arcScroller = document.createElement("div");
  arcScroller.className = "mobile-primary-nav-scroller";
  arcScroller.setAttribute("aria-hidden", "true");
  const arcTrack = document.createElement("span");
  arcTrack.className = "mobile-primary-nav-track";
  arcTrack.setAttribute("aria-hidden", "true");
  arcScroller.appendChild(arcTrack);
  sectionNav.appendChild(arcScroller);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-primary-nav-toggle";
  toggle.setAttribute("aria-controls", sectionNav.id);
  toggle.setAttribute("aria-haspopup", "true");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute(
    "aria-label",
    document.documentElement.lang === "en" ? "Open main navigation" : "Abrir navegación principal"
  );
  toggle.innerHTML = `
    <img
      src="/static/img/logo-unatomo-round-outline-v1.0.svg"
      alt=""
      class="mobile-primary-nav-logo topbar-logo--rotating"
      aria-hidden="true"
    >
  `;
  document.body.appendChild(toggle);

  let open = false;
  let lastScrollY = window.scrollY;
  let scrollAnchorY = lastScrollY;
  let lastDirection = "up";
  let arcSlotWidth = 0;
  let arcSnapTimer = null;
  let arcUpdateFrame = null;

  const updateArcPositions = () => {
    if (!media.matches) return;
    const links = [...sectionNav.querySelectorAll(":scope > .dashboard-section-link:not([hidden])")];
    if (!links.length) return;
    const visibleSlots = Math.min(6, links.length);
    const arcRadius = Math.min(98, Math.max(88, window.innerWidth * 0.25));
    sectionNav.style.setProperty("--mobile-arc-radius", `${arcRadius}px`);
    const navRect = sectionNav.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    const arcCenter = toggleRect.left + toggleRect.width / 2;
    const logoCenterBottom = window.innerHeight - (toggleRect.top + toggleRect.height / 2);
    const slotWidth = visibleSlots > 1 ? navRect.width / (visibleSlots - 1) : navRect.width;
    arcSlotWidth = slotWidth;
    const extraSlots = Math.max(0, links.length - visibleSlots);
    arcTrack.style.width = `${navRect.width + extraSlots * slotWidth}px`;
    const scrollPosition = slotWidth > 0 ? arcScroller.scrollLeft / slotWidth : 0;

    links.forEach((link, index) => {
      const slot = index - scrollPosition;
      const angle = visibleSlots > 1
        ? Math.PI - (slot * Math.PI) / (visibleSlots - 1)
        : Math.PI / 2;
      const x = arcCenter + arcRadius * Math.cos(angle);
      const y = logoCenterBottom + arcRadius * Math.sin(angle);
      link.style.left = `${x}px`;
      link.style.bottom = `${y}px`;
    });
  };

  const scheduleArcUpdate = () => {
    if (arcUpdateFrame) return;
    arcUpdateFrame = window.requestAnimationFrame(() => {
      arcUpdateFrame = null;
      updateArcPositions();
    });
  };

  const setOpen = (nextOpen) => {
    open = media.matches && nextOpen;
    document.documentElement.classList.toggle("mobile-primary-nav-open", open);
    sectionNav.classList.toggle("is-mobile-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      arcScroller.scrollLeft = 0;
      scheduleArcUpdate();
    }
  };

  const syncLayout = () => {
    toggle.hidden = !media.matches;
    if (media.matches) {
      document.body.appendChild(sectionNav);
      document.documentElement.classList.add("has-mobile-primary-nav");
      updateArcPositions();
      setOpen(false);
      return;
    }
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    document.documentElement.classList.remove("has-mobile-primary-nav");
    setOpen(false);
  };

  const onToggleClick = () => setOpen(!open);
  const onSectionClick = (event) => {
    if (event.target.closest("a")) setOpen(false);
  };
  const onDocumentClick = (event) => {
    if (!open || sectionNav.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  };
  const onDocumentKeydown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    arcScroller.scrollTo({
      left: arcScroller.scrollLeft + (event.key === "ArrowRight" ? arcSlotWidth : -arcSlotWidth),
      behavior: "smooth"
    });
  };
  const onScroll = () => {
    if (!media.matches || open) return;
    const nextScrollY = Math.max(0, window.scrollY);
    const direction = nextScrollY > lastScrollY ? "down" : "up";
    if (direction !== lastDirection) {
      scrollAnchorY = lastScrollY;
      lastDirection = direction;
    }
    if (direction === "down" && nextScrollY - scrollAnchorY >= 12 && nextScrollY > 72) {
      document.documentElement.classList.add("mobile-topbar-hidden");
      scrollAnchorY = nextScrollY;
    } else if (direction === "up" && scrollAnchorY - nextScrollY >= 8) {
      document.documentElement.classList.remove("mobile-topbar-hidden");
      scrollAnchorY = nextScrollY;
    }
    if (nextScrollY <= 12) {
      document.documentElement.classList.remove("mobile-topbar-hidden");
      scrollAnchorY = nextScrollY;
    }
    lastScrollY = nextScrollY;
  };
  const onArcScroll = () => {
    scheduleArcUpdate();
    if (arcSnapTimer) window.clearTimeout(arcSnapTimer);
    arcSnapTimer = window.setTimeout(() => {
      arcSnapTimer = null;
      if (!open || arcSlotWidth <= 0) return;
      const targetLeft = Math.round(arcScroller.scrollLeft / arcSlotWidth) * arcSlotWidth;
      arcScroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    }, 110);
  };
  const onDocumentWheel = (event) => {
    if (!open || !media.matches) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    arcScroller.scrollLeft += delta * 0.48;
  };
  const onResize = scheduleArcUpdate;

  toggle.addEventListener("click", onToggleClick);
  sectionNav.addEventListener("click", onSectionClick);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);
  document.addEventListener("wheel", onDocumentWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  arcScroller.addEventListener("scroll", onArcScroll, { passive: true });
  media.addEventListener("change", syncLayout);
  syncLayout();

  return () => {
    media.removeEventListener("change", syncLayout);
    toggle.removeEventListener("click", onToggleClick);
    sectionNav.removeEventListener("click", onSectionClick);
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);
    document.removeEventListener("wheel", onDocumentWheel);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    arcScroller.removeEventListener("scroll", onArcScroll);
    if (arcSnapTimer) window.clearTimeout(arcSnapTimer);
    if (arcUpdateFrame) window.cancelAnimationFrame(arcUpdateFrame);
    document.documentElement.classList.remove(
      "has-mobile-primary-nav",
      "mobile-primary-nav-open",
      "mobile-topbar-hidden"
    );
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    arcScroller.remove();
    toggle.remove();
  };
};
