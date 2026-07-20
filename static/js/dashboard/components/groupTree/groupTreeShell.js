export const createDashboardGroupTreeShell = ({inviteBanner, filterInfo, list}) => {
  const workspace = document.createElement("div");
  workspace.className = "dashboard-workspace";
  const groupTree = document.createElement("aside");
  groupTree.className = "dashboard-group-tree";
  groupTree.hidden = true;
  const machineColumn = document.createElement("div");
  machineColumn.className = "dashboard-machine-column";
  machineColumn.appendChild(inviteBanner);
  machineColumn.appendChild(filterInfo);
  machineColumn.appendChild(list);
  workspace.appendChild(groupTree);
  workspace.appendChild(machineColumn);
  groupTree.addEventListener("wheel", (event) => {
    if (!event.deltaY) return;
    event.preventDefault();
    const multiplier = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? groupTree.clientHeight
        : 1;
    groupTree.scrollTop += event.deltaY * multiplier;
  }, {passive: false});
  return { workspace, groupTree };
};
