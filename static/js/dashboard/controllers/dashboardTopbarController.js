export const createDashboardTopbarController = (dependencies) => {
  const {
    addBar,
    addBtn,
    applyDashboardTitle,
    calculateStorageUsage,
    dashboardLink,
    getStorageFullText,
    handleInviteDecision,
    handleTransferDecision,
    notifyTopbar,
    registryLink,
    searchInput,
    setTopbarNotifications,
    state,
    STORAGE_LIMIT_BYTES,
    suggestionsLink,
    t,
    todoLink,
    viewMenu,
  } = dependencies;
  const syncDashboardViewChrome = () => {
    applyDashboardTitle();
    const isRegistry = state.activeView === "registro";
    const isSuggestions = state.activeView === "sugerencias";
    const isTodo = state.activeView === "todo";
    dashboardLink.classList.toggle("is-active", !isRegistry && !isSuggestions && !isTodo);
    registryLink.classList.toggle("is-active", isRegistry);
    suggestionsLink.classList.toggle("is-active", isSuggestions);
    todoLink.classList.toggle("is-active", isTodo);
    if (isRegistry) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.setAttribute("aria-current", "page");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
    } else if (isSuggestions) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.setAttribute("aria-current", "page");
      todoLink.removeAttribute("aria-current");
    } else if (isTodo) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.setAttribute("aria-current", "page");
    } else {
      dashboardLink.setAttribute("aria-current", "page");
      registryLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
    }
    addBar.classList.toggle("is-registry-view", isRegistry || isSuggestions || isTodo);
    searchInput.placeholder = isRegistry
      ? t("dashboard.registrySearchPlaceholder", "Buscar en registro...")
      : isSuggestions
        ? t("dashboard.suggestionsSearchPlaceholder", "Buscar sugerencias...")
        : isTodo
          ? t("dashboard.todoSearchPlaceholder", "Buscar pendientes...")
          : t("dashboard.searchPlaceholder", "Buscar por nombre o ubicación...");
    const primaryControlsDisabled = state.loading || isRegistry || isSuggestions || isTodo;
    const searchDisabled = state.loading;
    addBtn.disabled = primaryControlsDisabled;
    searchInput.disabled = searchDisabled;
    viewMenu.button.disabled = primaryControlsDisabled;
    addBtn.setAttribute("aria-disabled", primaryControlsDisabled ? "true" : "false");
    searchInput.setAttribute("aria-disabled", searchDisabled ? "true" : "false");
    viewMenu.button.setAttribute("aria-disabled", primaryControlsDisabled ? "true" : "false");
  };

  const renderTopbarNotifications = () => {
    const items = [];
    if (state.storageFull) {
      items.push({
        id: "storage-full",
        persistent: true,
        text: getStorageFullText()
      });
    }
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    const formatInviteText = (ownerLabel, count) =>
      t("dashboard.inviteManage", (value, total) => `${value} wants you to manage ${total} machines`)(
        ownerLabel,
        count
      );
    invites.forEach((invite) => {
      items.push({
        text: formatInviteText(invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario"), 1),
        actions: [
          { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleInviteDecision(invite, "accepted") },
          { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleInviteDecision(invite, "rejected") }
        ]
      });
    });
    const transferInvites = Array.isArray(state.pendingTransferInvites) ? state.pendingTransferInvites : [];
    transferInvites.forEach((invite) => {
      const ownerLabel = invite.fromOwnerEmail || t("dashboard.anonymousUser", "Un usuario");
      const machineTitle = invite.machineTitle || t("machine.machine", "Equipo");
      items.push({
        text: t(
          "dashboard.transferReceive",
          (owner, machine) => `${owner} quiere transferirte ${machine}`
        )(ownerLabel, machineTitle),
        actions: [
          { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleTransferDecision(invite, "accepted") },
          { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleTransferDecision(invite, "rejected") }
        ]
      });
    });
    setTopbarNotifications(items);
  };

  const refreshStorageFullState = async (uid = state.uid) => {
    if (!uid) return false;
    try {
      const usage = await calculateStorageUsage(uid);
      state.storageFull = usage.totalBytes >= usage.limitBytes;
      renderTopbarNotifications();
      return state.storageFull;
    } catch {
      return state.storageFull;
    }
  };

  const assertStorageAvailable = async (uid = state.uid, additionalBytes = 0) => {
    if (!uid) throw new Error("no-auth");
    const usage = await calculateStorageUsage(uid);
    const full = usage.totalBytes + Math.max(0, Number(additionalBytes) || 0) >= STORAGE_LIMIT_BYTES;
    state.storageFull = usage.totalBytes >= usage.limitBytes;
    if (full) {
      state.storageFull = true;
      renderTopbarNotifications();
      notifyTopbar(t("dashboard.storageFullAction", "Almacenamiento lleno"));
      throw new Error("storage-full");
    }
    renderTopbarNotifications();
    return usage;
  };
  return {
    assertStorageAvailable,
    refreshStorageFullState,
    renderTopbarNotifications,
    syncDashboardViewChrome
  };

};
