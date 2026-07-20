export const createDashboardDataController = (dependencies) => {
  const {
    cardRefs,
    cloneMachines,
    createDashboardSubscriptions,
    createMachineAccessSync,
    fetchMachineAccess,
    getNextDashboardGroupTitle,
    getTaskTiming,
    list,
    loadOrderCache,
    normalizeDashboardLayoutBase,
    normalizeStatus,
    notifyTopbar,
    recalcHeight,
    renderCards,
    renderInviteBanner,
    renderTopbarNotifications,
    scheduleHeightSync,
    state,
    statusLabels,
    t,
    updateLoading,
    upsertDashboardLayout,
  } = dependencies;
  let dashboardSubscriptions = null;
  let machineAccessSync = null;
  let pendingRebuildOptions = null;
  let rebuildTimer = null;
  let rebuildToken = 0;

  const clearRebuildTimer = () => {
    if (!rebuildTimer) return;
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  };
  const cleanupSubscriptions = () => {
    dashboardSubscriptions?.cleanup();
    machineAccessSync?.cleanup();
  };
  const setRemote = (remote) => {
    state.remoteMachines = cloneMachines(remote);
    state.draftMachines = cloneMachines(remote);
    state.tagStatusById = {};
  };

  const mergeOperationalFromTag = async (machines) => {
    const merged = await Promise.all(
      machines.map(async (machine) => {
        if (!machine.tagId) return { ...machine, _operationalSource: "local" };
        try {
          const access = await fetchMachineAccess(machine.tagId);
          if (!access) return { ...machine, _operationalSource: "local" };
          return {
            ...machine,
            status: access.status ?? machine.status,
            tasks: access.tasks ?? machine.tasks,
            logs: access.logs ?? machine.logs,
            _operationalSource: "tag"
          };
        } catch {
          return { ...machine, _operationalSource: "local" };
        }
      })
    );
    return merged;
  };

  const applyOperationalPatch = (machineId, operational) => {
    if (isRecentLocalWrite(machineId)) return;
    const current = getDraftById(machineId);
    if (!current) return;
    current.status = normalizeStatus(operational.status ?? current.status);
    current.tasks = operational.tasks ?? current.tasks;
    current.logs = operational.logs ?? current.logs;
    current._operationalSource = "tag";

    const ref = cardRefs.get(machineId);
    const card = (ref && ref.card) || list.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
    if (!card) return;
    const hooks = ref && ref.hooks ? ref.hooks : null;
    const statusBtn = card.querySelector(".mc-status");
    if (statusBtn) {
      const status = normalizeStatus(current.status);
      const label = statusLabels[status] || status;
      statusBtn.textContent = "";
      statusBtn.innerHTML = `<span class="mc-status-text">${label}</span>`;
      statusBtn.dataset.status = status;
    }

    const activeTab = state.selectedTabById?.[machineId] || card.querySelector(".mc-panel")?.dataset?.panel;
    if (hooks && hooks.setActiveTab && (activeTab === "quehaceres" || activeTab === "historial")) {
      hooks.setActiveTab(activeTab, { notify: false });
      if (card.dataset.expanded === "true") {
        scheduleHeightSync(machineId, () => recalcHeight(card));
      }
    }
  };

  const syncMachineAccessListeners = (machines) => {
    if (!machineAccessSync) {
      machineAccessSync = createMachineAccessSync({ applyOperationalPatch });
    }
    machineAccessSync.sync(machines);
  };

  const getDraftIndex = (id) => state.draftMachines.findIndex((m) => m.id === id);
  const getDraftById = (id) => state.draftMachines.find((m) => m.id === id);
  const getKnownMachineIds = () =>
    Array.from(
      new Set([
        ...(state.draftMachines || []),
        ...(state.ownerMachines || []),
        ...(state.adminMachines || [])
      ].map((machine) => machine?.id).filter(Boolean))
    );

  const normalizeDashboardLayout = (layout = {}, options = {}) =>
    normalizeDashboardLayoutBase(layout, {
      groupUntitled: t("dashboard.groupUntitled", "Grupo"),
      validMachineIds: options.pruneMissingMachines ? getKnownMachineIds() : null
    });

  const saveDashboardLayout = async () => {
    if (!state.uid) return;
    state.dashboardLayout = normalizeDashboardLayout(state.dashboardLayout, {
      pruneMissingMachines: true
    });
    try {
      await upsertDashboardLayout(state.uid, state.dashboardLayout);
    } catch {
      notifyTopbar(t("dashboard.saveError", "Error al guardar"));
    }
  };

  const getNextGroupTitle = () => {
    const base = t("dashboard.groupUntitled", "Grupo");
    return getNextDashboardGroupTitle(state.dashboardLayout, base);
  };

  const getPendingTaskCount = (machine) => {
    const tasks = Array.isArray(machine?.tasks) ? machine.tasks : [];
    return tasks.filter((task) => getTaskTiming(task).pending).length;
  };

  const compareMachineDefaultPriority = (a, b) => {
    const statusRank = (machine) => {
      const status = normalizeStatus(machine.status);
      if (status === "fuera_de_servicio") return 0;
      if (status === "desconectada") return 2;
      return 1;
    };
    const statusDiff = statusRank(a) - statusRank(b);
    if (statusDiff) return statusDiff;
    const aPending = getPendingTaskCount(a);
    const bPending = getPendingTaskCount(b);
    if (aPending !== bPending) return bPending - aPending;
    return 0;
  };

  const buildInitialGroupPriorityOrder = (machines) => {
    const layout = normalizeDashboardLayout(state.dashboardLayout);
    const groups = layout.groups || [];
    const placements = layout.placements || {};
    const validGroupIds = new Set(groups.map((group) => group.id));
    const grouped = new Map();
    (machines || []).forEach((machine) => {
      const groupId = placements[machine.id]?.groupId || "";
      if (!validGroupIds.has(groupId)) return;
      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(machine);
    });
    const orderByGroup = {};
    grouped.forEach((groupMachines, groupId) => {
      orderByGroup[groupId] = {};
      groupMachines
        .slice()
        .sort((a, b) => {
          const priority = compareMachineDefaultPriority(a, b);
          if (priority !== 0) return priority;
          const aPlacement = placements[a.id] || {};
          const bPlacement = placements[b.id] || {};
          return (aPlacement.order ?? a.order ?? 0) - (bPlacement.order ?? b.order ?? 0);
        })
        .forEach((machine, index) => {
          orderByGroup[groupId][machine.id] = index;
        });
    });
    state.initialGroupPriorityOrder = orderByGroup;
    state.initialGroupPriorityReady = true;
  };

  const clearInitialGroupPriorityOrder = (groupId = "") => {
    if (!state.initialGroupPriorityOrder) return;
    if (groupId) {
      delete state.initialGroupPriorityOrder[groupId];
      return;
    }
    state.initialGroupPriorityOrder = {};
  };

  const localWriteAt = new Map();
  const pendingLocalWrites = new Set();
  const markLocalWrite = (machineId) => {
    if (!machineId) return;
    pendingLocalWrites.add(machineId);
    localWriteAt.set(machineId, Date.now());
  };
  const clearLocalWrite = (machineId) => {
    if (!machineId) return;
    pendingLocalWrites.delete(machineId);
  };
  const isRecentLocalWrite = (machineId, windowMs = 1500) => {
    if (!machineId) return false;
    if (pendingLocalWrites.has(machineId)) return true;
    const ts = localWriteAt.get(machineId);
    return typeof ts === "number" && Date.now() - ts < windowMs;
  };

  const rebuildCombined = async ({ preserveScroll = true } = {}) => {
    const token = ++rebuildToken;
    const combined = [...(state.ownerMachines || []), ...(state.adminMachines || [])];
    const orderCache = loadOrderCache();
    const withOrder = combined.map((m) =>
      Object.prototype.hasOwnProperty.call(orderCache, m.id)
        ? { ...m, order: orderCache[m.id] }
        : m
    );
    const merged = await mergeOperationalFromTag(withOrder);
    if (token !== rebuildToken) return;
    if (!state.initialGroupPriorityReady) {
      buildInitialGroupPriorityOrder(merged);
    }
    setRemote(merged);
    renderCards({ preserveScroll });
  };

  const scheduleRebuild = (options = {}) => {
    pendingRebuildOptions = options;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      rebuildCombined(pendingRebuildOptions);
    }, 160);
  };

  const getDashboardSubscriptions = () => {
    if (!dashboardSubscriptions) {
      dashboardSubscriptions = createDashboardSubscriptions({
        state,
        updateLoading,
        scheduleRebuild,
        renderCards,
        renderInviteBanner,
        renderTopbarNotifications,
        isRecentLocalWrite
      });
    }
    return dashboardSubscriptions;
  };

  return {
    applyOperationalPatch,
    clearLocalWrite,
    clearInitialGroupPriorityOrder,
    clearRebuildTimer,
    cleanupSubscriptions,
    getDashboardSubscriptions,
    getDraftById,
    getDraftIndex,
    getKnownMachineIds,
    getNextGroupTitle,
    getPendingTaskCount,
    isRecentLocalWrite,
    markLocalWrite,
    normalizeDashboardLayout,
    rebuildCombined,
    saveDashboardLayout,
    scheduleRebuild,
    syncMachineAccessListeners
  };

};
