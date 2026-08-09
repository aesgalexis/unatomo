export const mountDashboardFixedMenusShell = ({
  addBar,
  dashboardWorkspace,
  loadingElement,
  mobileBackButton,
  mount,
  sectionNav
}) => {
  const dashboardFixedMenusSpace = document.createElement("div");
  dashboardFixedMenusSpace.className = "dashboard-fixed-menus-space";
  const dashboardFixedMenus = document.createElement("div");
  dashboardFixedMenus.className = "dashboard-fixed-menus";
  const dashboardViewHeaderSlot = document.createElement("div");
  dashboardViewHeaderSlot.className = "dashboard-view-header-slot";
  dashboardViewHeaderSlot.hidden = true;
  const dashboardScrollDivider = document.createElement("div");
  dashboardScrollDivider.className = "dashboard-scroll-divider";
  dashboardScrollDivider.setAttribute("aria-hidden", "true");

  addBar.appendChild(loadingElement);
  dashboardFixedMenus.append(sectionNav, addBar, dashboardViewHeaderSlot);
  dashboardFixedMenusSpace.appendChild(dashboardFixedMenus);
  mount.append(dashboardFixedMenusSpace, mobileBackButton, dashboardWorkspace);
  document.body.appendChild(dashboardScrollDivider);

  return {
    dashboardFixedMenus,
    dashboardFixedMenusSpace,
    dashboardScrollDivider,
    dashboardViewHeaderSlot
  };
};
