export const createDashboardGroupId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `g_${Math.random().toString(36).slice(2, 10)}`;
};

export const getNextDashboardGroupTitle = (layout = {}, baseTitle = "Grupo") => {
  const base = (baseTitle || "Grupo").toString().trim() || "Grupo";
  const existing = new Set(
    (layout?.groups || [])
      .map((group) => (group.title || "").trim().toLowerCase())
      .filter(Boolean)
  );
  let index = 1;
  let title = `${base} ${index}`;
  while (existing.has(title.toLowerCase())) {
    index += 1;
    title = `${base} ${index}`;
  }
  return title;
};

const cloneLayout = (layout = {}) => ({
  ...layout,
  groups: Array.isArray(layout.groups) ? layout.groups.map((group) => ({ ...group })) : [],
  placements:
    layout.placements && typeof layout.placements === "object"
      ? Object.fromEntries(
          Object.entries(layout.placements).map(([id, placement]) => [
            id,
            { ...(placement || {}) }
          ])
        )
      : {}
});

export const reorderFlatMachines = (machines = [], orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return { machines, touchedMachineIds: [] };
  }
  const orderMap = new Map(orderIds.map((id, index) => [id, index]));
  const orderedSet = new Set(orderIds);
  const maxCurrentOrder = machines.reduce(
    (max, machine) => Math.max(max, typeof machine.order === "number" ? machine.order : 0),
    0
  );
  const touchedMachineIds = [];
  const nextMachines = machines.map((machine) => {
    if (!orderMap.has(machine.id)) return machine;
    touchedMachineIds.push(machine.id);
    return { ...machine, order: orderMap.get(machine.id) };
  });
  nextMachines
    .filter((machine) => !orderedSet.has(machine.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((machine, index) => {
      if (typeof machine.order !== "number") machine.order = maxCurrentOrder + index + 1;
    });
  return { machines: nextMachines, touchedMachineIds };
};

export const reorderUngroupedMachines = (machines = [], orderIds = []) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return { machines, touchedMachineIds: [] };
  }
  const orderMap = new Map(orderIds.map((id, index) => [id, index]));
  const touchedMachineIds = [];
  const nextMachines = machines.map((machine) => {
    if (!orderMap.has(machine.id)) return machine;
    touchedMachineIds.push(machine.id);
    return { ...machine, order: orderMap.get(machine.id) };
  });
  return { machines: nextMachines, touchedMachineIds };
};

export const updatePlacementOrder = (layout = {}, groupId = "", orderIds = []) => {
  const nextLayout = cloneLayout(layout);
  orderIds.forEach((id, index) => {
    nextLayout.placements[id] = { groupId: groupId || "", order: index };
  });
  return nextLayout;
};

export const compactPlacementOrders = (layout = {}, machines = [], groupId = "") => {
  const nextLayout = cloneLayout(layout);
  nextLayout.placements = nextLayout.placements || {};
  machines
    .filter((machine) => (nextLayout.placements[machine.id]?.groupId || "") === (groupId || ""))
    .sort(
      (a, b) =>
        (nextLayout.placements[a.id]?.order ?? a.order ?? 0) -
        (nextLayout.placements[b.id]?.order ?? b.order ?? 0)
    )
    .forEach((machine, index) => {
      nextLayout.placements[machine.id] = {
        groupId: groupId || "",
        order: index
      };
    });
  return nextLayout;
};

export const reorderMixedItems = (layout = {}, machines = [], parentGroupId = "", items = []) => {
  if (!Array.isArray(items) || !items.length) {
    return { layout, machines, touchedMachineIds: [] };
  }
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  const placements = nextLayout.placements || {};
  const parentGroup = groups.find((group) => group.id === parentGroupId);
  const isSubgroupTarget = !!parentGroup?.parentGroupId;

  const machineOrderMap = new Map();
  const orderedItems = isSubgroupTarget
    ? items.filter((item) => item.type === "machine")
    : [
        ...items.filter((item) => item.type === "group"),
        ...items.filter((item) => item.type === "machine")
      ];

  orderedItems.forEach((item, index) => {
    if (item.type === "machine") {
      placements[item.id] = { groupId: parentGroupId || "", order: index };
      if (!parentGroupId) machineOrderMap.set(item.id, index);
      return;
    }
    if (item.type !== "group" || isSubgroupTarget) return;
    const group = groups.find((entry) => entry.id === item.id);
    if (!group) return;
    if (parentGroupId && group.id === parentGroupId) return;
    group.parentGroupId = parentGroupId || "";
    group.order = index;
    groups.forEach((entry) => {
      if (entry.parentGroupId === group.id && group.parentGroupId) entry.parentGroupId = "";
    });
  });

  const touchedMachineIds = [];
  const nextMachines = machineOrderMap.size
    ? machines.map((machine) => {
        if (!machineOrderMap.has(machine.id)) return machine;
        touchedMachineIds.push(machine.id);
        return { ...machine, order: machineOrderMap.get(machine.id) };
      })
    : machines;

  nextLayout.placements = placements;
  return { layout: nextLayout, machines: nextMachines, touchedMachineIds };
};

