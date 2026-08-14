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

  const halo = document.createElement("span");
  halo.className = "mobile-primary-nav-halo";
  halo.setAttribute("aria-hidden", "true");
  halo.hidden = true;
  document.body.appendChild(halo);

  let open = false;
  let arcSlotWidth = 0;
  let arcSnapTimer = null;
  let arcUpdateFrame = null;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragMoved = false;
  let suppressNextClick = false;
  let lockedPageScrollY = 0;
  let arcEntryTimer = null;
  let arcEntryFrame = null;
  let arcEntryDeployFrame = null;

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

  const clearArcEntry = () => {
    if (arcEntryTimer) window.clearTimeout(arcEntryTimer);
    if (arcEntryFrame) window.cancelAnimationFrame(arcEntryFrame);
    if (arcEntryDeployFrame) window.cancelAnimationFrame(arcEntryDeployFrame);
    arcEntryTimer = null;
    arcEntryFrame = null;
    arcEntryDeployFrame = null;
    sectionNav.classList.remove("is-arc-preparing", "is-arc-entering");
    sectionNav.querySelectorAll(":scope > .dashboard-section-link")
      .forEach((link) => link.style.removeProperty("--mobile-arc-delay"));
  };

  const startArcEntry = () => {
    clearArcEntry();
    const toggleRect = toggle.getBoundingClientRect();
    const centerX = toggleRect.left + toggleRect.width / 2;
    const centerBottom = window.innerHeight - (toggleRect.top + toggleRect.height / 2);
    const links = [...sectionNav.querySelectorAll(":scope > .dashboard-section-link:not([hidden])")];
    sectionNav.classList.add("is-arc-preparing");
    links.forEach((link, index) => {
      link.style.setProperty("--mobile-arc-delay", `${index * 28}ms`);
      link.style.left = `${centerX}px`;
      link.style.bottom = `${centerBottom}px`;
    });
    sectionNav.getBoundingClientRect();
    arcEntryFrame = window.requestAnimationFrame(() => {
      arcEntryFrame = null;
      sectionNav.classList.remove("is-arc-preparing");
      sectionNav.classList.add("is-arc-entering");
      arcEntryDeployFrame = window.requestAnimationFrame(() => {
        arcEntryDeployFrame = null;
        updateArcPositions();
      });
    });
    arcEntryTimer = window.setTimeout(clearArcEntry, 460);
  };

  const setOpen = (nextOpen) => {
    const wasOpen = open;
    open = media.matches && nextOpen;
    if (open && !wasOpen) {
      lockedPageScrollY = window.scrollY;
    }
    document.documentElement.classList.toggle("mobile-primary-nav-open", open);
    sectionNav.classList.toggle("is-mobile-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      arcScroller.scrollLeft = 0;
      startArcEntry();
    } else if (wasOpen) {
      clearArcEntry();
      window.requestAnimationFrame(() => window.scrollTo(0, lockedPageScrollY));
    }
  };

  const syncLayout = () => {
    toggle.hidden = !media.matches;
    halo.hidden = !media.matches;
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
    if (suppressNextClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
      return;
    }
    if (event.target.closest("a")) {
      setOpen(false);
      return;
    }
    if (!open || arcSlotWidth <= 0) return;
    const toggleRect = toggle.getBoundingClientRect();
    const direction = event.clientX < toggleRect.left + toggleRect.width / 2 ? -1 : 1;
    arcScroller.scrollTo({
      left: arcScroller.scrollLeft + direction * arcSlotWidth,
      behavior: "smooth"
    });
  };
  const onDocumentClick = (event) => {
    if (!open || sectionNav.contains(event.target) || toggle.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  };
  const onDocumentKeydown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    arcScroller.scrollTo({
      left: arcScroller.scrollLeft + (event.key === "ArrowRight" ? arcSlotWidth : -arcSlotWidth),
      behavior: "smooth"
    });
  };
  const onScroll = () => {
    if (!media.matches || !open) return;
    if (Math.abs(window.scrollY - lockedPageScrollY) > 1) {
      window.requestAnimationFrame(() => window.scrollTo(0, lockedPageScrollY));
    }
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
  const onDocumentTouchMove = (event) => {
    if (!open || sectionNav.contains(event.target)) return;
    event.preventDefault();
  };
  const onArcPointerDown = (event) => {
    if (!open || !media.matches || event.button !== 0) return;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScrollLeft = arcScroller.scrollLeft;
    dragMoved = false;
  };
  const onArcPointerMove = (event) => {
    if (event.pointerId !== dragPointerId) return;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) >= 5 && !dragMoved) {
      dragMoved = true;
      sectionNav.setPointerCapture?.(event.pointerId);
      sectionNav.classList.add("is-dragging");
    }
    if (!dragMoved) return;
    event.preventDefault();
    arcScroller.scrollLeft = dragStartScrollLeft - delta;
  };
  const finishArcPointer = (event) => {
    if (event.pointerId !== dragPointerId) return;
    if (dragMoved) {
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 240);
      const targetLeft = Math.round(arcScroller.scrollLeft / arcSlotWidth) * arcSlotWidth;
      arcScroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
    if (sectionNav.hasPointerCapture?.(event.pointerId)) {
      sectionNav.releasePointerCapture(event.pointerId);
    }
    sectionNav.classList.remove("is-dragging");
    dragPointerId = null;
  };
  const onResize = scheduleArcUpdate;

  toggle.addEventListener("click", onToggleClick);
  sectionNav.addEventListener("click", onSectionClick);
  sectionNav.addEventListener("pointerdown", onArcPointerDown);
  sectionNav.addEventListener("pointermove", onArcPointerMove);
  sectionNav.addEventListener("pointerup", finishArcPointer);
  sectionNav.addEventListener("pointercancel", finishArcPointer);
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("keydown", onDocumentKeydown);
  document.addEventListener("wheel", onDocumentWheel, { passive: false });
  document.addEventListener("touchmove", onDocumentTouchMove, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  arcScroller.addEventListener("scroll", onArcScroll, { passive: true });
  media.addEventListener("change", syncLayout);
  syncLayout();

  return () => {
    media.removeEventListener("change", syncLayout);
    toggle.removeEventListener("click", onToggleClick);
    sectionNav.removeEventListener("click", onSectionClick);
    sectionNav.removeEventListener("pointerdown", onArcPointerDown);
    sectionNav.removeEventListener("pointermove", onArcPointerMove);
    sectionNav.removeEventListener("pointerup", finishArcPointer);
    sectionNav.removeEventListener("pointercancel", finishArcPointer);
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("keydown", onDocumentKeydown);
    document.removeEventListener("wheel", onDocumentWheel);
    document.removeEventListener("touchmove", onDocumentTouchMove);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    arcScroller.removeEventListener("scroll", onArcScroll);
    if (arcSnapTimer) window.clearTimeout(arcSnapTimer);
    if (arcUpdateFrame) window.cancelAnimationFrame(arcUpdateFrame);
    clearArcEntry();
    document.documentElement.classList.remove(
      "has-mobile-primary-nav",
      "mobile-primary-nav-open"
    );
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    arcScroller.remove();
    halo.remove();
    toggle.remove();
  };
};
