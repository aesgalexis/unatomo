import { renderHelpDashboardView } from "/static/js/dashboard/views/help/helpView.js";

const mount = document.querySelector("#help-manual-mount");
if (mount) {
  renderHelpDashboardView(mount, {
    standalone: true,
    isEnglish: document.documentElement.lang?.toLowerCase().startsWith("en")
  });
}