export const createGroupFromMachineDrop = (
  layout = {},
  machines = [],
  { draggedId = "", targetId = "", groupId = "", title = "", parentGroupId = "" } = {}
) => {
  if (!draggedId || !targetId || draggedId === targetId || !groupId) {
    return { layout, compactedGroupIds: [] };
  }
  let nextLayout = cloneLayout(layout);
  const previousDraggedGroupId = nextLayout.placements?.[draggedId]?.groupId || "";
  const previousTargetGroupId = nextLayout.placements?.[targetId]?.groupId || "";
  const parentGroup = parentGroupId
    ? (nextLayout.groups || []).find((group) => group.id === parentGroupId)
    : null;
  const validParentGroupId = parentGroup && !parentGroup.parentGroupId ? parentGroup.id : "";
  nextLayout.groups = [
    ...(nextLayout.groups || []),
    {
      id: groupId,
      title,
      parentGroupId: validParentGroupId,
      order:
        (nextLayout.groups || [])
          .filter((group) => (group.parentGroupId || "") === validParentGroupId)
          .reduce((max, group) => Math.max(max, typeof group.order === "number" ? group.order : 0), -1) + 1,
      collapsed: false
    }
  ];
  nextLayout.placements = {
    ...(nextLayout.placements || {}),
    [targetId]: { groupId, order: 0 },
    [draggedId]: { groupId, order: 1 }
  };
  nextLayout = compactPlacementOrders(nextLayout, machines, previousDraggedGroupId);
  nextLayout = compactPlacementOrders(nextLayout, machines, previousTargetGroupId);
  return {
    layout: nextLayout,
    compactedGroupIds: [previousDraggedGroupId, previousTargetGroupId]
  };
};

export const moveMachineAfterTarget = (layout = {}, machines = [], draggedId = "", targetId = "") => {
  const nextLayout = cloneLayout(layout);
  const placements = nextLayout.placements || {};
  const targetGroupId = placements[targetId]?.groupId || "";
  if (!targetGroupId) return { layout, shouldCreateGroup: true };
  const previousGroupId = placements[draggedId]?.groupId || "";
  const orderedIds = machines
    .filter(
      (machine) =>
        (placements[machine.id]?.groupId || "") === targetGroupId &&
        machine.id !== draggedId
    )
    .sort(
      (a, b) =>
        (placements[a.id]?.order ?? a.order ?? 0) -
        (placements[b.id]?.order ?? b.order ?? 0)
    )
    .map((machine) => machine.id);
  const targetIndex = orderedIds.indexOf(targetId);
  orderedIds.splice(targetIndex >= 0 ? targetIndex + 1 : orderedIds.length, 0, draggedId);
  orderedIds.forEach((id, index) => {
    placements[id] = { groupId: targetGroupId, order: index };
  });
  nextLayout.placements = placements;
  let compacted = compactPlacementOrders(nextLayout, machines, previousGroupId);
  compacted = compactPlacementOrders(compacted, machines, targetGroupId);
  return { layout: compacted, shouldCreateGroup: false };
};

export const moveMachineToGroup = (layout = {}, machines = [], draggedId = "", targetGroupId = "") => {
  if (!draggedId || !targetGroupId) return { layout };
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  if (!groups.some((group) => group.id === targetGroupId)) return { layout };
  const placements = nextLayout.placements || {};
  const previousGroupId = placements[draggedId]?.groupId || "";
  const nextOrder =
    machines
      .filter(
        (machine) =>
          (placements[machine.id]?.groupId || "") === targetGroupId &&
          machine.id !== draggedId
      )
      .reduce(
        (max, machine) =>
          Math.max(max, placements[machine.id]?.order ?? machine.order ?? 0),
        -1
      ) + 1;
  placements[draggedId] = { groupId: targetGroupId, order: nextOrder };
  nextLayout.placements = placements;
  let compacted = compactPlacementOrders(nextLayout, machines, previousGroupId);
  compacted = compactPlacementOrders(compacted, machines, targetGroupId);
  return { layout: compacted };
};

