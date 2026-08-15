import { createMobileQrScanner } from "./mobileQrScanner.js";

const MOBILE_NAV_QUERY = "(max-width: 768px)";
const MOBILE_INFORMATION_SECTIONS = new Set([
  "novedades",
  "tags",
  "contacto",
  "privacidad",
  "privacy"
]);

const getHashSection = () => (window.location.hash || "")
  .replace(/^#/, "")
  .replace(/^\/+/, "")
  .trim()
  .toLowerCase();

const MOBILE_MENU_ICONS = {
  more: '<path d="M5 5h5v5H5V5Zm9 0h5v5h-5V5ZM5 14h5v5H5v-5Zm9 0h5v5h-5v-5Z"></path>',
  scan: '<path d="M3 3h7v2H5v5H3V3Zm11 0h7v7h-2V5h-5V3ZM3 14h2v5h5v2H3v-7Zm16 0h2v7h-7v-2h5v-5ZM8 8h8v8H8V8Zm2 2v4h4v-4h-4Z"></path>',
  back: '<path d="m14.7 5.3-1.4-1.4L5.2 12l8.1 8.1 1.4-1.4L9 13h10v-2H9l5.7-5.7Z"></path>',
  news: '<path d="M12 2c.8 5.8 4.2 9.2 10 10-5.8.8-9.2 4.2-10 10-.8-5.8-4.2-9.2-10-10 5.8-.8 9.2-4.2 10-10Z"></path>',
  tags: '<path d="M3 4a1 1 0 0 1 1-1h7.6a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L3.6 13A2 2 0 0 1 3 11.6V4Zm4 2.25A1.75 1.75 0 1 0 7 9.75a1.75 1.75 0 0 0 0-3.5Z"></path>',
  contact: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 9L4 7v11h16V7l-8 6Zm0-2.5L18 6H6l6 4.5Z"></path>',
  privacy: '<path d="M12 2 4 5v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V5l-8-3Zm0 5a3 3 0 0 1 3 3v1h1v6H8v-6h1v-1a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1h2v-1a1 1 0 0 0-1-1Z"></path>',
  credits: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"></path>'
};

const createMobileMenuItem = ({ label, icon, href = "", className = "" }) => {
  const item = document.createElement(href ? "a" : "button");
  if (!href) item.type = "button";
  if (href) item.href = href;
  item.className = `dashboard-section-link ${className}`.trim();
  item.dataset.sectionLabel = label;
  item.setAttribute("aria-label", label);
  const iconElement = document.createElement("span");
  iconElement.className = "dashboard-section-icon";
  iconElement.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>`;
  item.appendChild(iconElement);
  return item;
};

export const initMobilePrimaryNavigation = ({ sectionNav, suggestionsLink } = {}) => {
  if (!sectionNav) return () => {};

  const media = window.matchMedia(MOBILE_NAV_QUERY);
  const placeholder = document.createComment("dashboard-primary-navigation");
  sectionNav.parentNode?.insertBefore(placeholder, sectionNav);
  sectionNav.id = "dashboard-mobile-primary-nav";
  const isEnglish = document.documentElement.lang === "en";
  const lang = isEnglish ? "en" : "es";
  const basePath = `/nfc/${lang}`;
  const originalSectionLinks = [...sectionNav.querySelectorAll(":scope > .dashboard-section-link")];
  const suggestionsOriginalParent = suggestionsLink?.parentNode || null;
  const suggestionsOriginalNextSibling = suggestionsLink?.nextSibling || null;
  suggestionsLink?.classList.add(
    "mobile-primary-nav-secondary-link",
    "mobile-primary-nav-mobile-only"
  );

  const handle = document.createElement("span");
  handle.className = "mobile-primary-nav-handle";
  handle.setAttribute("aria-hidden", "true");
  sectionNav.prepend(handle);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-primary-nav-toggle";
  toggle.setAttribute("aria-controls", sectionNav.id);
  toggle.setAttribute("aria-haspopup", "menu");
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

  const backdrop = document.createElement("div");
  backdrop.className = "mobile-primary-nav-backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  document.body.insertBefore(backdrop, toggle);

  const qrScanner = createMobileQrScanner({ isEnglish });

  const scanButton = createMobileMenuItem({
    label: isEnglish ? "Scan" : "Escanear",
    icon: MOBILE_MENU_ICONS.scan,
    className: "mobile-primary-nav-primary-action mobile-primary-nav-menu-button mobile-primary-nav-mobile-only"
  });

  const moreButton = createMobileMenuItem({
    label: isEnglish ? "More" : "Más",
    icon: MOBILE_MENU_ICONS.more,
    className: "mobile-primary-nav-primary-action mobile-primary-nav-menu-button mobile-primary-nav-mobile-only"
  });
  const backButton = createMobileMenuItem({
    label: isEnglish ? "Back" : "Volver",
    icon: MOBILE_MENU_ICONS.back,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-menu-button mobile-primary-nav-mobile-only"
  });
  const newsLink = createMobileMenuItem({
    label: isEnglish ? "What’s new" : "Novedades",
    icon: MOBILE_MENU_ICONS.news,
    href: `${basePath}/index.html#/novedades`,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-mobile-only"
  });
  const tagsLink = createMobileMenuItem({
    label: isEnglish ? "Physical tags" : "Tags físicos",
    icon: MOBILE_MENU_ICONS.tags,
    href: `${basePath}/index.html#/tags`,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-mobile-only"
  });
  const contactLink = createMobileMenuItem({
    label: isEnglish ? "Contact" : "Contacto",
    icon: MOBILE_MENU_ICONS.contact,
    href: `${basePath}/index.html#/contacto`,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-mobile-only"
  });
  const privacyLink = createMobileMenuItem({
    label: isEnglish ? "Privacy" : "Privacidad",
    icon: MOBILE_MENU_ICONS.privacy,
    href: `${basePath}/index.html#/privacidad`,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-mobile-only"
  });
  const creditsButton = createMobileMenuItem({
    label: isEnglish ? "Credits" : "Créditos",
    icon: MOBILE_MENU_ICONS.credits,
    className: "mobile-primary-nav-secondary-link mobile-primary-nav-menu-button mobile-primary-nav-mobile-only"
  });
  const creditsPanel = document.createElement("div");
  creditsPanel.className = "mobile-primary-nav-credits-panel mobile-primary-nav-mobile-only";
  creditsPanel.innerHTML = `
    <div class="mobile-primary-nav-credits-header">
      <button type="button" class="mobile-primary-nav-credits-back" aria-label="${isEnglish ? "Back to More" : "Volver a Más"}">
        <span class="dashboard-section-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">${MOBILE_MENU_ICONS.back}</svg>
        </span>
        <span>${isEnglish ? "Back" : "Volver"}</span>
      </button>
      <strong>${isEnglish ? "Credits" : "Créditos"}</strong>
    </div>
    <div class="mobile-primary-nav-credits-body">
      <strong class="mobile-primary-nav-credits-brand">UNATOMO/NFC</strong>
      <p>${isEnglish
        ? "We connect people, machines, and processes."
        : "Conectamos personas, máquinas y procesos."}</p>
      <div class="mobile-primary-nav-credits-section">
        <span>${isEnglish ? "Technology" : "Tecnología"}</span>
        <div class="mobile-primary-nav-credits-links">
          <a href="https://openai.com/" target="_blank" rel="noopener">OpenAI</a>
          <a href="https://openai.com/codex/" target="_blank" rel="noopener">Codex</a>
          <a href="https://firebase.google.com/" target="_blank" rel="noopener">Firebase</a>
          <a href="https://github.com/" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
      <p class="mobile-primary-nav-credits-note">${isEnglish
        ? "Developed using OpenAI Codex tools. Authentication, data, and storage on Google Firebase; code and publishing with GitHub."
        : "Desarrollado con herramientas de OpenAI Codex. Autenticación, datos y almacenamiento sobre Firebase de Google; código y publicación con GitHub."}</p>
      <p class="mobile-primary-nav-credits-powered">Powered by <a href="/landing/nosotros/">people who like machines</a>.</p>
      <small>© ${new Date().getFullYear()} UNATOMO CORE SL · ${isEnglish ? "All rights reserved." : "Todos los derechos reservados."}</small>
    </div>
  `;
  const creditsBackButton = creditsPanel.querySelector(".mobile-primary-nav-credits-back");
  const pagesWindow = document.createElement("div");
  pagesWindow.className = "mobile-primary-nav-pages-window";
  const pagesTrack = document.createElement("div");
  pagesTrack.className = "mobile-primary-nav-pages-track";
  const primaryPage = document.createElement("div");
  primaryPage.className = "mobile-primary-nav-page mobile-primary-nav-page--primary";
  const morePage = document.createElement("div");
  morePage.className = "mobile-primary-nav-page mobile-primary-nav-page--more";
  const creditsPage = document.createElement("div");
  creditsPage.className = "mobile-primary-nav-page mobile-primary-nav-page--credits";

  const mountMobileLayout = () => {
    originalSectionLinks.forEach((link) => primaryPage.appendChild(link));
    primaryPage.append(scanButton, moreButton);
    morePage.replaceChildren(backButton, newsLink);
    if (suggestionsLink) morePage.appendChild(suggestionsLink);
    morePage.append(tagsLink, contactLink, privacyLink, creditsButton);
    creditsPage.replaceChildren(creditsPanel);
    pagesTrack.replaceChildren(primaryPage, morePage, creditsPage);
    pagesWindow.replaceChildren(pagesTrack);
    sectionNav.replaceChildren(handle, pagesWindow);
    suggestionsLink?.classList.add(
      "mobile-primary-nav-secondary-link",
      "mobile-primary-nav-mobile-only"
    );
  };

  const mountDesktopLayout = () => {
    suggestionsLink?.classList.remove(
      "mobile-primary-nav-secondary-link",
      "mobile-primary-nav-mobile-only"
    );
    sectionNav.replaceChildren(...originalSectionLinks);
  };

  let open = false;
  let lockedScrollY = 0;
  let pageLocked = false;
  let bodyStyleSnapshot = null;
  let inertElements = [];
  let dragPointerId = null;
  let dragStartY = 0;
  let dragDistance = 0;
  let dragStartedAt = 0;

  const lockPage = () => {
    if (pageLocked) return;
    pageLocked = true;
    lockedScrollY = window.scrollY;
    bodyStyleSnapshot = {
      position: document.body.style.position,
      top: document.body.style.top,
      right: document.body.style.right,
      left: document.body.style.left,
      width: document.body.style.width
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.right = "0";
    document.body.style.left = "0";
    document.body.style.width = "100%";
    inertElements = [...document.body.children]
      .filter((element) => (
        element !== sectionNav &&
        element !== toggle &&
        element !== backdrop &&
        element !== qrScanner.element
      ))
      .map((element) => ({ element, inert: element.inert }));
    inertElements.forEach(({ element }) => { element.inert = true; });
  };

  const unlockPage = () => {
    if (!pageLocked) return;
    pageLocked = false;
    inertElements.forEach(({ element, inert }) => { element.inert = inert; });
    inertElements = [];
    Object.assign(document.body.style, bodyStyleSnapshot || {});
    bodyStyleSnapshot = null;
    window.scrollTo(0, lockedScrollY);
  };

  const setOpen = (nextOpen) => {
    const wasOpen = open;
    open = media.matches && nextOpen;
    document.documentElement.classList.toggle("mobile-primary-nav-open", open);
    sectionNav.classList.toggle("is-mobile-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      document.documentElement.lang === "en"
        ? (open ? "Close main navigation" : "Open main navigation")
        : (open ? "Cerrar navegación principal" : "Abrir navegación principal")
    );
    backdrop.hidden = !open;
    backdrop.classList.toggle("is-visible", open);
    if (open && !wasOpen) lockPage();
    if (!open && wasOpen) unlockPage();
    if (!open) sectionNav.classList.remove("is-more-page", "is-credits-page");
  };

  const syncLayout = () => {
    const isInformationSection = MOBILE_INFORMATION_SECTIONS.has(getHashSection());
    toggle.hidden = !media.matches || isInformationSection;
    document.documentElement.classList.toggle(
      "mobile-primary-nav-information-view",
      media.matches && isInformationSection
    );
    if (media.matches) {
      mountMobileLayout();
      document.body.appendChild(sectionNav);
      document.documentElement.classList.add("has-mobile-primary-nav");
      setOpen(false);
      return;
    }
    mountDesktopLayout();
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    document.documentElement.classList.remove("has-mobile-primary-nav");
    setOpen(false);
  };

  const onToggleClick = () => setOpen(!open);
  const onSectionClick = (event) => {
    if (event.target.closest("a")) setOpen(false);
  };
  const onBackdropClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  };
  const openCredits = () => {
    sectionNav.classList.add("is-credits-page");
    creditsButton.blur();
  };
  const closeCredits = () => {
    sectionNav.classList.remove("is-credits-page");
    creditsBackButton.blur();
  };
  const onDocumentKeydown = (event) => {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    toggle.focus();
  };
  const onHandlePointerDown = (event) => {
    if (!open || event.button !== 0) return;
    dragPointerId = event.pointerId;
    dragStartY = event.clientY;
    dragDistance = 0;
    dragStartedAt = performance.now();
    handle.setPointerCapture?.(event.pointerId);
    sectionNav.classList.add("is-dragging");
  };
  const onHandlePointerMove = (event) => {
    if (event.pointerId !== dragPointerId) return;
    dragDistance = Math.max(0, event.clientY - dragStartY);
    sectionNav.style.setProperty("--mobile-nav-drag-y", `${dragDistance}px`);
  };
  const finishHandleDrag = (event) => {
    if (event.pointerId !== dragPointerId) return;
    const elapsed = Math.max(1, performance.now() - dragStartedAt);
    const velocity = dragDistance / elapsed;
    const closeThreshold = Math.min(96, sectionNav.getBoundingClientRect().height * 0.25);
    const shouldClose = dragDistance >= closeThreshold || (dragDistance >= 28 && velocity >= 0.5);
    if (handle.hasPointerCapture?.(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    dragPointerId = null;
    sectionNav.classList.remove("is-dragging");
    sectionNav.style.removeProperty("--mobile-nav-drag-y");
    if (shouldClose) setOpen(false);
  };

  toggle.addEventListener("click", onToggleClick);
  sectionNav.addEventListener("click", onSectionClick);
  backdrop.addEventListener("click", onBackdropClick);
  scanButton.addEventListener("click", qrScanner.open);
  moreButton.addEventListener("click", () => {
    sectionNav.classList.add("is-more-page");
    moreButton.blur();
  });
  backButton.addEventListener("click", () => {
    sectionNav.classList.remove("is-more-page");
    backButton.blur();
  });
  creditsButton.addEventListener("click", openCredits);
  creditsBackButton.addEventListener("click", closeCredits);
  handle.addEventListener("pointerdown", onHandlePointerDown);
  handle.addEventListener("pointermove", onHandlePointerMove);
  handle.addEventListener("pointerup", finishHandleDrag);
  handle.addEventListener("pointercancel", finishHandleDrag);
  document.addEventListener("keydown", onDocumentKeydown);
  media.addEventListener("change", syncLayout);
  window.addEventListener("hashchange", syncLayout);
  syncLayout();

  return () => {
    setOpen(false);
    media.removeEventListener("change", syncLayout);
    window.removeEventListener("hashchange", syncLayout);
    toggle.removeEventListener("click", onToggleClick);
    sectionNav.removeEventListener("click", onSectionClick);
    backdrop.removeEventListener("click", onBackdropClick);
    scanButton.removeEventListener("click", qrScanner.open);
    creditsButton.removeEventListener("click", openCredits);
    creditsBackButton.removeEventListener("click", closeCredits);
    handle.removeEventListener("pointerdown", onHandlePointerDown);
    handle.removeEventListener("pointermove", onHandlePointerMove);
    handle.removeEventListener("pointerup", finishHandleDrag);
    handle.removeEventListener("pointercancel", finishHandleDrag);
    document.removeEventListener("keydown", onDocumentKeydown);
    document.documentElement.classList.remove(
      "has-mobile-primary-nav",
      "mobile-primary-nav-open",
      "mobile-primary-nav-information-view"
    );
    sectionNav.replaceChildren(...originalSectionLinks);
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    suggestionsLink?.classList.remove(
      "mobile-primary-nav-secondary-link",
      "mobile-primary-nav-mobile-only"
    );
    if (suggestionsLink && suggestionsOriginalParent) {
      suggestionsOriginalParent.insertBefore(suggestionsLink, suggestionsOriginalNextSibling);
    } else {
      suggestionsLink?.remove();
    }
    [scanButton, moreButton, backButton, newsLink, tagsLink, contactLink, privacyLink, creditsButton, creditsPanel]
      .forEach((item) => item.remove());
    qrScanner.destroy();
    backdrop.remove();
    toggle.remove();
  };
};
