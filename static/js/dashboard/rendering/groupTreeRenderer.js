const TREE_ALL_ID = "";
export const TREE_UNGROUPED_ID = "__ungrouped__";

const VISIBILITY_ICONS = {
  visible:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.75 12s3.35-6 9.25-6 9.25 6 9.25 6-3.35 6-9.25 6-9.25-6-9.25-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  hidden:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.7 6.1A10.7 10.7 0 0 1 12 6c5.9 0 9.25 6 9.25 6a15.4 15.4 0 0 1-2.1 2.85M6.15 6.15C3.9 7.7 2.75 12 2.75 12s3.35 6 9.25 6a10.7 10.7 0 0 0 3.1-.45"/><path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4"/></svg>',
  mixed:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.75 12s3.35-6 9.25-6 9.25 6 9.25 6-3.35 6-9.25 6-9.25-6-9.25-6Z"/><path d="M9.5 12h5"/></svg>'
};

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
  attachTooltip,
  container,
  getGroupMenuActions,
  getPendingTaskCount,
  normalizeStatus,
  onCreateGroup,
  onSelect,
  onShowAllGroups,
  onToggle,
  onToggleIncidentCounts,
  onToggleTaskCounts,
  onToggleVisibility,
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
  const openMenu = (toggle, actions = []) => {
    if (activeMenuToggle === toggle) {
      closeMenu();
      return;
    }
    closeMenu();
    const panel = document.createElement("div");
    panel.className = "dashboard-group-tree-menu-panel";
    panel.setAttribute("role", "menu");
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dashboard-group-tree-menu-action";
      const checkable = typeof action.checked === "boolean";
      button.classList.toggle("is-checkable", checkable);
      button.classList.toggle("is-checked", action.checked === true);
      button.setAttribute("role", checkable ? "menuitemcheckbox" : "menuitem");
      if (checkable) button.setAttribute("aria-checked", action.checked ? "true" : "false");
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
    expandedGroupIds = [],
    hiddenGroupIds = [],
    showIncidentCounts = true,
    showTaskCounts = true
  }) => {
    closeMenu();
    container.innerHTML = "";
    container.setAttribute("aria-label", t("dashboard.groupTreeAria", "\u00c1rbol de grupos"));
    const validGroupIds = new Set(groups.map((group) => group.id));
    const hiddenIds = new Set(
      hiddenGroupIds.filter((groupId) => validGroupIds.has(groupId))
    );

    const header = document.createElement("div");
    header.className = "dashboard-group-tree-header";
    const title = document.createElement("div");
    title.className = "dashboard-group-tree-title";
    title.textContent = t("dashboard.groupTreeTitle", "Grupos");
    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "dashboard-group-tree-create";
    createButton.innerHTML =
      '<svg viewBox="0 0 18 18" aria-hidden="true">' +
      '<path d="M9 3.75v10.5M3.75 9h10.5"/></svg>';
    const createLabel = t("dashboard.addGroupAria", "Crear grupo");
    createButton.setAttribute("aria-label", createLabel);
    createButton.setAttribute("data-tooltip", createLabel);
    attachTooltip?.(createButton);
    createButton.addEventListener("click", () => onCreateGroup?.());
    const preferencesButton = document.createElement("button");
    preferencesButton.type = "button";
    preferencesButton.className = "dashboard-group-tree-preferences";
    preferencesButton.innerHTML =
      '<svg viewBox="0 0 18 18" aria-hidden="true">' +
      '<circle cx="4" cy="9" r="1.15"/>' +
      '<circle cx="9" cy="9" r="1.15"/>' +
      '<circle cx="14" cy="9" r="1.15"/>' +
      '</svg>';
    const preferencesLabel = t("dashboard.groupTreePreferences", "Preferencias");
    preferencesButton.setAttribute("aria-label", preferencesLabel);
    preferencesButton.setAttribute("data-tooltip", preferencesLabel);
    preferencesButton.setAttribute("aria-haspopup", "menu");
    preferencesButton.setAttribute("aria-expanded", "false");
    attachTooltip?.(preferencesButton);
    preferencesButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMenu(preferencesButton, [
        {
          label: t("dashboard.groupTreeShowIncidentCounts", "Mostrar incidencias"),
          checked: showIncidentCounts,
          onClick: () => onToggleIncidentCounts?.()
        },
        {
          label: t("dashboard.groupTreeShowTaskCounts", "Mostrar tareas"),
          checked: showTaskCounts,
          onClick: () => onToggleTaskCounts?.()
        }
      ]);
    });
    const headerActions = document.createElement("div");
    headerActions.className = "dashboard-group-tree-header-actions";
    headerActions.appendChild(createButton);
    headerActions.appendChild(preferencesButton);
    header.appendChild(title);
    header.appendChild(headerActions);
    container.appendChild(header);

    if (hiddenIds.size) {
      const summary = document.createElement("div");
      summary.className = "dashboard-group-tree-visibility-summary";
      const summaryText = document.createElement("span");
      summaryText.textContent = t(
        "dashboard.groupTreeHiddenCount",
        (count) => `${count} grupos ocultos`
      )(hiddenIds.size);
      const showAllButton = document.createElement("button");
      showAllButton.type = "button";
      showAllButton.className = "dashboard-group-tree-show-all";
      showAllButton.textContent = t("dashboard.groupTreeShowAll", "Mostrar todos");
      showAllButton.addEventListener("click", () => onShowAllGroups?.());
      summary.appendChild(summaryText);
      summary.appendChild(showAllButton);
      container.appendChild(summary);
    }

    const tree = document.createElement("div");
    tree.className = "dashboard-group-tree-list";
    tree.setAttribute("role", "tree");
    container.appendChild(tree);

    const groupById = new Map(groups.map((group) => [group.id, group]));
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
      if (showTaskCounts && !hiddenIds.has(groupId)) {
        addToAncestors(
          pendingCounts,
          groupById,
          groupId,
          getPendingTaskCount(machine)
        );
      }
      if (showIncidentCounts && !hiddenIds.has(groupId)) {
        addToAncestors(
          downCounts,
          groupById,
          groupId,
          normalizeStatus(machine.status) === "fuera_de_servicio" ? 1 : 0
        );
      }
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
      dropType = "",
      visibilityState = "visible"
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
        showAggregateBadges && (
          (showIncidentCounts && down > 0) || (showTaskCounts && pending > 0)
        )
      );
      row.classList.toggle("is-visibility-hidden", visibilityState === "hidden");
      row.classList.toggle("is-visibility-mixed", visibilityState === "mixed");
      row.classList.toggle("is-selected", selectedGroupId === id);

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

      if (showIncidentCounts && showAggregateBadges && down > 0) {
        const badge = document.createElement("span");
        badge.className = "dashboard-group-tree-badge is-down";
        badge.textContent = String(down);
        button.appendChild(badge);
      }
      if (showTaskCounts && showAggregateBadges && pending > 0) {
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
        const visibilityToggle = document.createElement("button");
        visibilityToggle.type = "button";
        visibilityToggle.className = "dashboard-group-tree-visibility-toggle";
        visibilityToggle.classList.add(`is-${visibilityState}`);
        visibilityToggle.innerHTML = VISIBILITY_ICONS[visibilityState] || VISIBILITY_ICONS.visible;
        visibilityToggle.setAttribute(
          "aria-pressed",
          visibilityState === "mixed" ? "mixed" : visibilityState === "visible" ? "true" : "false"
        );
        const visibilityLabel = visibilityState === "hidden"
          ? t("dashboard.groupTreeShowGroup", (value) => `Mostrar m\u00e1quinas de ${value}`)(label)
          : t("dashboard.groupTreeHideGroup", (value) => `Ocultar m\u00e1quinas de ${value}`)(label);
        visibilityToggle.setAttribute("aria-label", visibilityLabel);
        visibilityToggle.setAttribute("data-tooltip", visibilityLabel);
        attachTooltip?.(visibilityToggle, { placement: "right" });
        visibilityToggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleVisibility?.(group.id);
        });
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
          openMenu(menuToggle, getGroupMenuActions(group, Math.max(0, depth - 1)));
        });
        actionSlot.appendChild(visibilityToggle);
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
          dropType: "group",
          visibilityState: (() => {
            const branchIds = getDashboardGroupBranchIds(groups, group.id);
            const hiddenCount = Array.from(branchIds).filter((id) => hiddenIds.has(id)).length;
            if (!hiddenCount) return "visible";
            return hiddenCount === branchIds.size ? "hidden" : "mixed";
          })()
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