export const moveGroupToGroup = (layout = {}, draggedGroupId = "", targetGroupId = "") => {
  if (!draggedGroupId || !targetGroupId || draggedGroupId === targetGroupId) return { layout };
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  const draggedGroup = groups.find((group) => group.id === draggedGroupId);
  const targetGroup = groups.find((group) => group.id === targetGroupId);
  if (!draggedGroup || !targetGroup) return { layout };
  const parentGroupId = targetGroup.parentGroupId || targetGroup.id;
  if (!parentGroupId || parentGroupId === draggedGroupId) return { layout };
  if (targetGroup.parentGroupId === draggedGroupId) return { layout };

  draggedGroup.parentGroupId = parentGroupId;
  draggedGroup.order =
    groups
      .filter((group) => group.parentGroupId === parentGroupId && group.id !== draggedGroupId)
      .reduce((max, group) => Math.max(max, typeof group.order === "number" ? group.order : 0), -1) +
    1;

  groups.forEach((group) => {
    if (group.parentGroupId === draggedGroupId) group.parentGroupId = "";
  });
  return { layout: nextLayout };
};

export const moveGroupToRoot = (layout = {}, draggedGroupId = "", order = null) => {
  if (!draggedGroupId) return { layout };
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  const group = groups.find((entry) => entry.id === draggedGroupId);
  if (!group) return { layout };
  group.parentGroupId = "";
  group.order = typeof order === "number"
    ? order
    : groups
        .filter((entry) => !entry.parentGroupId && entry.id !== draggedGroupId)
        .reduce((max, entry) => Math.max(max, typeof entry.order === "number" ? entry.order : 0), -1) + 1;
  groups
    .filter((entry) => !entry.parentGroupId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((entry, index) => {
      entry.order = index;
    });
  return { layout: nextLayout };
};

export const renameGroup = (layout = {}, groupId = "", title = "") => {
  if (!groupId) return { layout };
  const nextLayout = cloneLayout(layout);
  const group = (nextLayout.groups || []).find((entry) => entry.id === groupId);
  if (!group) return { layout };
  const cleanTitle = (title || "").toString().trim();
  if (!cleanTitle) return { layout };
  group.title = cleanTitle.slice(0, 40);
  return { layout: nextLayout };
};

export const createChildGroup = (layout = {}, parentGroupId = "", group = {}) => {
  if (!parentGroupId || !group?.id) return { layout };
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  const parent = groups.find((entry) => entry.id === parentGroupId);
  if (!parent || parent.parentGroupId) return { layout };
  groups.push({
    id: group.id,
    title: (group.title || "Grupo").toString().trim() || "Grupo",
    parentGroupId,
    order:
      groups
        .filter((entry) => entry.parentGroupId === parentGroupId)
        .reduce((max, entry) => Math.max(max, typeof entry.order === "number" ? entry.order : 0), -1) + 1,
    collapsed: false
  });
  nextLayout.groups = groups;
  return { layout: nextLayout };
};

export const deleteGroup = (layout = {}, groupId = "") => {
  if (!groupId) return { layout };
  const nextLayout = cloneLayout(layout);
  const groups = nextLayout.groups || [];
  const target = groups.find((entry) => entry.id === groupId);
  if (!target) return { layout };
  const parentGroupId = target.parentGroupId || "";
  const placements = nextLayout.placements || {};
  let nextMachineOrder = Object.values(placements)
    .filter((placement) => (placement?.groupId || "") === parentGroupId)
    .reduce((max, placement) => Math.max(max, typeof placement.order === "number" ? placement.order : 0), -1) + 1;
  Object.entries(placements).forEach(([machineId, placement]) => {
    if ((placement?.groupId || "") !== groupId) return;
    placements[machineId] = {
      ...placement,
      groupId: parentGroupId,
      order: nextMachineOrder
    };
    nextMachineOrder += 1;
  });
  let nextGroupOrder = groups
    .filter((entry) => entry.parentGroupId === parentGroupId && entry.id !== groupId)
    .reduce((max, entry) => Math.max(max, typeof entry.order === "number" ? entry.order : 0), -1) + 1;
  groups.forEach((entry) => {
    if (entry.parentGroupId === groupId) {
      entry.parentGroupId = parentGroupId;
      entry.order = nextGroupOrder;
      nextGroupOrder += 1;
    }
  });
  nextLayout.groups = groups.filter((entry) => entry.id !== groupId);
  nextLayout.placements = placements;
  return { layout: nextLayout };
};
