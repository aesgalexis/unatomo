import { normalizeDashboardTitle } from "../layout/dashboardLayoutModel.mjs";

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
  const initDashboard = async (uid, user, sessionVersion, profile = null) => {
    const isActiveSession = () =>
      getActiveDashboardUid() === uid &&
      getDashboardSessionVersion() === sessionVersion;
    resetDashboardRuntime(uid);
    state.uid = uid;
    state.adminLabel = user.displayName || user.email || t("dashboard.admin", "Administrador");
    state.adminEmail = user.email || "";
    state.emailVerified = user.emailVerified === true;
    resetInitialMobileScroll();
    refreshStorageFullState(uid);
    armLoadingGuard();

    const emailLower = normalizeEmail(user.email || "");
    const machinesBootstrapPromise = Promise.allSettled([
      withTimeout(fetchMachines(uid)),
      withTimeout(fetchAdminMachines(uid, emailLower))
    ]);
    upsertAccountDirectory(user).catch((error) => {
      console.warn("Dashboard account directory sync failed", error);
    });

    if (!isActiveSession()) return;
    try {
      state.dashboardLayout = normalizeDashboardLayout(
        await withTimeout(fetchDashboardLayout(uid))
      );
    } catch (error) {
      console.warn("Dashboard layout bootstrap failed", error);
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
    const companyTitle = normalizeDashboardTitle(
      profile?.company || profile?.companyName || ""
    );
    if (state.dashboardLayout.dashboardTitle !== companyTitle) {
      state.dashboardLayout.dashboardTitle = companyTitle;
      upsertDashboardLayout(uid, { dashboardTitle: companyTitle }).catch(() => {});
    }
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
    const subscriptions = getDashboardSubscriptions();
    subscriptions.subscribeOwnerMachines(uid);
    subscriptions.subscribeAdminLinks(uid);
    subscriptions.subscribePendingInvites(emailLower);
    subscriptions.subscribePendingTransferInvites(uid);
    subscriptions.subscribeNotifications(uid);
    dependencies.renderInviteBanner();
    applyDashboardTitle();
    loadSuggestions({ preserveScroll: false });
    loadTodos({ preserveScroll: false });
    loadTodoCollaborators();

    let ownerFetchResolved = false;
    let ownerBootstrap = [];
    const [ownerResult, adminResult] = await machinesBootstrapPromise;
    if (ownerResult.status === "fulfilled") {
      const remote = ownerResult.value;
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
        try {
          const legacy = await withTimeout(fetchLegacyMachines(uid));
          if (legacy.length) {
            await withTimeout(migrateLegacyMachines(uid, legacy));
          }
        } catch (error) {
          console.warn("Dashboard legacy machines migration check failed", error);
        }
      }
    } else {
      console.warn("Dashboard owner machines bootstrap failed", ownerResult.reason);
      if (!state.ownerReady) {
        markOwnerLoadFailure(state);
        updateLoading();
      }
    }
    if (!isActiveSession()) return;

    if (ownerFetchResolved) {
      state.ownerMachines = ownerBootstrap;
      markOwnerLoadSuccess(state);
      updateLoading();
    }
    if (adminResult.status === "fulfilled") {
      const adminBootstrap = adminResult.value;
      markAdminLoadSuccess(state);
      state.adminMachines = adminBootstrap;
      updateLoading();
    } else {
      console.warn("Dashboard admin machines bootstrap failed", adminResult.reason);
      if (!state.adminReady) {
        markAdminLoadFailure(state);
        updateLoading();
      }
    }
    if (!isActiveSession()) return;
    scheduleRebuild({ preserveScroll: false });
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
