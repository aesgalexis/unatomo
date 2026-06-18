export const MAX_DASHBOARD_TITLE_LENGTH = 32;

export const DEFAULT_TAB_ORDER = [
  "quehaceres",
  "historial",
  "general",
  "configuracion"
];

export const normalizeDashboardTitle = (value) =>
  (value || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DASHBOARD_TITLE_LENGTH);

export const normalizeIsoString = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
};

export const normalizeTabOrder = (value) => {
  const seen = new Set();
  const ordered = Array.isArray(value)
    ? value.filter((id) => {
        if (!DEFAULT_TAB_ORDER.includes(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
    : [];
  DEFAULT_TAB_ORDER.forEach((id) => {
    if (!seen.has(id)) ordered.push(id);
  });
  return ordered;
};

export const normalizeDashboardLayout = (layout = {}, options = {}) => {
  const groupUntitled = (options.groupUntitled || "Grupo").toString();
  const validMachineIds =
    options.validMachineIds instanceof Set
      ? options.validMachineIds
      : Array.isArray(options.validMachineIds)
        ? new Set(options.validMachineIds.map((id) => String(id)))
        : null;
  const groups = Array.isArray(layout?.groups)
    ? layout.groups
        .filter((group) => group && group.id)
        .map((group, index) => ({
          id: String(group.id),
          title: (group.title || groupUntitled).toString().trim() || groupUntitled,
          order: typeof group.order === "number" ? group.order : index,
          parentGroupId: group.parentGroupId ? String(group.parentGroupId) : "",
          collapsed: !!group.collapsed
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const knownGroupIds = new Set(groups.map((group) => group.id));
  groups.forEach((group) => {
    if (!knownGroupIds.has(group.parentGroupId) || group.parentGroupId === group.id) {
      group.parentGroupId = "";
    }
  });

  const groupById = new Map(groups.map((group) => [group.id, group]));
  groups.forEach((group) => {
    const parent = groupById.get(group.parentGroupId);
    if (parent?.parentGroupId) group.parentGroupId = "";
  });

  const placements = {};
  const rawPlacements =
    layout?.placements &&
    typeof layout.placements === "object" &&
    !Array.isArray(layout.placements)
      ? layout.placements
      : {};
  Object.entries(rawPlacements).forEach(([machineId, placement]) => {
    if (!machineId || !placement || typeof placement !== "object") return;
    if (validMachineIds && !validMachineIds.has(machineId)) return;
    const groupId = knownGroupIds.has(placement.groupId) ? placement.groupId : "";
    placements[machineId] = {
      groupId,
      order: typeof placement.order === "number" ? placement.order : 0
    };
  });

  return {
    groups,
    placements,
    tabOrder: normalizeTabOrder(layout?.tabOrder),
    dashboardTitle: normalizeDashboardTitle(layout?.dashboardTitle),
    registrySeenAt: normalizeIsoString(layout?.registrySeenAt),
    suggestionsSeenAt: normalizeIsoString(layout?.suggestionsSeenAt)
  };
};
