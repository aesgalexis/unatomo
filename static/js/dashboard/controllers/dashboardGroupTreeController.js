import {
  createDashboardGroupTreeRenderer,
  getDashboardGroupBranchIds
} from "../rendering/groupTreeRenderer.js";

export const createDashboardGroupTreeController = ({
  canMoveGroup,
  container,
  getGroupMenuActions,
  getPendingTaskCount,
  isTreeActive,
  moveGroupToGroup,
  moveGroupToRoot,
  moveMachineToGroup,
  normalizeStatus,
  renderCards,
  state,
  t
}) => {
  const renderer = createDashboardGroupTreeRenderer({
    container,
    getGroupMenuActions,
    getPendingTaskCount,
    normalizeStatus,
    onSelect: (groupId) => {
      if (state.selectedTreeGroupId === groupId) return;
      state.selectedTreeGroupId = groupId;
      state.expandedById = [];
      renderCards({preserveScroll: false});
    },
    onToggle: (groupId) => {
      const expandedIds = new Set(state.expandedTreeGroupIds || []);
      const isCollapsing = expandedIds.has(groupId);
      if (isCollapsing) expandedIds.delete(groupId);
      else expandedIds.add(groupId);
      const branchIds = getDashboardGroupBranchIds(
        state.dashboardLayout?.groups || [],
        groupId
      );
      if (isCollapsing && branchIds.has(state.selectedTreeGroupId)) {
        state.selectedTreeGroupId = groupId;
      }
      state.expandedTreeGroupIds = Array.from(expandedIds);
      renderCards({preserveScroll: true, preserveAnchor: false});
    },
    t
  });

  let dragSource = null;
  let dropTarget = null;
  const clearDropTarget = () => {
    dropTarget?.classList.remove("is-drop-target");
    dropTarget = null;
  };
  const getDropDetails = (row) => ({
    type: row?.dataset.treeDropType || "",
    groupId: row?.dataset.groupId || ""
  });
  const canDropOn = (row) => {
    if (!dragSource || !row) return false;
    const target = getDropDetails(row);
    if (dragSource.type === "machine") {
      return ["group", "all", "ungrouped"].includes(target.type);
    }
    if (dragSource.type !== "group") return false;
    if (target.type === "all") return true;
    return target.type === "group" && canMoveGroup(dragSource.id, target.groupId);
  };

  document.addEventListener("dragstart", (event) => {
    if (!isTreeActive()) return;
    const treeRow = event.target.closest?.(".dashboard-group-tree-row[data-group-id]");
    if (treeRow && container.contains(treeRow)) {
      if (event.target.closest(".dashboard-group-tree-toggle, .dashboard-group-tree-menu-toggle")) {
        event.preventDefault();
        return;
      }
      dragSource = {type: "group", id: treeRow.dataset.groupId || ""};
    } else {
      const card = event.target.closest?.(".machine-card");
      if (!card) return;
      dragSource = {type: "machine", id: card.dataset.machineId || ""};
    }
    if (!dragSource.id) {
      dragSource = null;
      return;
    }
    event.dataTransfer?.setData(
      "application/x-unatomo-dashboard-item",
      JSON.stringify(dragSource)
    );
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    document.body.classList.add("is-dashboard-tree-dragging");
  });
  document.addEventListener("dragend", () => {
    dragSource = null;
    clearDropTarget();
    document.body.classList.remove("is-dashboard-tree-dragging");
  });
  container.addEventListener("dragover", (event) => {
    const row = event.target.closest(".dashboard-group-tree-row[data-tree-drop-type]");
    if (!canDropOn(row)) {
      clearDropTarget();
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (dropTarget !== row) {
      clearDropTarget();
      dropTarget = row;
      dropTarget.classList.add("is-drop-target");
    }
  });
  container.addEventListener("dragleave", (event) => {
    if (!container.contains(event.relatedTarget)) clearDropTarget();
  });
  container.addEventListener("drop", (event) => {
    const row = event.target.closest(".dashboard-group-tree-row[data-tree-drop-type]");
    if (!canDropOn(row)) return;
    event.preventDefault();
    const source = dragSource;
    const target = getDropDetails(row);
    dragSource = null;
    clearDropTarget();
    document.body.classList.remove("is-dashboard-tree-dragging");
    if (source.type === "machine") {
      state.selectedTreeGroupId = target.type === "group"
        ? target.groupId
        : target.type === "ungrouped"
          ? "__ungrouped__"
          : "";
      moveMachineToGroup(source.id, target.type === "group" ? target.groupId : "");
      return;
    }
    state.selectedTreeGroupId = source.id;
    if (target.type === "group") {
      state.expandedTreeGroupIds = Array.from(new Set([
        ...(state.expandedTreeGroupIds || []),
        target.groupId
      ]));
      moveGroupToGroup(source.id, target.groupId);
    } else {
      moveGroupToRoot(source.id);
    }
  });

  return renderer;
};
