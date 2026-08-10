export const installDashboardAuthController = ({
  auth,
  cleanupDashboardSubscriptions,
  clearDashboardTimer,
  getUserRegistrationState,
  isAccountOnboardingRequired,
  initDashboard,
  isControlPanelUser,
  isPublicSectionHash,
  markDashboardLoadFailure,
  mount,
  onAuthStateChanged,
  onboardingUrl,
  redirectToEntry,
  renderCards,
  runtime,
  scrollSuggestionsViewToTop,
  setupUrl,
  state,
  updateLoading
}) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      runtime.activeUid = "";
      runtime.initPromise = null;
      runtime.version += 1;
      clearDashboardTimer();
      cleanupDashboardSubscriptions();
      if (isPublicSectionHash()) {
        mount.hidden = true;
        return;
      }
      redirectToEntry();
      return;
    }
    try {
      const registration = await getUserRegistrationState(user);
      if (!registration.allowed) {
        window.location.href = setupUrl;
        return;
      }
      if (isAccountOnboardingRequired(registration)) {
        window.location.replace(onboardingUrl);
        return;
      }
      state.canSuggest = true;
      state.isSuperadmin = await isControlPanelUser(user);
    } catch {
      window.location.href = setupUrl;
      return;
    }
    if (runtime.activeUid === user.uid && runtime.initPromise) return;
    if (
      runtime.activeUid === user.uid &&
      !state.loading &&
      !state.ownerLoadFailed &&
      !state.adminLoadFailed
    ) return;

    runtime.activeUid = user.uid;
    const sessionVersion = ++runtime.version;
    runtime.initPromise = initDashboard(user.uid, user, sessionVersion)
      .then(() => {
        if (runtime.version === sessionVersion && state.activeView === "sugerencias") {
          scrollSuggestionsViewToTop();
        }
      })
      .catch(() => {
        if (runtime.version !== sessionVersion) return;
        markDashboardLoadFailure(state);
        updateLoading();
        renderCards({ preserveScroll: false });
      })
      .finally(() => {
        if (runtime.version === sessionVersion) runtime.initPromise = null;
      });
  });
};
