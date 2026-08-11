import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";
import { isControlPanelUser } from "/nfc/controlpanel/access.js";
import { createDashboardSectionNav } from "/static/js/dashboard/components/sectionNav.js";
import { normalizeDashboardLayout } from "/static/js/dashboard/layout/dashboardLayoutModel.mjs";
import { t as dashboardT } from "/static/js/dashboard/i18n.js";
import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";
import { countUnseenGlobalRegistryEntries } from "/static/js/dashboard/views/registry/globalRegistryModel.js";
import { fetchDashboardSuggestions } from "/static/js/dashboard/views/suggestions/suggestionsRepo.js";
import { countUnseenSuggestions } from "/static/js/dashboard/views/suggestions/suggestionsView.js";

const canShowSuggestionsNav = async (user, registration) => {
  if (registration?.profile?.suggestionsCollaborator === true) return true;
  try {
    return await isControlPanelUser(user);
  } catch {
    return false;
  }
};

export const loadQrSectionNavigation = async ({ uid, user, registration, machines }) => {
  const showSuggestions = await canShowSuggestionsNav(user, registration);
  let rawLayout = {};
  try {
    const snap = await getDoc(doc(db, "dashboard_layout", uid));
    rawLayout = snap.exists() ? snap.data() || {} : {};
  } catch {}
  const dashboardLayout = normalizeDashboardLayout(rawLayout, {
    groupUntitled: dashboardT("dashboard.groupUntitled", "Grupo"),
    validMachineIds: new Set(machines.map((machine) => machine.id))
  });
  const registry = countUnseenGlobalRegistryEntries(
    machines,
    rawLayout.registrySeenAt || ""
  );
  let suggestions = 0;
  if (showSuggestions) {
    try {
      const result = await fetchDashboardSuggestions(500);
      suggestions = result.isSuperadmin
        ? countUnseenSuggestions(result.items || [], result.suggestionsSeenAt || "")
        : 0;
    } catch {}
  }
  const todo = machines.reduce(
    (total, machine) => total + (Array.isArray(machine?.tasks) ? machine.tasks : [])
      .filter((task) => !task?.lastCompletedAt || getTaskTiming(task).pending).length,
    0
  );
  return { dashboardLayout, registry, showSuggestions, suggestions, todo };
};

const setBadge = (badge, link, count) => {
  badge.hidden = count <= 0;
  badge.textContent = count > 99 ? "99+" : String(count);
  link.classList.toggle("has-unseen", count > 0);
};

export const createQrSectionNav = ({ isEn, navigation, text }) => {
  const refs = createDashboardSectionNav({
    ariaLabel: text.sectionNavAria,
    dashboardHref: `${text.dashboard}#/dashboard`,
    registryHref: `${text.dashboard}#/registro`,
    usersHref: `${text.dashboard}#/${isEn ? "users" : "usuarios"}`,
    qrPrintHref: text.qrPrint,
    galleryHref: `${text.dashboard}#/galeria`,
    suggestionsHref: `${text.dashboard}#/sugerencias`,
    todoHref: `${text.dashboard}#/${isEn ? "tasks" : "tareas"}`,
    statisticsHref: `${text.dashboard}#/${isEn ? "statistics" : "estadisticas"}`,
    labels: {
      dashboard: text.navDashboard,
      users: isEn ? "Users" : "Usuarios",
      registry: text.navRegistry,
      qrPrint: text.navQrPrint,
      gallery: text.navGallery,
      suggestions: text.navSuggestions,
      todo: text.navTodo,
      statistics: isEn ? "Statistics" : "Estadísticas"
    },
    active: "qrPrint",
    showSuggestions: navigation.showSuggestions,
    showTodo: true,
    todoSuperadmin: false,
    extraClass: "qr-print-section-nav"
  });
  setBadge(refs.registryBadge, refs.registryLink, navigation.registry);
  setBadge(refs.suggestionsBadge, refs.suggestionsLink, navigation.suggestions);
  setBadge(refs.todoBadge, refs.todoLink, navigation.todo);
  return refs.sectionNav;
};
