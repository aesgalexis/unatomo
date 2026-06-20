const QR_PRINT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 3h10v5H7V3Zm-2 7h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2v2H6v-2H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3Zm3 7v2h8v-2H8Zm11-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path>
  </svg>
`;

const SUGGESTIONS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"></path>
  </svg>
`;

const TODO_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.2 8.2 2.1 2.1 5-5-1.4-1.4-3.6 3.6-0.7-0.7-1.4 1.4Zm0 4h7.6v-2H8.2v2Z"></path>
  </svg>
`;

const createIconLink = ({ href, label, icon, extraClass = "" }) => {
  const link = document.createElement("a");
  link.className = `dashboard-section-link${extraClass ? ` ${extraClass}` : ""}`;
  link.href = href;
  link.setAttribute("aria-label", label);
  link.setAttribute("data-tooltip", label);
  const iconEl = document.createElement("span");
  iconEl.className = extraClass.includes("superadmin")
    ? "dashboard-section-icon dashboard-section-icon-todo"
    : "dashboard-section-icon";
  iconEl.innerHTML = icon;
  link.appendChild(iconEl);
  return { link, iconEl };
};

export const createDashboardSectionNav = ({
  ariaLabel = "Secciones",
  dashboardHref = "#/dashboard",
  registryHref = "#/registro",
  qrPrintHref = "",
  suggestionsHref = "#/sugerencias",
  todoHref = "#/todo",
  labels = {},
  active = "dashboard",
  showSuggestions = false,
  showTodo = false,
  extraClass = "",
  attachTooltip = null
} = {}) => {
  const sectionNav = document.createElement("nav");
  sectionNav.className = `dashboard-section-nav${extraClass ? ` ${extraClass}` : ""}`;
  sectionNav.setAttribute("aria-label", ariaLabel);

  const dashboardLink = document.createElement("a");
  dashboardLink.className = "dashboard-section-link";
  dashboardLink.href = dashboardHref;
  dashboardLink.textContent = labels.dashboard || "Dashboard";

  const registryLink = document.createElement("a");
  registryLink.className = "dashboard-section-link";
  registryLink.href = registryHref;
  const registryBadge = document.createElement("span");
  registryBadge.className = "dashboard-section-badge";
  registryBadge.hidden = true;
  const registryLabel = document.createElement("span");
  registryLabel.textContent = labels.registry || "Registro";
  registryLink.appendChild(registryBadge);
  registryLink.appendChild(registryLabel);

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

  const todo = createIconLink({
    href: todoHref,
    label: labels.todo || "To do",
    icon: TODO_ICON,
    extraClass: "dashboard-section-link-superadmin"
  });
  todo.link.hidden = !showTodo;
  const todoBadge = document.createElement("span");
  todoBadge.className = "dashboard-section-badge";
  todoBadge.hidden = true;
  todo.link.insertBefore(todoBadge, todo.iconEl);

  const links = {
    dashboard: dashboardLink,
    registro: registryLink,
    qrPrint: qr.link,
    sugerencias: suggestions.link,
    todo: todo.link
  };
  Object.entries(links).forEach(([key, link]) => {
    const isActive = active === key;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  sectionNav.appendChild(dashboardLink);
  sectionNav.appendChild(registryLink);
  sectionNav.appendChild(qr.link);
  sectionNav.appendChild(suggestions.link);
  sectionNav.appendChild(todo.link);

  if (attachTooltip) {
    [qr.link, suggestions.link, todo.link].forEach((link) => {
      attachTooltip(link, { placement: "bottom" });
    });
  }

  return {
    sectionNav,
    dashboardLink,
    registryLink,
    registryBadge,
    qrPrintLink: qr.link,
    suggestionsLink: suggestions.link,
    suggestionsBadge,
    todoLink: todo.link,
    todoBadge
  };
};
