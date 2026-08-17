export const createDashboardTopbarController = (dependencies) => {
  const {
    addBar,
    addBtn,
    applyDashboardTitle,
    calculateStorageUsage,
    dashboardLink,
    galleryLink,
    statisticsLink,
    getStorageFullText,
    handleInviteDecision,
    resendVerificationEmail,
    handleTransferDecision,
    inviteBanner,
    notifyTopbar,
    registryLink,
    searchInput,
    setTopbarNotifications,
    state,
    STORAGE_LIMIT_BYTES,
    suggestionsLink,
    t,
    todoLink,
    usersLink,
    viewMenu,
  } = dependencies;
  const syncDashboardViewChrome = () => {
    applyDashboardTitle();
    const isRegistry = state.activeView === "registro";
    const isGallery = state.activeView === "galeria";
    const isStatistics = state.activeView === "estadisticas";
    const isSuggestions = state.activeView === "sugerencias";
    const isTodo = state.activeView === "todo";
    const isUsers = state.activeView === "usuarios";
    const isNotifications = state.activeView === "notificaciones";
    const isPrivacy = state.activeView === "privacidad";
    const isHelp = state.activeView === "ayuda";
    const useGallerySizeMenu = isGallery && window.matchMedia("(max-width: 768px)").matches;
    viewMenu.setGalleryMode(useGallerySizeMenu);
    viewMenu.setStatisticsMode(isStatistics, { period: state.statisticsPeriod });
    dashboardLink.classList.toggle("is-active", !isRegistry && !isGallery && !isStatistics && !isSuggestions && !isTodo && !isUsers && !isNotifications && !isPrivacy && !isHelp);
    registryLink.classList.toggle("is-active", isRegistry);
    galleryLink.classList.toggle("is-active", isGallery);
    statisticsLink.classList.toggle("is-active", isStatistics);
    suggestionsLink.classList.toggle("is-active", isSuggestions);
    todoLink.classList.toggle("is-active", isTodo);
    usersLink.classList.toggle("is-active", isUsers);
    if (isRegistry) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.setAttribute("aria-current", "page");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    } else if (isGallery) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.setAttribute("aria-current", "page");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    } else if (isStatistics) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.setAttribute("aria-current", "page");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    } else if (isSuggestions) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.setAttribute("aria-current", "page");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    } else if (isTodo) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.setAttribute("aria-current", "page");
      usersLink.removeAttribute("aria-current");
    } else if (isUsers) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.setAttribute("aria-current", "page");
    } else if (isNotifications || isPrivacy || isHelp) {
      dashboardLink.removeAttribute("aria-current");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    } else {
      dashboardLink.setAttribute("aria-current", "page");
      registryLink.removeAttribute("aria-current");
      galleryLink.removeAttribute("aria-current");
      statisticsLink.removeAttribute("aria-current");
      suggestionsLink.removeAttribute("aria-current");
      todoLink.removeAttribute("aria-current");
      usersLink.removeAttribute("aria-current");
    }
    addBar.classList.toggle("is-registry-view", isRegistry || isGallery || isStatistics || isSuggestions || isTodo);
    addBar.classList.toggle("is-gallery-view", isGallery);
    addBar.classList.toggle("is-statistics-view", isStatistics);
    addBar.classList.toggle("is-todo-view", isTodo);
    addBar.classList.toggle("is-suggestions-view", isSuggestions);
    addBar.classList.toggle("is-privacy-view", isPrivacy);
    addBar.classList.toggle("is-help-view", isHelp);
    addBar.classList.toggle("is-notifications-view", isNotifications);
    if (inviteBanner) {
      const showInviteBanner = state.activeView === "dashboard" && state.pendingInvites?.length;
      inviteBanner.hidden = !showInviteBanner;
      inviteBanner.style.display = showInviteBanner ? "flex" : "none";
    }
    searchInput.placeholder = isRegistry
      ? t("dashboard.registrySearchPlaceholder", "Buscar en registro...")
      : isGallery
        ? t("dashboard.gallerySearchPlaceholder", "Buscar en galer\u00eda...")
        : isStatistics
          ? t("dashboard.statisticsSearchPlaceholder", "Buscar en estadísticas...")
        : isSuggestions
          ? t("dashboard.suggestionsSearchPlaceholder", "Buscar sugerencias...")
          : isTodo
            ? t("dashboard.todoSearchPlaceholder", "Buscar tareas...")
            : isUsers
              ? t("dashboard.usersSearchPlaceholder", "Buscar usuarios...")
            : isNotifications
              ? t("dashboard.notificationsSearchPlaceholder", "Buscar notificaciones...")
              : t("dashboard.searchPlaceholder", "Buscar por nombre o ubicaci\u00f3n...");
    const addDisabled = state.loading || isRegistry || isStatistics || isNotifications || isPrivacy || isHelp;
    const viewMenuDisabled = state.loading || isRegistry ||
      (isGallery && !useGallerySizeMenu) || isSuggestions || isUsers || isNotifications || isPrivacy || isHelp;
    const searchDisabled = state.loading || isNotifications || isPrivacy || isHelp;
    addBtn.disabled = addDisabled;
    searchInput.disabled = searchDisabled;
    viewMenu.button.disabled = viewMenuDisabled;
    addBtn.setAttribute("aria-disabled", addDisabled ? "true" : "false");
    searchInput.setAttribute("aria-disabled", searchDisabled ? "true" : "false");
    viewMenu.button.setAttribute("aria-disabled", viewMenuDisabled ? "true" : "false");
    addBtn.setAttribute(
      "aria-label",
      isUsers
        ? t("dashboard.usersAddAria", "Añadir usuario")
        : isGallery
          ? t("dashboard.galleryUploadAddAria", "Subir archivo a un equipo")
        : isSuggestions
          ? t("dashboard.suggestionsAddAria", "Escribir sugerencia")
          : t("dashboard.addAria", "Añadir")
    );
  };

  const getNotifications = ({includeRead = false} = {}) => {
    const items = [];
    if (state.emailVerified === false) {
      items.push({
        id: "verify-email",
        kind: "account",
        persistent: true,
        text: t("dashboard.verifyEmailNotice", "Verifica tu correo para proteger tu cuenta y habilitar las acciones de seguridad."),
        actions: [{
          label: t("dashboard.resendVerification", "Reenviar correo"),
          className: "mc-location-accept",
          onClick: () => resendVerificationEmail()
        }]
      });
    }
    if (state.storageFull) {
      items.push({
        id: "storage-full",
        kind: "system",
        persistent: true,
        text: getStorageFullText()
      });
    }
    const invites = Array.isArray(state.pendingInvites) ? state.pendingInvites : [];
    const inviteGroups = new Map();
    invites.forEach((invite) => {
      const owner = invite.ownerEmail || t("dashboard.anonymousUser", "Un usuario");
      const key = invite.ownerUid || owner;
      if (!inviteGroups.has(key)) inviteGroups.set(key, { owner, invites: [] });
      inviteGroups.get(key).invites.push(invite);
    });
    inviteGroups.forEach(({ owner, invites: groupInvites }, groupKey) => {
      const resolveAll = async (decision) => {
        for (const invite of groupInvites) await handleInviteDecision(invite, decision);
      };
      items.push({
        id: `admin-invites-${groupKey}`,
        kind: "access",
        text: groupInvites.length === 1
          ? t("dashboard.inviteManageMachine", (value, machine) => `${value} quiere que administres “${machine}”`)(owner, groupInvites[0].machineTitle || t("machine.machine", "Equipo"))
          : t("dashboard.inviteManage", (value, total) => `${value} quiere que administres ${total} equipos`)(owner, groupInvites.length),
        actions: [
          { label: groupInvites.length > 1 ? t("dashboard.acceptAll", (count) => `Aceptar todos (${count})`)(groupInvites.length) : t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => resolveAll("accepted") },
          { label: groupInvites.length > 1 ? t("dashboard.rejectAll", "Rechazar todos") : t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => resolveAll("rejected") }
        ],
        children: groupInvites.length > 1 ? groupInvites.map((invite) => ({
          id: invite.id,
          text: invite.machineTitle || t("machine.machine", "Equipo"),
          actions: [
            { label: t("card.accept", "Aceptar"), className: "mc-location-accept", onClick: () => handleInviteDecision(invite, "accepted") },
            { label: t("dashboard.reject", "Rechazar"), className: "mc-location-cancel", onClick: () => handleInviteDecision(invite, "rejected") }
          ]
        })) : []
      });
    });
    const transferInvites = Array.isArray(state.pendingTransferInvites) ? state.pendingTransferInvites : [];
    transferInvites.forEach((invite) => {
      const ownerLabel = invite.fromOwnerEmail || t("dashboard.anonymousUser", "Un usuario");
      const machineTitle = invite.machineTitle || t("machine.machine", "Equipo");
      items.push({
        id: `transfer-invite-${invite.id}`,
        kind: "access",
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
    const persistent = Array.isArray(state.persistentNotifications)
      ? state.persistentNotifications
      : [];
    persistent
      .filter((notification) => includeRead || !notification.readAt)
      .forEach((notification) => {
        const actor = notification.actorLabel || t("dashboard.anonymousUser", "Un usuario");
        const machine = notification.machineTitle || t("machine.machine", "Equipo");
        const messages = {
          admin_invite_accepted: t("dashboard.notificationAdminAccepted", (value, equipment) => `${value} ha aceptado administrar “${equipment}”`)(actor, machine),
          admin_invite_rejected: t("dashboard.notificationAdminRejected", (value, equipment) => `${value} ha rechazado administrar “${equipment}”`)(actor, machine),
          admin_access_removed: t("dashboard.notificationAdminRemoved", (equipment) => `Ya no administras “${equipment}”`)(machine),
          admin_left_machine: t("dashboard.notificationAdminLeft", (value, equipment) => `${value} ha dejado de administrar “${equipment}”`)(actor, machine),
          transfer_accepted: t("dashboard.notificationTransferAccepted", (value, equipment) => `${value} ha aceptado la transferencia de “${equipment}”`)(actor, machine),
          transfer_rejected: t("dashboard.notificationTransferRejected", (value, equipment) => `${value} ha rechazado la transferencia de “${equipment}”`)(actor, machine),
          transfer_canceled: t("dashboard.notificationTransferCanceled", (equipment) => `Se ha cancelado la transferencia de “${equipment}”`)(machine),
          task_assigned: t("dashboard.notificationTaskAssigned", (task, equipment) => `Se te ha asignado “${task}” en “${equipment}”`)(notification.taskTitle || t("tasks.task", "Tarea"), machine)
        };
        const message = messages[notification.type];
        if (!message) return;
        items.push({
          id: notification.id,
          kind: notification.type === "task_assigned" ? "task" : "access",
          text: message,
          read: !!notification.readAt,
          createdAt: notification.createdAt,
          actions: notification.type === "task_assigned" ? [{
            label: t("dashboard.notificationOpenTasks", "Ver tareas"),
            className: "mc-location-accept",
            onClick: () => { window.location.hash = document.documentElement.lang === "en" ? "#/tasks" : "#/tareas"; }
          }] : []
        });
      });
    return items;
  };

  const renderTopbarNotifications = () => {
    setTopbarNotifications(getNotifications());
    window.dispatchEvent(new CustomEvent("unatomo:notifications-changed"));
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
    getNotifications,
    renderTopbarNotifications,
    syncDashboardViewChrome
  };

};
