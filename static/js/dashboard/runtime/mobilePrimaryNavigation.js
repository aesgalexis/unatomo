const MOBILE_NAV_QUERY = "(max-width: 768px)";

export const initMobilePrimaryNavigation = ({ sectionNav } = {}) => {
  if (!sectionNav) return () => {};

  const media = window.matchMedia(MOBILE_NAV_QUERY);
  const placeholder = document.createComment("dashboard-primary-navigation");
  sectionNav.parentNode?.insertBefore(placeholder, sectionNav);
  sectionNav.id = "dashboard-mobile-primary-nav";

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

  let open = false;

  const setOpen = (nextOpen) => {
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
  };

  const syncLayout = () => {
    toggle.hidden = !media.matches;
    if (media.matches) {
      document.body.appendChild(sectionNav);
      document.documentElement.classList.add("has-mobile-primary-nav");
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
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    toggle.focus();
  };

  toggle.addEventListener("click", onToggleClick);
  sectionNav.addEventListener("click", onSectionClick);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);
  media.addEventListener("change", syncLayout);
  syncLayout();

  return () => {
    media.removeEventListener("change", syncLayout);
    toggle.removeEventListener("click", onToggleClick);
    sectionNav.removeEventListener("click", onSectionClick);
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);
    document.documentElement.classList.remove(
      "has-mobile-primary-nav",
      "mobile-primary-nav-open"
    );
    placeholder.parentNode?.insertBefore(sectionNav, placeholder.nextSibling);
    toggle.remove();
  };
};
