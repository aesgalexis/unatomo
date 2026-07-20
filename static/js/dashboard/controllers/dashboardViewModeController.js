import { createDashboardViewMenu } from "../components/viewMenu/viewMenu.js";

export const createDashboardViewModeController = ({
  getAutoSave,
  isTreeAvailable,
  normalizeDashboardLayout,
  notifyTopbar,
  renderCards,
  reorderFlatMachines,
  saveOrderCache,
  sortFlatMachines,
  state,
  t,
  upsertDashboardLayout
}) => {
  const materializeCurrentFlatOrder = () => {
    const currentSort = state.dashboardLayout?.machineSortMode || "manual";
    if (state.dashboardLayout?.machineViewMode !== "flat" || currentSort === "manual") return;
    const orderedIds = sortFlatMachines(state.draftMachines, currentSort)
      .map((machine) => machine.id)
      .filter(Boolean);
    if (!orderedIds.length) return;
    const result = reorderFlatMachines(state.draftMachines, orderedIds);
    result.touchedMachineIds.forEach((id) => getAutoSave().scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(result.machines);
  };

  const viewMenu = createDashboardViewMenu({
    currentMode: state.dashboardLayout.machineViewMode || "grouped",
    currentPresentation: state.dashboardLayout.groupPresentationMode || "inline",
    currentSort: state.dashboardLayout.machineSortMode || "manual",
    isTreeAvailable,
    onChange: (viewMode) => {
      const previousMode = state.dashboardLayout.machineViewMode;
      const machineViewMode = viewMode === "flat" ? "flat" : "grouped";
      const groupPresentationMode = viewMode === "tree" ? "tree" : "inline";
      const groups = previousMode === "flat" && viewMode === "inline"
        ? (state.dashboardLayout.groups || []).map((group) => ({...group, collapsed: true}))
        : state.dashboardLayout.groups;
      state.dashboardLayout = normalizeDashboardLayout({
        ...state.dashboardLayout,
        groups,
        machineViewMode,
        groupPresentationMode,
        machineSortMode: state.dashboardLayout.machineSortMode
      });
      viewMenu.setMode(state.dashboardLayout.machineViewMode);
      viewMenu.setPresentationMode(state.dashboardLayout.groupPresentationMode);
      viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
      upsertDashboardLayout(state.uid, {
        groups: state.dashboardLayout.groups,
        placements: state.dashboardLayout.placements,
        machineViewMode: state.dashboardLayout.machineViewMode,
        groupPresentationMode: state.dashboardLayout.groupPresentationMode,
        machineSortMode: state.dashboardLayout.machineSortMode
      }).catch(() => notifyTopbar(t("dashboard.saveError", "Error al guardar")));
      renderCards({preserveScroll: true, preserveAnchor: false});
    },
    onSortChange: (mode) => {
      if (mode === "manual") materializeCurrentFlatOrder();
      state.dashboardLayout = normalizeDashboardLayout({
        ...state.dashboardLayout,
        machineSortMode: mode
      });
      viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
      upsertDashboardLayout(state.uid, {
        machineSortMode: state.dashboardLayout.machineSortMode
      }).catch(() => notifyTopbar(t("dashboard.saveError", "Error al guardar")));
      renderCards({preserveScroll: true, preserveAnchor: false});
    }
  });

  return { viewMenu };
};
