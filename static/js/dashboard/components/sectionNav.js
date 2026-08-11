const QR_PRINT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 3h10v5H7V3Zm-2 7h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2v2H6v-2H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3Zm3 7v2h8v-2H8Zm11-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path>
  </svg>
`;

const HISTORY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 10.59 3.71 3.7-1.42 1.42L11 13V7h2v5.59Z"></path>
  </svg>
`;

const SUGGESTIONS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"></path>
  </svg>
`;

const GALLERY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm3 12h10l-3.2-4.1-2.4 3-1.7-2.1L7 17Zm1.5-8.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"></path>
  </svg>
`;

const TODO_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.2 8.2 2.1 2.1 5-5-1.4-1.4-3.6 3.6-0.7-0.7-1.4 1.4Zm0 4h7.6v-2H8.2v2Z"></path>
  </svg>
`;

const STATISTICS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 19h16v2H2V3h2v16Zm3-2H5v-6h2v6Zm4 0H9V7h2v10Zm4 0h-2V9h2v8Zm4 0h-2V4h2v13Z"></path>
  </svg>
`;

const USERS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0v1H2v-1Zm13.2 1H22v-1a6 6 0 0 0-7.4-5.8A8.9 8.9 0 0 1 17 20v1h-1.8Z"></path>
  </svg>
`;

const DASHBOARD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z"></path>
  </svg>
`;

const createIconLink = ({
  href,
  label,
  icon,
  extraClass = "",
  iconClass = ""
}) => {
  const link = document.createElement("a");
  link.className = `dashboard-section-link${extraClass ? ` ${extraClass}` : ""}`;
  link.href = href;
  link.setAttribute("aria-label", label);
  link.dataset.sectionLabel = label;
  const iconEl = document.createElement("span");
  iconEl.className = `dashboard-section-icon${iconClass ? ` ${iconClass}` : ""}`;
  iconEl.innerHTML = icon;
  link.appendChild(iconEl);
  return { link, iconEl };
};

