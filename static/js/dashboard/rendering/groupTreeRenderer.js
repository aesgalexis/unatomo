const TREE_ALL_ID = "";
export const TREE_UNGROUPED_ID = "__ungrouped__";

const addToAncestors = (map, groupById, groupId, amount) => {
  const seen = new Set();
  let currentId = groupId;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    map.set(currentId, (map.get(currentId) || 0) + amount);
    currentId = groupById.get(currentId)?.parentGroupId || "";
  }
};

export const getDashboardGroupBranchIds = (groups = [], groupId = "") => {
  if (!groupId || groupId === TREE_UNGROUPED_ID) return new Set();
  const branchIds = new Set([groupId]);
  let changed = true;
  while (changed) {
    changed = false;
    groups.forEach((group) => {
      if (!branchIds.has(group.id) && branchIds.has(group.parentGroupId || "")) {
        branchIds.add(group.id);
        changed = true;
      }
    });
  }
  return branchIds;
};

export const createDashboardGroupTreeRenderer = ({
  container,
  getGroupMenuActions,
  getPendingTaskCount,
  normalizeStatus,
  onSelect,
  onToggle,
  t
}) => {
  let activeMenuPanel = null;
  let activeMenuToggle = null;
  const closeMenu = () => {
    activeMenuPanel?.remove();
    activeMenuPanel = null;
    if (activeMenuToggle) activeMenuToggle.setAttribute("aria-expanded", "false");
    activeMenuToggle = null;
  };
  const openMenu = (toggle, group, depth) => {
    if (activeMenuToggle === toggle) {
      closeMenu();
      return;
    }
    closeMenu();
    const panel = document.createElement("div");
    panel.className = "dashboard-group-tree-menu-panel";
    panel.setAttribute("role", "menu");
    getGroupMenuActions(group, depth).forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dashboard-group-tree-menu-action";
      button.setAttribute("role", "menuitem");
      button.textContent = action.label;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        action.onClick();
      });
      panel.appendChild(button);
    });
    document.body.appendChild(panel);
    const toggleRect = toggle.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const left = Math.min(toggleRect.left, window.innerWidth - panelRect.width - 8);
    const top = toggleRect.bottom + panelRect.height + 8 <= window.innerHeight
      ? toggleRect.bottom + 4
      : Math.max(8, toggleRect.top - panelRect.height - 4);
    panel.style.left = `${Math.max(8, left)}px`;
    panel.style.top = `${top}px`;
    activeMenuPanel = panel;
    activeMenuToggle = toggle;
    toggle.setAttribute("aria-expanded", "true");
  };
  document.addEventListener("click", (event) => {
    if (!activeMenuPanel) return;
    if (activeMenuPanel.contains(event.target) || activeMenuToggle?.contains(event.target)) return;
    closeMenu();
  });
  container.addEventListener("scroll", closeMenu);
  window.addEventListener("resize", closeMenu);

  const renderTree = ({
    groups = [],
    placements = {},
    machines = [],
    selectedGroupId = "",
    expandedGroupIds = []
  }) => {
    closeMenu();
    container.innerHTML = "";
    container.setAttribute("aria-label", t("dashboard.groupTreeAria", "\u00c1rbol de grupos"));

    const title = document.createElement("div");
    title.className = "dashboard-group-tree-title";
    title.textContent = t("dashboard.groupTreeTitle", "Grupos");
    container.appendChild(title);

    const tree = document.createElement("div");
    tree.className = "dashboard-group-tree-list";
    tree.setAttribute("role", "tree");
    container.appendChild(tree);

    const groupById = new Map(groups.map((group) => [group.id, group]));
    const validGroupIds = new Set(groupById.keys());
    const machineCounts = new Map();
    const pendingCounts = new Map();
    const downCounts = new Map();
    const expandedIds = new Set(expandedGroupIds);
    let ungroupedCount = 0;

    machines.forEach((machine) => {
      const groupId = placements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) {
        ungroupedCount += 1;
        return;
      }
      addToAncestors(machineCounts, groupById, groupId, 1);
      addToAncestors(
        pendingCounts,
        groupById,
        groupId,
        getPendingTaskCount(machine)
      );
      addToAncestors(
        downCounts,
        groupById,
        groupId,
        normalizeStatus(machine.status) === "fuera_de_servicio" ? 1 : 0
      );
    });

    const createNode = ({
      id,
      label,
      depth = 0,
      count = 0,
      pending = 0,
      down = 0,
      hasChildren = false,
      icon = "",
      showMachineCount = false,
      group = null,
      dropType = ""
    }) => {
      const row = document.createElement("div");
      row.className = "dashboard-group-tree-row";
      row.dataset.depth = String(depth);
      if (dropType) row.dataset.treeDropType = dropType;
      if (group) {
        row.dataset.groupId = group.id;
        row.draggable = true;
      }
      row.style.setProperty(
        "--tree-indent",
        `${0.05 + Math.max(0, depth - 1) * 0.9}rem`
      );
      const showAggregateBadges = !hasChildren || !expandedIds.has(id);
      row.classList.toggle(
        "has-status",
        showAggregateBadges && (down > 0 || pending > 0)
      );

      if (hasChildren) {
        const collapsed = !expandedIds.has(id);
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "dashboard-group-tree-toggle";
        toggle.textContent = collapsed ? "+" : "\u2212";
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        toggle.setAttribute(
          "aria-label",
          collapsed
            ? t("dashboard.groupTreeExpand", "Desplegar grupo")
            : t("dashboard.groupTreeCollapse", "Contraer grupo")
        );
        toggle.addEventListener("click", () => onToggle(id));
        row.appendChild(toggle);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "dashboard-group-tree-toggle-spacer";
        row.appendChild(spacer);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "dashboard-group-tree-node";
      button.dataset.groupId = id;
      if (group) button.draggable = true;
      button.dataset.depth = String(depth);
      button.setAttribute("role", "treeitem");
      button.setAttribute("aria-level", String(depth + 1));
      button.setAttribute("aria-selected", selectedGroupId === id ? "true" : "false");
      if (hasChildren) {
        button.setAttribute("aria-expanded", expandedIds.has(id) ? "true" : "false");
      }

      if (icon) {
        const iconEl = document.createElement("span");
        iconEl.className = `dashboard-group-tree-icon is-${icon}`;
        iconEl.setAttribute("aria-hidden", "true");
        iconEl.innerHTML = icon === "ungrouped"
          ? '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 9h16M9 13h6"/></svg>'
          : icon === "grid"
            ? '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.25"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.25"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.25"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.25"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M3.5 8.75V7.5A1.75 1.75 0 0 1 5.25 5.75h3.9l2 2.25h7.6a1.75 1.75 0 0 1 1.75 1.75v6.5A1.75 1.75 0 0 1 18.75 18H5.25a1.75 1.75 0 0 1-1.75-1.75z"/><path d="M3.75 9h16.5"/></svg>';
        button.appendChild(iconEl);
      }

      const nodeLabel = document.createElement("span");
      nodeLabel.className = "dashboard-group-tree-label";
      nodeLabel.textContent = label;
      button.appendChild(nodeLabel);

      if (showAggregateBadges && down > 0) {
        const badge = document.createElement("span");
        badge.className = "dashboard-group-tree-badge is-down";
        badge.textContent = String(down);
        button.appendChild(badge);
      }
      if (showAggregateBadges && pending > 0) {
        const badge = document.createElement("span");
        badge.className = "dashboard-group-tree-badge is-pending";
        badge.textContent = String(pending);
        button.appendChild(badge);
      }

      if (showMachineCount) {
        const countEl = document.createElement("span");
        countEl.className = "dashboard-group-tree-count";
        countEl.textContent = String(count);
        countEl.title = t(
          "dashboard.groupTreeMachineCount",
          (value) => `${value} m\u00e1quinas`
        )(count);
        button.appendChild(countEl);
      }
      button.addEventListener("click", () => onSelect(id));
      row.appendChild(button);
      if (group) {
        const actionSlot = document.createElement("span");
        actionSlot.className = "dashboard-group-tree-action-slot";
        const menuToggle = document.createElement("button");
        menuToggle.type = "button";
        menuToggle.className = "dashboard-group-tree-menu-toggle";
        menuToggle.innerHTML =
          '<svg viewBox="0 0 18 18" aria-hidden="true">' +
          '<circle cx="4" cy="9" r="1.15"/>' +
          '<circle cx="9" cy="9" r="1.15"/>' +
          '<circle cx="14" cy="9" r="1.15"/>' +
          '</svg>';
        menuToggle.setAttribute("aria-label", t("dashboard.groupMenu", "Opciones de grupo"));
        menuToggle.setAttribute("aria-haspopup", "menu");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openMenu(menuToggle, group, Math.max(0, depth - 1));
        });
        actionSlot.appendChild(menuToggle);
        row.appendChild(actionSlot);
      }
      tree.appendChild(row);
    };

    createNode({
      id: TREE_ALL_ID,
      label: t("dashboard.groupTreeAll", "Todas las m\u00e1quinas"),
      count: machines.length,
      icon: "grid",
      showMachineCount: true,
      dropType: "all"
    });

    const childrenByParent = new Map();
    groups.forEach((group) => {
      const parentId = group.parentGroupId || "";
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(group);
    });
    childrenByParent.forEach((children) => {
      children.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    });

    const rendered = new Set();
    const appendChildren = (parentId = "", depth = 1) => {
      (childrenByParent.get(parentId) || []).forEach((group) => {
        if (rendered.has(group.id)) return;
        rendered.add(group.id);
        createNode({
          id: group.id,
          label: group.title || t("dashboard.groupUntitled", "Grupo"),
          depth,
          count: machineCounts.get(group.id) || 0,
          pending: pendingCounts.get(group.id) || 0,
          down: downCounts.get(group.id) || 0,
          hasChildren: (childrenByParent.get(group.id) || []).length > 0,
          icon: "folder",
          group,
          dropType: "group"
        });
        if (expandedIds.has(group.id)) appendChildren(group.id, depth + 1);
      });
    };
    appendChildren();

    createNode({
      id: TREE_UNGROUPED_ID,
      label: t("dashboard.groupTreeUngrouped", "Sin grupo"),
      count: ungroupedCount,
      icon: "ungrouped",
      dropType: "ungrouped"
    });
  };

  return { renderTree };
};
