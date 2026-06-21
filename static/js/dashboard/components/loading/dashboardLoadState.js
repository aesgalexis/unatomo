export const resetDashboardLoadState = (state) => {
  state.ownerReady = false;
  state.adminReady = false;
  state.ownerLoadFailed = false;
  state.adminLoadFailed = false;
  state.loadTimedOut = false;
  state.loading = true;
};

export const getDashboardLoadProgress = (state) => {
  const total = 3;
  const ready =
    (state.stylesReady ? 1 : 0) +
    (state.ownerReady ? 1 : 0) +
    (state.adminReady ? 1 : 0);
  return {
    ready,
    total,
    percent: Math.round((ready / total) * 100),
    complete: ready >= total
  };
};

export const hasDashboardLoadError = (state) =>
  !!(state.ownerLoadFailed || state.adminLoadFailed || state.loadTimedOut);

export const markDashboardLoadTimeout = (state) => {
  state.loadTimedOut = true;
  if (!state.ownerReady) {
    state.ownerReady = true;
    state.ownerLoadFailed = true;
  }
  if (!state.adminReady) {
    state.adminReady = true;
    state.adminLoadFailed = true;
  }
};

export const markDashboardLoadFailure = (state) => {
  state.ownerLoadFailed = true;
  state.adminLoadFailed = true;
  state.ownerReady = true;
  state.adminReady = true;
};

export const markOwnerLoadSuccess = (state) => {
  state.ownerLoadFailed = false;
  state.loadTimedOut = false;
  if (!state.ownerReady) state.ownerReady = true;
};

export const markOwnerLoadFailure = (state) => {
  state.ownerLoadFailed = true;
  if (!state.ownerReady) state.ownerReady = true;
};

export const markAdminLoadSuccess = (state) => {
  state.adminLoadFailed = false;
  state.loadTimedOut = false;
  if (!state.adminReady) state.adminReady = true;
};

export const markAdminLoadFailure = (state) => {
  state.adminLoadFailed = true;
  if (!state.adminReady) state.adminReady = true;
};
