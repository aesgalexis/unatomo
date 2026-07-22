export const createDashboardSession = (dependencies) => {
  const {
    applyDashboardTitle,
    armLoadingGuard,
    ensureAdminLink,
    ensureGroupedDragAndDrop,
    fetchAdminMachines,
    fetchDashboardLayout,
    fetchInvitesForAdmin,
    fetchLegacyMachines,
    fetchMachines,
    getActiveDashboardUid,
    getDashboardSessionVersion,
    getDashboardSubscriptions,
    initDashboardTitleEditor,
    loadSuggestions,
    loadTodoCollaborators,
    loadTodos,
    markAdminLoadFailure,
    markAdminLoadSuccess,
    markOwnerLoadFailure,
    markOwnerLoadSuccess,
    migrateLegacyMachines,
    normalizeDashboardLayout,
    normalizeEmail,
    normalizeMachine,
    normalizeTabOrder,
    refreshStorageFullState,
    renderCards,
    resetDashboardRuntime,
    resetInitialMobileScroll,
    scheduleRebuild,
    state,
    t,
    updateLoading,
    upsertAccountDirectory,
    upsertDashboardLayout,
    withTimeout,
  } = dependencies;
  const initDashboard = async (uid, user, sessionVersion) => {
    const isActiveSession = () =>
      getActiveDashboardUid() === uid &&
      getDashboardSessionVersion() === sessionVersion;
    resetDashboardRuntime(uid);
    state.uid = uid;
    state.adminLabel = user.displayName || user.email || t("dashboard.admin", "Administrador");
    state.adminEmail = user.email || "";
    resetInitialMobileScroll();
    refreshStorageFullState(uid);
    armLoadingGuard();
    try {
      await upsertAccountDirectory(user);
    } catch {
      // ignore directory write errors
    }
    if (!isActiveSession()) return;
    try {
      state.dashboardLayout = normalizeDashboardLayout(await fetchDashboardLayout(uid));
    } catch {
      state.dashboardLayout = {
        groups: [],
        placements: {},
        tabOrder: normalizeTabOrder(),
        dashboardTitle: "",
        registrySeenAt: "",
        suggestionsSeenAt: "",
        machineViewMode: "grouped",
        groupPresentationMode: "tree",
        machineSortMode: "manual"
      };
    }
    if (!isActiveSession()) return;
    if (!state.dashboardLayout.registrySeenAt) {
      state.dashboardLayout.registrySeenAt = new Date().toISOString();
      upsertDashboardLayout(uid, {
        registrySeenAt: state.dashboardLayout.registrySeenAt
      }).catch(() => {});
    }
    if (state.isSuperadmin && !state.dashboardLayout.suggestionsSeenAt) {
      state.dashboardLayout.suggestionsSeenAt = new Date().toISOString();
      upsertDashboardLayout(uid, {
        suggestionsSeenAt: state.dashboardLayout.suggestionsSeenAt
      }).catch(() => {});
    }
    applyDashboardTitle();
    initDashboardTitleEditor();
    loadSuggestions({ preserveScroll: false });
    loadTodos({ preserveScroll: false });
    loadTodoCollaborators();

    let ownerFetchResolved = false;
    let ownerBootstrap = [];
    try {
      const remote = await withTimeout(fetchMachines(uid));
      markOwnerLoadSuccess(state);
      ownerFetchResolved = true;
      ownerBootstrap = remote
        .map((m, idx) => normalizeMachine(m, idx))
        .filter(Boolean)
        .map((m) => ({
          ...m,
          tenantId: uid,
          role: "owner",
          ownerEmail: state.adminEmail || ""
      }));
      if (!remote.length) {
        const legacy = await withTimeout(fetchLegacyMachines(uid));
        if (legacy.length) {
          await withTimeout(migrateLegacyMachines(uid, legacy));
        }
      }
    } catch {
      markOwnerLoadFailure(state);
      updateLoading();
    }
    if (!isActiveSession()) return;

    const emailLower = normalizeEmail(user.email || "");
    if (ownerFetchResolved) {
      state.ownerMachines = ownerBootstrap;
      markOwnerLoadSuccess(state);
      updateLoading();
    }
    try {
      const adminBootstrap = await withTimeout(fetchAdminMachines(uid, emailLower));
      markAdminLoadSuccess(state);
      state.adminMachines = adminBootstrap;
      updateLoading();
    } catch {
      markAdminLoadFailure(state);
      updateLoading();
    }
    if (!isActiveSession()) return;
    scheduleRebuild({ preserveScroll: false });
    const subscriptions = getDashboardSubscriptions();
    subscriptions.subscribeOwnerMachines(uid);
    subscriptions.subscribeAdminLinks(uid);
    subscriptions.subscribePendingInvites(emailLower);
    subscriptions.subscribePendingTransferInvites(uid);
    try {
      const acceptedInvites = await fetchInvitesForAdmin(emailLower, "accepted");
      await Promise.all(
        acceptedInvites.map((invite) => ensureAdminLink(invite.id))
      );
    } catch {
      // ignore invite ensure failures
    }
    if (!isActiveSession()) return;
    renderCards();
    resetInitialMobileScroll();
    ensureGroupedDragAndDrop();
  };

  return { initDashboard };
};
