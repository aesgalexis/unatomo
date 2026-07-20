import { renderMachineCards } from "./machineCardRenderer.js";
import {
  TREE_UNGROUPED_ID,
  getDashboardGroupBranchIds
} from "./groupTreeRenderer.js";

export const createDashboardRenderer = (dependencies) => {
  const {
    addUserWithRegistry,
    assertStorageAvailable,
    assignTag,
    autoSave,
    buildAddTaskAttachmentsUpdate,
    buildMachineTagUrl,
    buildStatusToggleUpdate,
    cancelMachineTransferInvite,
    captureViewportAnchor,
    cardRefs,
    clearDashboardTooltips,
    clearMobileDetailState,
    collapseCard,
    computeLocations,
    createAdminInvite,
    createGroupSection,
    createMachineCard,
    createMachineTransferInvite,
    createTagToken,
    dashboardInternalViews,
    deleteMachine,
    deleteUserRegistry,
    disconnectMachineTag,
    expandCard,
    fetchLinksForAdmin,
    fetchMachine,
    fetchMachines,
    filterInfo,
    filterMachines,
    generateMachineTagQr,
    generateSaltBase64,
    getAdminDisplayName,
    getCollapsedHeightPx,
    getCurrentLang,
    getDashboardGroupDepth,
    getDashboardInternalView,
    getDraftById,
    getMachineTenantId,
    getPendingTaskCount,
    hasDashboardLoadError,
    hashPassword,
    installDocumentHooks,
    installTaskHooks,
    isLargeDashboardViewport,
    isMobileDashboardViewport,
    isOwnerMachine,
    leaveAdminRole,
    list,
    mount,
    locallyVisibleEmptyGroupIds,
    markLocalWrite,
    normalizeDashboardLayout,
    normalizeEmail,
    normalizeLocation,
    normalizeMachine,
    normalizeStatus,
    notifyTopbar,
    openStatusIncidentModal,
    pendingStatusIncidentMachineIds,
    recalcHeight,
    refreshStorageFullState,
    removeMachineFromState,
    renderDashboardNoResultsPlaceholder,
    renderLoadErrorPlaceholder,
    renderGroupTree,
    renderPlaceholder,
    replaceMachine,
    RESTORE_OPERATION_TASK_SOURCE,
    restoreViewport,
    revokeAdminInvite,
    scheduleHeightSync,
    sortFlatMachines,
    state,
    groupTree,
    syncDashboardViewChrome,
    syncMachineAccessListeners,
    syncMobileDetailUI,
    syncSearchVisualState,
    t,
    updateLoading,
    updateMachine,
    updateRegistryBadge,
    updateSaveState,
    updateSuggestionsBadge,
    updateTodoNav,
    upsertMachine,
    upsertMachineAccessFromMachine,
    validateTag,
    viewMenu,
  } = dependencies;
  const renderCards = ({ preserveScroll = false, preserveAnchor = true } = {}) => {
    state.activeView = getDashboardInternalView();
    syncDashboardViewChrome();
    const capturedAnchor = preserveScroll && preserveAnchor ? captureViewportAnchor() : null;
    const prevScrollY = preserveScroll
      ? (typeof state.nextScrollRestoreY === "number" ? state.nextScrollRestoreY : window.scrollY)
      : null;
    const renderAnchor = preserveAnchor ? state.nextScrollAnchor || capturedAnchor : null;
    state.nextScrollRestoreY = null;
    const activeEl = document.activeElement;
    if (activeEl && list.contains(activeEl) && typeof activeEl.blur === "function") {
      try {
        activeEl.blur({ preventScroll: true });
      } catch {
        activeEl.blur();
      }
    }
    clearDashboardTooltips();
    list.innerHTML = "";
    mount.classList.remove("has-group-tree");
    groupTree.hidden = true;
    const machines = Array.isArray(state.draftMachines) ? state.draftMachines : [];
    updateRegistryBadge();
    updateSuggestionsBadge();
    updateTodoNav();
    if (dashboardInternalViews.render(state.activeView, machines)) return;
    list.className = "";
    const query = (state.searchQuery || "").trim();
    let visibleMachines = filterMachines(machines, query);
    state.knownUsers = Array.from(
      new Set(
        machines
          .flatMap((m) => (Array.isArray(m.users) ? m.users : []))
          .map((u) => (u.username || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
    if (query) {
      filterInfo.textContent = t(
        "dashboard.showingResults",
        (visible, total) => `Showing ${visible}/${total} machines`
      )(visibleMachines.length, machines.length);
      filterInfo.style.display = "block";
    } else {
      filterInfo.textContent = "";
      filterInfo.style.display = "none";
    }
    if (!machines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      if (state.loading) {
        list.innerHTML = "";
        return;
      }
      if (hasDashboardLoadError(state)) {
        renderLoadErrorPlaceholder();
        if (preserveScroll) {
          restoreViewport(prevScrollY || 0, renderAnchor);
        }
        return;
      }
      renderPlaceholder();
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }
    if (!visibleMachines.length) {
      clearMobileDetailState();
      syncMobileDetailUI();
      renderDashboardNoResultsPlaceholder(
        list,
        t("dashboard.noResults", (value) => `No results for "${value}".`)(query)
      );
      if (preserveScroll) {
        restoreViewport(prevScrollY || 0, renderAnchor);
      }
      return;
    }

    const expandedById = new Set(state.expandedById || []);
    if (expandedById.size > 1) {
      const [first] = expandedById;
      expandedById.clear();
      expandedById.add(first);
      state.expandedById = [first];
    }

    const selectedTabById = state.selectedTabById || {};

    cardRefs.clear();
    state.locations = computeLocations(state.draftMachines);
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    viewMenu.setMode(state.dashboardLayout.machineViewMode);
    viewMenu.setPresentationMode(state.dashboardLayout.groupPresentationMode);
    viewMenu.setSortMode(state.dashboardLayout.machineSortMode);
    if (state.dashboardLayout.machineViewMode === "flat") {
      visibleMachines = sortFlatMachines(
        visibleMachines,
        state.dashboardLayout.machineSortMode
      );
    }
    const layoutGroups = state.dashboardLayout.groups || [];
    const layoutPlacements = state.dashboardLayout.placements || {};
    const useTreeLayout =
      state.dashboardLayout.machineViewMode !== "flat" &&
      state.dashboardLayout.groupPresentationMode === "tree" &&
      isLargeDashboardViewport();
    const useGroupedLayout =
      state.dashboardLayout.machineViewMode !== "flat" &&
      !useTreeLayout &&
      layoutGroups.length > 0 &&
      !query;
    const validGroupIds = new Set(layoutGroups.map((group) => group.id));
    const hasUngroupedMachines = useGroupedLayout && visibleMachines.some((machine) => {
      const groupId = layoutPlacements[machine.id]?.groupId || "";
      return !validGroupIds.has(groupId);
    });
    list.dataset.hasUngrouped = hasUngroupedMachines ? "true" : "false";
    const groupById = new Map(layoutGroups.map((group) => [group.id, group]));
    if (
      state.selectedTreeGroupId !== TREE_UNGROUPED_ID &&
      state.selectedTreeGroupId &&
      !groupById.has(state.selectedTreeGroupId)
    ) {
      state.selectedTreeGroupId = "";
    }
    if (useTreeLayout) {
      mount.classList.add("has-group-tree");
      groupTree.hidden = false;
      renderGroupTree({
        groups: layoutGroups,
        placements: layoutPlacements,
        machines: visibleMachines,
        selectedGroupId: state.selectedTreeGroupId,
        expandedGroupIds: state.expandedTreeGroupIds
      });
      if (!query && state.selectedTreeGroupId === TREE_UNGROUPED_ID) {
        visibleMachines = visibleMachines.filter((machine) => {
          const groupId = layoutPlacements[machine.id]?.groupId || "";
          return !validGroupIds.has(groupId);
        });
      } else if (!query && state.selectedTreeGroupId) {
        const branchIds = getDashboardGroupBranchIds(
          layoutGroups,
          state.selectedTreeGroupId
        );
        visibleMachines = visibleMachines.filter((machine) =>
          branchIds.has(layoutPlacements[machine.id]?.groupId || "")
        );
      }
      if (!visibleMachines.length) {
        renderDashboardNoResultsPlaceholder(
          list,
          t("dashboard.groupTreeEmpty", "No hay m\u00e1quinas en este grupo.")
        );
        syncSearchVisualState();
        return;
      }
    }
    const groupPathCache = new Map();
    const getGroupPath = (groupId) => {
      if (!groupId || !groupById.has(groupId)) return [];
      if (groupPathCache.has(groupId)) return groupPathCache.get(groupId);
      const path = [];
      const seen = new Set();
      let currentId = groupId;
      while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const group = groupById.get(currentId);
        if (!group) break;
        path.unshift(group);
        currentId = group.parentGroupId || "";
      }
      groupPathCache.set(groupId, path);
      return path;
    };
    const compareOrderPaths = (left = [], right = []) => {
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        const leftValue = left[index] ?? -1;
        const rightValue = right[index] ?? -1;
        if (leftValue !== rightValue) return leftValue - rightValue;
      }
      return 0;
    };
    const getMachineOrderPath = (machine, groupId) => [
      ...getGroupPath(groupId).map((group) => group.order ?? 0),
      layoutPlacements[machine.id]?.order ?? machine.order ?? 0
    ];
    const sortedVisibleMachines = (useGroupedLayout || useTreeLayout)
      ? visibleMachines.slice().sort((a, b) => {
        const aPlacement = layoutPlacements[a.id] || {};
        const bPlacement = layoutPlacements[b.id] || {};
        const aGroupId = validGroupIds.has(aPlacement.groupId) ? aPlacement.groupId : "";
        const bGroupId = validGroupIds.has(bPlacement.groupId) ? bPlacement.groupId : "";
        if (!!aGroupId !== !!bGroupId) return aGroupId ? -1 : 1;
        if (aGroupId && aGroupId === bGroupId) {
          const priorityOrder = state.initialGroupPriorityOrder?.[aGroupId] || {};
          const aPriorityOrder = priorityOrder[a.id];
          const bPriorityOrder = priorityOrder[b.id];
          const aOrder = Number.isFinite(aPriorityOrder)
            ? aPriorityOrder
            : aPlacement.order ?? a.order ?? 0;
          const bOrder = Number.isFinite(bPriorityOrder)
            ? bPriorityOrder
            : bPlacement.order ?? b.order ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        }
        if (aGroupId && bGroupId) {
          const pathOrder = compareOrderPaths(
            getMachineOrderPath(a, aGroupId),
            getMachineOrderPath(b, bGroupId)
          );
          if (pathOrder) return pathOrder;
        }
        return (a.order ?? 0) - (b.order ?? 0);
      })
      : visibleMachines;
    const groupTargets = new Map();
    const renderedGroups = new Set();
    const groupPendingCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    const groupDownCounts = new Map(layoutGroups.map((group) => [group.id, 0]));
    if (useGroupedLayout) {
      sortedVisibleMachines.forEach((machine) => {
        const groupId = layoutPlacements[machine.id]?.groupId || "";
        if (!validGroupIds.has(groupId)) return;
        const machinePendingCount = getPendingTaskCount(machine);
        const machineDownCount = normalizeStatus(machine.status) === "fuera_de_servicio" ? 1 : 0;
        groupPendingCounts.set(groupId, (groupPendingCounts.get(groupId) || 0) + machinePendingCount);
        groupDownCounts.set(groupId, (groupDownCounts.get(groupId) || 0) + machineDownCount);
        const seenAncestors = new Set();
        let parentGroupId = groupById.get(groupId)?.parentGroupId || "";
        while (parentGroupId && !seenAncestors.has(parentGroupId)) {
          seenAncestors.add(parentGroupId);
          groupPendingCounts.set(
            parentGroupId,
            (groupPendingCounts.get(parentGroupId) || 0) + machinePendingCount
          );
          groupDownCounts.set(
            parentGroupId,
            (groupDownCounts.get(parentGroupId) || 0) + machineDownCount
          );
          parentGroupId = groupById.get(parentGroupId)?.parentGroupId || "";
        }
      });
      groupTargets.set("", list);
    } else {
      groupTargets.set("", list);
    }
    const renderGroup = (groupId) => {
      if (!useGroupedLayout || !groupId || groupTargets.has(groupId) || renderedGroups.has(groupId)) return;
      const group = groupById.get(groupId);
      if (!group) return;
      const parentGroupId = group.parentGroupId || "";
      if (parentGroupId) renderGroup(parentGroupId);
      const parentTarget = parentGroupId ? groupTargets.get(parentGroupId) : list;
      if (!parentTarget) return;
      const showGroupCounts = !!group.collapsed;
      const depth = getDashboardGroupDepth(layoutGroups, group.id);
      const { section, body } = createGroupSection(
        group,
        depth,
        showGroupCounts ? groupPendingCounts.get(groupId) || 0 : 0,
        showGroupCounts ? groupDownCounts.get(groupId) || 0 : 0
      );
      parentTarget.appendChild(section);
      groupTargets.set(groupId, body);
      renderedGroups.add(groupId);
    };
    if (useGroupedLayout) {
      layoutGroups
        .slice()
        .sort((left, right) => {
          const depthDifference =
            getDashboardGroupDepth(layoutGroups, left.id) -
            getDashboardGroupDepth(layoutGroups, right.id);
          return depthDifference || (left.order ?? 0) - (right.order ?? 0);
        })
        .forEach((group) => renderGroup(group.id));
    }
    renderMachineCards({
      addUserWithRegistry,
      assertStorageAvailable,
      assignTag,
      autoSave,
      buildAddTaskAttachmentsUpdate,
      buildMachineTagUrl,
      buildStatusToggleUpdate,
      cancelMachineTransferInvite,
      cardRefs,
      clearMobileDetailState,
      collapseCard,
      createAdminInvite,
      createMachineCard,
      createMachineTransferInvite,
      createTagToken,
      deleteMachine,
      deleteUserRegistry,
      disconnectMachineTag,
      disableDrag: false,
      expandCard,
      expandedById,
      fetchMachine,
      fetchMachines,
      generateMachineTagQr,
      generateSaltBase64,
      getAdminDisplayName,
      getCollapsedHeightPx,
      getCurrentLang,
      getDraftById,
      getMachineTenantId,
      groupTargets,
      hashPassword,
      installDocumentHooks,
      installTaskHooks,
      isMobileDashboardViewport,
      isOwnerMachine,
      layoutPlacements,
      leaveAdminRole,
      list,
      markLocalWrite,
      normalizeEmail,
      normalizeLocation,
      normalizeMachine,
      normalizeStatus,
      notifyTopbar,
      openStatusIncidentModal,
      pendingStatusIncidentMachineIds,
      query,
      recalcHeight,
      refreshStorageFullState,
      removeMachineFromState,
      renderCards,
      renderGroup,
      replaceMachine,
      RESTORE_OPERATION_TASK_SOURCE,
      revokeAdminInvite,
      scheduleHeightSync,
      selectedTabById,
      sortedVisibleMachines,
      state,
      syncMobileDetailUI,
      t,
      updateMachine,
      updateSaveState,
      upsertMachine,
      upsertMachineAccessFromMachine,
      useGroupedLayout,
      validateTag,
      validGroupIds,
    });
    if (useGroupedLayout && locallyVisibleEmptyGroupIds.size) {
      Array.from(locallyVisibleEmptyGroupIds).forEach((groupId) => {
        if (!groupById.has(groupId)) {
          locallyVisibleEmptyGroupIds.delete(groupId);
          return;
        }
        renderGroup(groupId);
      });
    }
    if (isMobileDashboardViewport()) {
      const expandedId = Array.from(expandedById)[0] || "";
      if (expandedId) {
        if (!state.mobileFocusedMachineId) state.mobileFocusedMachineId = expandedId;
      } else {
        clearMobileDetailState();
      }
    } else {
      clearMobileDetailState();
    }
    syncMobileDetailUI();
    if (preserveScroll) {
      state.nextScrollAnchor = null;
      restoreViewport(prevScrollY || 0, renderAnchor);
    }
    syncSearchVisualState();
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) {
      updateLoading();
    }
  };

  const fetchAdminMachines = async (uid) => {
    const links = await fetchLinksForAdmin(uid, "accepted");
    const machines = await Promise.all(
      links.map(async (link) => {
        if (!link.ownerUid || !link.machineId) return null;
        if (link.status !== "accepted") return null;
        const data = await fetchMachine(link.ownerUid, link.machineId);
        if (!data) return null;
        const normalized = normalizeMachine(data, state.draftMachines.length);
        normalized.tenantId = link.ownerUid;
        normalized.role = "admin";
        normalized.ownerEmail = link.ownerEmail || "";
        return normalized;
      })
    );
    return machines.filter(Boolean);
  };

  return { fetchAdminMachines, renderCards };
};