export const createDashboardSectionNav = ({
  ariaLabel = "Secciones",
  dashboardHref = "#/dashboard",
  registryHref = "#/registro",
  qrPrintHref = "",
  galleryHref = "#/galeria",
  usersHref = "#/usuarios",
  suggestionsHref = "#/sugerencias",
  todoHref = "#/tareas",
  statisticsHref = "#/estadisticas",
  labels = {},
  active = "dashboard",
  showSuggestions = false,
  showTodo = false,
  todoSuperadmin = false,
  extraClass = ""
} = {}) => {
  const sectionNav = document.createElement("nav");
  sectionNav.className = `dashboard-section-nav${extraClass ? ` ${extraClass}` : ""}`;
  sectionNav.setAttribute("aria-label", ariaLabel);

  const dashboard = createIconLink({
    href: dashboardHref,
    label: labels.dashboard || "Dashboard",
    icon: DASHBOARD_ICON
  });
  const dashboardLink = dashboard.link;

  const registry = createIconLink({
    href: registryHref,
    label: labels.registry || "Registro",
    icon: HISTORY_ICON
  });
  const registryLink = registry.link;
  const registryBadge = document.createElement("span");
  registryBadge.className = "dashboard-section-badge";
  registryBadge.hidden = true;
  registryLink.insertBefore(registryBadge, registry.iconEl);

  const qr = createIconLink({
    href: qrPrintHref,
    label: labels.qrPrint || "Impresion QR",
    icon: QR_PRINT_ICON
  });

  const suggestions = createIconLink({
    href: suggestionsHref,
    label: labels.suggestions || "Sugerencias",
    icon: SUGGESTIONS_ICON
  });
  suggestions.link.hidden = !showSuggestions;
  const suggestionsBadge = document.createElement("span");
  suggestionsBadge.className = "dashboard-section-badge";
  suggestionsBadge.hidden = true;
  suggestions.link.insertBefore(suggestionsBadge, suggestions.iconEl);

  const gallery = createIconLink({
    href: galleryHref,
    label: labels.gallery || "Galer\u00eda",
    icon: GALLERY_ICON,
    iconClass: "dashboard-section-icon-gallery"
  });

  const users = createIconLink({
    href: usersHref,
    label: labels.users || "Usuarios",
    icon: USERS_ICON,
    iconClass: "dashboard-section-icon-users"
  });

  const todo = createIconLink({
    href: todoHref,
    label: labels.todo || "Tareas",
    icon: TODO_ICON,
    extraClass: todoSuperadmin ? "dashboard-section-link-superadmin" : "",
    iconClass: "dashboard-section-icon-todo"
  });
  todo.link.hidden = !showTodo;
  const todoBadge = document.createElement("span");
  todoBadge.className = "dashboard-section-badge";
  todoBadge.hidden = true;
  todo.link.insertBefore(todoBadge, todo.iconEl);

  const statistics = createIconLink({
    href: statisticsHref,
    label: labels.statistics || "Estad\u00edsticas",
    icon: STATISTICS_ICON,
    iconClass: "dashboard-section-icon-statistics"
  });

  const links = {
    dashboard: dashboardLink,
    registro: registryLink,
    qrPrint: qr.link,
    galeria: gallery.link,
    usuarios: users.link,
    sugerencias: suggestions.link,
    todo: todo.link,
    estadisticas: statistics.link
  };
  const getCurrentHeading = () => document.querySelector(".dashboard-view-header-slot h3");
  const measureHeadingLabel = (heading, label) => {
    const probe = document.createElement("span");
    const styles = window.getComputedStyle(heading);
    probe.textContent = label;
    probe.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;font:${styles.font};letter-spacing:${styles.letterSpacing}`;
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return Math.ceil(width);
  };
  const showPreview = (link) => {
    const label = link?.dataset.sectionLabel;
    if (!label || link.classList.contains("is-active")) return;
    const heading = getCurrentHeading();
    if (!heading) return;
    let activeText = heading.querySelector(":scope > .dashboard-section-heading-active");
    if (!activeText) {
      activeText = document.createElement("span");
      activeText.className = "dashboard-section-heading-active";
      activeText.textContent = heading.textContent;
      heading.textContent = "";
      heading.appendChild(activeText);
    }
    heading.setAttribute("aria-label", activeText.textContent);
    heading.dataset.previewLabel = label;
    const activeWidth = measureHeadingLabel(heading, activeText.textContent);
    const previewWidth = measureHeadingLabel(heading, label);
    heading.style.width = `${Math.max(activeWidth, previewWidth)}px`;
    heading.classList.add("is-section-previewing");
  };
  const clearPreview = () => {
    document.querySelectorAll(".dashboard-view-header-slot h3.is-section-previewing")
      .forEach((heading) => {
        heading.classList.remove("is-section-previewing");
        const activeText = heading.querySelector(":scope > .dashboard-section-heading-active");
        if (activeText) {
          heading.style.width = `${measureHeadingLabel(heading, activeText.textContent)}px`;
        }
      });
  };

  Object.entries(links).forEach(([key, link]) => {
    const isActive = active === key;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  sectionNav.appendChild(dashboardLink);
  sectionNav.appendChild(registryLink);
  sectionNav.appendChild(todo.link);
  sectionNav.appendChild(statistics.link);
  sectionNav.appendChild(gallery.link);
  sectionNav.appendChild(users.link);
  sectionNav.appendChild(qr.link);

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    [dashboardLink, registryLink, todo.link, statistics.link, gallery.link, users.link, qr.link].forEach((link) => {
      link.addEventListener("mouseenter", () => showPreview(link));
      link.addEventListener("mouseleave", clearPreview);
      link.addEventListener("focus", () => showPreview(link));
      link.addEventListener("blur", clearPreview);
    });
  }

  return {
    sectionNav,
    dashboardLink,
    registryLink,
    registryBadge,
    qrPrintLink: qr.link,
    galleryLink: gallery.link,
    usersLink: users.link,
    suggestionsLink: suggestions.link,
    suggestionsBadge,
    todoLink: todo.link,
    todoBadge,
    statisticsLink: statistics.link
  };
};
