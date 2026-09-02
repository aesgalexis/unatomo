import { normalizeDashboardTitle } from "../layout/dashboardLayoutModel.mjs";

export const createDashboardTitleController = ({ state, t }) => {
  const getDefaultTitle = () => t("dashboard.navDashboard", "Dashboard");
  const getTitle = () =>
    normalizeDashboardTitle(state.dashboardLayout?.dashboardTitle) ||
    getDefaultTitle();

  const apply = () => {
    const titleEl = document.getElementById("topbar-title");
    if (titleEl) titleEl.textContent = getTitle();
  };

  return { apply, getTitle };
};
