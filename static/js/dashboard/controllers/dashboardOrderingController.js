import { createDraftMachine } from "../machineStore.js";
import {
  canDashboardGroupHaveChildren
} from "../layout/dashboardLayoutModel.mjs";
import {
  createDashboardGroupId,
  createGroupFromMachineDrop,
  moveGroupToGroup,
  moveGroupToRoot,
  moveMachineAfterTarget,
  moveMachineToGroup as moveMachineToDashboardGroup,
  reorderFlatMachines,
  reorderMixedItems,
  reorderUngroupedMachines,
  updatePlacementOrder
} from "../layout/dashboardLayoutActions.js";

export const createDashboardOrderingController = ({
  state,
  addBtn,
  autoSave,
  clearInitialGroupPriorityOrder,
  computePrevOrder,
  getNextGroupTitle,
  isTreeSelectionActive,
  normalizeDashboardLayout,
  openGalleryUpload,
  openMobileTaskCreate,
  openMobileUserCreate,
  renderCards,
  saveDashboardLayout,
  saveOrderCache,
  t
}) => {
  const handleReorder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    if (
      state.dashboardLayout?.machineViewMode === "flat" &&
      state.dashboardLayout?.machineSortMode !== "manual"
    ) {
      renderCards({ preserveScroll: true });
      return;
    }
    clearInitialGroupPriorityOrder();
    const result = reorderFlatMachines(state.draftMachines, orderIds);
    result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(result.machines);
    renderCards();
  };

  const updateUngroupedOrder = (orderIds) => {
    if (!Array.isArray(orderIds) || !orderIds.length) return;
    clearInitialGroupPriorityOrder("");
    const result = reorderUngroupedMachines(state.draftMachines, orderIds);
    result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
    state.draftMachines = result.machines;
    saveOrderCache(state.draftMachines);
  };

  const updateGroupedPlacementOrder = (groupId, orderIds) => {
    clearInitialGroupPriorityOrder(groupId || "");
    state.dashboardLayout = updatePlacementOrder(state.dashboardLayout, groupId, orderIds);
  };

  const handleMixedItemReorder = (parentGroupId, items = []) => {
    if (!Array.isArray(items) || !items.length) return;
    if (state.dashboardLayout?.machineViewMode === "flat") {
      handleReorder(items.filter((item) => item.type === "machine").map((item) => item.id));
      return;
    }
    clearInitialGroupPriorityOrder(parentGroupId || "");
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = reorderMixedItems(
      state.dashboardLayout,
      state.draftMachines,
      parentGroupId,
      items
    );
    state.dashboardLayout = result.layout;
    state.draftMachines = result.machines;
    if (result.touchedMachineIds.length) {
      result.touchedMachineIds.forEach((id) => autoSave.scheduleSave(id, "order"));
      saveOrderCache(state.draftMachines);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const handleGroupedReorder = (groupId, orderIds) => {
    if (state.dashboardLayout?.machineViewMode === "flat") {
      handleReorder(orderIds);
      return;
    }
    if (!state.dashboardLayout?.groups?.length) {
      handleReorder(orderIds);
      return;
    }
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    if (groupId) updateGroupedPlacementOrder(groupId, orderIds);
    else {
      updateGroupedPlacementOrder("", orderIds);
      updateUngroupedOrder(orderIds);
    }
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const createGroupFromDrop = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(t("dashboard.addGroupPrompt", "Nombre del grupo"), suggestedTitle);
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const targetGroupId = state.dashboardLayout.placements?.[targetId]?.groupId || "";
    const targetGroup = (state.dashboardLayout.groups || []).find((group) => group.id === targetGroupId);
    const parentGroupId = targetGroup && canDashboardGroupHaveChildren(
      state.dashboardLayout.groups || [],
      targetGroup.id
    ) ? targetGroup.id : "";
    const result = createGroupFromMachineDrop(state.dashboardLayout, state.draftMachines, {
      draggedId,
      targetId,
      groupId: createDashboardGroupId(),
      title: cleanTitle,
      parentGroupId
    });
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToTargetGroup = (draggedId, targetId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") {
      const orderedIds = state.draftMachines
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((machine) => machine.id)
        .filter((id) => id && id !== draggedId);
      const targetIndex = orderedIds.indexOf(targetId);
      orderedIds.splice(targetIndex >= 0 ? targetIndex + 1 : orderedIds.length, 0, draggedId);
      handleReorder(orderedIds);
      return;
    }
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const targetGroupId = state.dashboardLayout.placements?.[targetId]?.groupId || "";
    const targetGroup = (state.dashboardLayout.groups || []).find((group) => group.id === targetGroupId);
    if (
      !targetGroupId ||
      (targetGroup && canDashboardGroupHaveChildren(
        state.dashboardLayout.groups || [],
        targetGroup.id
      ))
    ) {
      createGroupFromDrop(draggedId, targetId);
      return;
    }
    const result = moveMachineAfterTarget(
      state.dashboardLayout,
      state.draftMachines,
      draggedId,
      targetId
    );
    if (result.shouldCreateGroup) {
      createGroupFromDrop(draggedId, targetId);
      return;
    }
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveMachineToGroup = (draggedId, targetGroupId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    if (!draggedId) return;
    clearInitialGroupPriorityOrder(targetGroupId);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = moveMachineToDashboardGroup(
      state.dashboardLayout,
      state.draftMachines,
      draggedId,
      targetGroupId
    );
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveGroupToTargetGroup = (draggedGroupId, targetGroupId) => {
    if (state.dashboardLayout?.machineViewMode === "flat") return;
    if (!draggedGroupId || !targetGroupId || draggedGroupId === targetGroupId) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    const result = moveGroupToGroup(state.dashboardLayout, draggedGroupId, targetGroupId);
    state.dashboardLayout = result.layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const moveGroupToRootLevel = (draggedGroupId) => {
    if (state.dashboardLayout?.machineViewMode === "flat" || !draggedGroupId) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = moveGroupToRoot(
      state.dashboardLayout,
      draggedGroupId
    ).layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  };

  const getUniqueTitle = () => {
    const existing = new Set(
      state.draftMachines.map((m) => (m.title || "").trim().toLowerCase())
    );
    let idx = 0;
    let title = t(
      "dashboard.machineDefaultName",
      (value) => value ? `New machine ${value}` : "New machine"
    )(idx);
    while (existing.has(title.toLowerCase())) {
      idx += 1;
      title = t(
        "dashboard.machineDefaultName",
        (value) => value ? `New machine ${value}` : "New machine"
      )(idx);
    }
    return title;
  };

  addBtn.addEventListener("click", () => {
    if (state.activeView === "galeria") {
      openGalleryUpload?.();
      return;
    }
    if (state.activeView === "sugerencias") {
      if (window.scrollY > 0) {
        state.suggestionsCreateOpen = false;
        const form = document.querySelector("#machineList .suggestions-form");
        if (form) form.hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      state.suggestionsCreateOpen = true;
      const form = document.querySelector("#machineList .suggestions-form");
      if (form) {
        form.hidden = false;
        form.querySelector(".suggestions-input")?.focus({preventScroll: true});
      } else {
        renderCards({preserveScroll: true});
      }
      return;
    }
    if (state.activeView === "todo") {
      if (window.matchMedia("(max-width: 768px)").matches) {
        openMobileTaskCreate?.();
        return;
      }
      if (!state.todoCreateOpen) {
        state.todoCreateOpen = true;
        renderCards({ preserveScroll: true });
      }
      if (window.scrollY > 0) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      return;
    }
    if (state.activeView === "usuarios") {
      state.usersPolicyOpen = false;
      if (state.usersContextOwnerUid === "__all__") {
        state.usersContextOwnerUid = state.uid || "";
      }
      if (window.matchMedia("(max-width: 768px)").matches) {
        openMobileUserCreate?.();
        return;
      }
      if (!state.usersCreateOpen) {
        state.usersCreateOpen = true;
        renderCards({ preserveScroll: true });
      }
      if (window.scrollY > 0) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      return;
    }
    state.searchQuery = "";
    state.selectedTreeMachineId = "";
    document.querySelector("#dashboard-mount .add-search")?.setQuery?.("");
    const shouldScrollToTop = window.scrollY > 0;
    const order = computePrevOrder();
    const machine = createDraftMachine(state.draftMachines.length + 1, order);
    const ownerMachines = state.draftMachines.filter(
      (item) => (item.tenantId || item.ownerUid || state.uid) === state.uid &&
        (item.role || "owner") !== "admin"
    );
    if (ownerMachines.length) {
      const inheritedAccessPolicy = ownerMachines.find(
        (item) => item.accessRolePermissions
      )?.accessRolePermissions;
      if (inheritedAccessPolicy) {
        machine.accessRolePermissions = structuredClone(inheritedAccessPolicy);
      }
      const globalUsers = new Map();
      ownerMachines.forEach((item) => {
        (item.users || []).forEach((user) => {
          const key = (user.username || "").trim().replace(/\s+/g, " ").toLowerCase();
          if (!key) return;
          const current = globalUsers.get(key) || { user, machineIds: new Set() };
          current.machineIds.add(item.id);
          globalUsers.set(key, current);
        });
      });
      machine.users = Array.from(globalUsers.values())
        .filter(({ user, machineIds }) =>
          user.accessScope === "all" && machineIds.size === ownerMachines.length
        )
        .map(({ user }) => ({ ...user }));
    }
    machine.title = getUniqueTitle();
    machine.tenantId = state.uid;
    machine.role = "owner";
    machine.ownerEmail = state.adminEmail || "";
    state.draftMachines = [machine, ...state.draftMachines];
    state.recentlyCreatedMachineIds = [
      ...(state.recentlyCreatedMachineIds || []),
      machine.id
    ];
    const selectedGroupId = state.selectedTreeGroupId || "";
    const selectedGroupExists = isTreeSelectionActive() &&
      (state.dashboardLayout?.groups || []).some((group) => group.id === selectedGroupId);
    if (selectedGroupExists) {
      const siblingOrders = Object.values(state.dashboardLayout?.placements || {})
        .filter((placement) => placement?.groupId === selectedGroupId)
        .map((placement) => placement.order)
        .filter(Number.isFinite);
      const placementOrder = siblingOrders.length
        ? Math.min(...siblingOrders) - 1
        : 0;
      state.dashboardLayout = normalizeDashboardLayout({
        ...state.dashboardLayout,
        placements: {
          ...(state.dashboardLayout?.placements || {}),
          [machine.id]: {groupId: selectedGroupId, order: placementOrder}
        }
      });
      saveDashboardLayout();
    }
    saveOrderCache(state.draftMachines);
    renderCards();
    window.requestAnimationFrame(() => {
      const card = document.querySelector(
        `.machine-card[data-machine-id="${CSS.escape(machine.id)}"]`
      );
      if (!card) return;
      card.querySelector(".mc-title")?.click();
      if (shouldScrollToTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    autoSave.saveNow(machine.id, "create");
  });

  return {
    handleGroupedReorder,
    handleMixedItemReorder,
    moveGroupToRootLevel,
    moveGroupToTargetGroup,
    moveMachineToGroup,
    moveMachineToTargetGroup
  };
};
