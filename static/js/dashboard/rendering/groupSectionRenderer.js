export const createGroupSectionRenderer = (dependencies) => {
  const {
    canDashboardGroupHaveChildren,
    canWrapGroupWithParent,
    clearInitialGroupPriorityOrder,
    createChildGroup,
    createDashboardGroupId,
    createParentGroup,
    deleteGroup,
    getNextGroupTitle,
    locallyVisibleEmptyGroupIds,
    MAX_DASHBOARD_GROUP_DEPTH,
    normalizeDashboardLayout,
    renameGroup,
    renderCards,
    saveDashboardLayout,
    state,
    t,
  } = dependencies;
  function handleRenameGroup(group) {
    if (!group?.id) return;
    const currentTitle = group.title || t("dashboard.groupUntitled", "Grupo");
    const nextTitle = window.prompt(
      t("dashboard.groupRenamePrompt", "Nombre del grupo"),
      currentTitle
    );
    if (nextTitle === null) return;
    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || cleanTitle === currentTitle) return;
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = renameGroup(state.dashboardLayout, group.id, cleanTitle).layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  function handleDeleteGroup(group) {
    if (!group?.id) return;
    const title = group.title || t("dashboard.groupUntitled", "Grupo");
    const confirmed = window.confirm(
      t("dashboard.groupDeleteConfirm", (value) => `¿Eliminar el grupo "${value}"? Las máquinas no se eliminarán.`)(title)
    );
    if (!confirmed) return;
    clearInitialGroupPriorityOrder();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = deleteGroup(state.dashboardLayout, group.id).layout;
    locallyVisibleEmptyGroupIds.delete(group.id);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  function handleAddChildGroup(group) {
    if (
      !group?.id ||
      !canDashboardGroupHaveChildren(state.dashboardLayout?.groups || [], group.id)
    ) return;
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(t("dashboard.addGroupPrompt", "Nombre del grupo"), suggestedTitle);
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const newGroupId = createDashboardGroupId();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = createChildGroup(state.dashboardLayout, group.id, {
      id: newGroupId,
      title: cleanTitle
    }).layout;
    locallyVisibleEmptyGroupIds.add(newGroupId);
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  function handleAddParentGroup(group) {
    if (!group?.id || !canWrapGroupWithParent(state.dashboardLayout, group.id)) {
      return;
    }
    const suggestedTitle = getNextGroupTitle();
    const title = window.prompt(
      t("dashboard.addGroupPrompt", "Nombre del grupo"),
      suggestedTitle
    );
    if (title === null) return;
    const cleanTitle = (title || "").trim() || suggestedTitle;
    const newGroupId = createDashboardGroupId();
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
    state.dashboardLayout = createParentGroup(
      state.dashboardLayout,
      group.id,
      { id: newGroupId, title: cleanTitle }
    ).layout;
    saveDashboardLayout();
    renderCards({ preserveScroll: true });
  }

  const getGroupMenuActions = (group, depth = 0) => {
    const actions = [];
    if (canWrapGroupWithParent(state.dashboardLayout, group.id)) {
      actions.push({
        label: t("dashboard.groupAddParent", "A\u00f1adir grupo superior"),
        onClick: () => handleAddParentGroup(group)
      });
    }
    if (depth < MAX_DASHBOARD_GROUP_DEPTH) {
      actions.push({
        label: t("dashboard.groupAddChild", "A\u00f1adir grupo"),
        onClick: () => handleAddChildGroup(group)
      });
    }
    actions.push(
      { label: t("dashboard.groupRename", "Renombrar"), onClick: () => handleRenameGroup(group) },
      { label: t("dashboard.groupDelete", "Eliminar"), onClick: () => handleDeleteGroup(group) }
    );
    return actions;
  };

  const createGroupSection = (
    group,
    depth = 0,
    pendingTasksCount = 0,
    downMachinesCount = 0
  ) => {
    const section = document.createElement("section");
    section.className = "machine-group";
    section.classList.toggle("machine-subgroup", depth > 0);
    section.dataset.groupId = group.id || "";
    section.dataset.parentGroupId = group.parentGroupId || "";
    section.dataset.groupDepth = String(depth);
    section.dataset.collapsed = group.collapsed ? "true" : "false";
    section.style.setProperty("--group-depth", String(depth));
    section.style.setProperty("--group-header-offset", `${depth}rem`);
    section.style.setProperty("--group-card-offset", `${depth * 1.2}rem`);
    section.style.setProperty(
      "--group-card-offset-with-ungrouped",
      `${(depth + 1) * 1.2}rem`
    );
    section.draggable = true;

    const header = document.createElement("div");
    header.setAttribute("role", "button");
    header.tabIndex = 0;
    header.className = "machine-group-header";
    header.draggable = true;
    const caret = document.createElement("span");
    caret.className = "machine-group-caret";
    caret.textContent = group.collapsed ? "+" : "−";
    const title = document.createElement("span");
    title.className = "machine-group-title machine-group-menu-hover-zone";
    title.textContent = group.title || t("dashboard.groupUntitled", "Grupo");
    const pendingCount = document.createElement("span");
    pendingCount.className = "machine-group-count machine-group-pending-count";
    pendingCount.textContent = String(pendingTasksCount);
    pendingCount.title = t("dashboard.groupPendingCountTooltip", "Tareas pendientes en este grupo");
    pendingCount.hidden = pendingTasksCount <= 0;
    const downCount = document.createElement("span");
    downCount.className = "machine-group-count machine-group-down-count";
    downCount.textContent = String(downMachinesCount);
    downCount.title = t("dashboard.groupDownCountTooltip", "Máquinas fuera de servicio en este grupo");
    downCount.hidden = downMachinesCount <= 0;
    const menu = document.createElement("div");
    menu.className = "machine-group-menu machine-group-menu-hover-zone";
    const menuToggle = document.createElement("button");
    menuToggle.type = "button";
    menuToggle.className = "machine-group-menu-toggle";
    menuToggle.setAttribute("aria-label", t("dashboard.groupMenu", "Opciones de grupo"));
    menuToggle.setAttribute("aria-haspopup", "menu");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "•••";
    const menuPanel = document.createElement("div");
    menuPanel.className = "machine-group-menu-panel";
    menuPanel.setAttribute("role", "menu");
    menuPanel.hidden = true;
    const closeMenu = () => {
      menuPanel.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    };
    const addMenuAction = (label, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "machine-group-menu-action";
      btn.setAttribute("role", "menuitem");
      btn.textContent = label;
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        onClick();
      });
      menuPanel.appendChild(btn);
    };
    if (canWrapGroupWithParent(state.dashboardLayout, group.id)) {
      addMenuAction(
        t("dashboard.groupAddParent", "Añadir grupo superior"),
        () => handleAddParentGroup(group)
      );
    }
    if (depth < MAX_DASHBOARD_GROUP_DEPTH) {
      addMenuAction(t("dashboard.groupAddChild", "Añadir grupo"), () => handleAddChildGroup(group));
    }
    addMenuAction(t("dashboard.groupRename", "Renombrar"), () => handleRenameGroup(group));
    addMenuAction(t("dashboard.groupDelete", "Eliminar"), () => handleDeleteGroup(group));
    menuToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = menuPanel.hidden;
      menuPanel.hidden = !nextOpen;
      menuToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("mouseleave", closeMenu);
    const spacer = document.createElement("span");
    spacer.className = "machine-group-header-spacer";
    menu.appendChild(menuToggle);
    menu.appendChild(menuPanel);
    header.appendChild(caret);
    header.appendChild(title);
    header.appendChild(menu);
    header.appendChild(spacer);
    header.appendChild(downCount);
    header.appendChild(pendingCount);
    header.addEventListener("click", (event) => {
      if (event.target.closest(".machine-group-menu")) return;
      event.preventDefault();
      try {
        header.blur({ preventScroll: true });
      } catch {
        header.blur();
      }
      state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout);
      const target = state.dashboardLayout.groups.find((entry) => entry.id === group.id);
      if (!target) return;
      target.collapsed = !target.collapsed;
      if (target.collapsed) {
        const groupById = new Map(
          state.dashboardLayout.groups.map((entry) => [entry.id, entry])
        );
        state.dashboardLayout.groups.forEach((entry) => {
          const seen = new Set();
          let parentId = entry.parentGroupId || "";
          while (parentId && !seen.has(parentId)) {
            if (parentId === target.id) {
              entry.collapsed = true;
              break;
            }
            seen.add(parentId);
            parentId = groupById.get(parentId)?.parentGroupId || "";
          }
        });
      }
      saveDashboardLayout();
      renderCards();
    });
    header.addEventListener("keydown", (event) => {
      if (event.target.closest(".machine-group-menu")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      header.click();
    });

    const body = document.createElement("div");
    body.className = "machine-group-body";
    if (group.collapsed) body.hidden = true;
    section.appendChild(header);
    section.appendChild(body);
    return { section, body };
  };

  return { createGroupSection, getGroupMenuActions };
};
