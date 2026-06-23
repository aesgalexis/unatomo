import { installMachineCardCoreHooks } from "./hooks/machineCardCoreHooks.js";
import { installMachineCardManagementHooks } from "./hooks/machineCardManagementHooks.js";
import { installMachineCardTagHooks } from "./hooks/machineCardTagHooks.js";
import { installMachineCardUserHooks } from "./hooks/machineCardUserHooks.js";

export const renderMachineCards = (dependencies) => {
  const {
    addUserWithRegistry,
    assertStorageAvailable,
    assignTag,
    autoSave,
    buildAddTaskAttachmentsUpdate,
    buildMachineTagUrl,
    buildStatusToggleUpdate,
    cancelMachineTransferInvite,
    cardRefs,
    clearMobileDetailState,
    collapseCard,
    createAdminInvite,
    createMachineCard,
    createMachineTransferInvite,
    createTagToken,
    deleteMachine,
    deleteUserRegistry,
    disconnectMachineTag,
    expandCard,
    expandedById,
    fetchMachine,
    fetchMachines,
    generateMachineTagQr,
    generateSaltBase64,
    getAdminDisplayName,
    getCollapsedHeightPx,
    getCurrentLang,
    getDraftById,
    groupTargets,
    hashPassword,
    installDocumentHooks,
    installTaskHooks,
    isMobileDashboardViewport,
    isOwnerMachine,
    layoutPlacements,
    leaveAdminRole,
    list,
    markLocalWrite,
    normalizeEmail,
    normalizeLocation,
    normalizeMachine,
    normalizeStatus,
    notifyTopbar,
    openStatusIncidentModal,
    pendingStatusIncidentMachineIds,
    query,
    recalcHeight,
    refreshStorageFullState,
    removeMachineFromState,
    renderCards,
    renderGroup,
    replaceMachine,
    RESTORE_OPERATION_TASK_SOURCE,
    revokeAdminInvite,
    scheduleHeightSync,
    selectedTabById,
    sortedVisibleMachines,
    state,
    syncMobileDetailUI,
    t,
    updateMachine,
    updateSaveState,
    upsertMachine,
    upsertMachineAccessFromMachine,
    useGroupedLayout,
    validateTag,
    validGroupIds,
  } = dependencies;
    sortedVisibleMachines.forEach((machine) => {
        if (machine.tagId && !state.tagStatusById[machine.id]) {
          state.tagStatusById[machine.id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
        }
        if ((machine.role || "owner") === "admin") {
          const nextAdminName = (state.adminLabel || "").trim();
          if (nextAdminName && machine.adminName !== nextAdminName) {
            updateMachine(machine.id, { adminName: nextAdminName });
            machine.adminName = nextAdminName;
            autoSave.scheduleSave(machine.id, "admin-name");
          }
        }
        const adminDisplayName = machine.adminName
          ? machine.adminName
          : machine.adminEmail
            ? getAdminDisplayName(machine.adminEmail)
            : "";
        const ownerDisplayName = machine.ownerEmail
          ? getAdminDisplayName(machine.ownerEmail)
          : "";
        const isExpanded = expandedById.has(machine.id);
        const { card, hooks } = createMachineCard(machine, {
          tagStatus: state.tagStatusById[machine.id],
          adminLabel: state.adminLabel,
          adminDisplayName,
          ownerDisplayName,
          mode: "dashboard",
          role: machine.role || "owner",
          disableDrag: query.length > 0,
          canEditTasks: true,
          canCompleteTasks: true,
          canEditStatus: true,
          canEditGeneral: true,
          canEditLocation: true,
          canDownloadHistory: true,
          canEditConfig: true,
          visibleTabs: ["quehaceres", "historial", "general", "configuracion"],
          tabOrder: state.dashboardLayout.tabOrder,
          userRoles: ["usuario", "tecnico", "externo"],
          createdBy: state.adminLabel || null,
          operationalSource: machine._operationalSource || "local",
          locations: state.locations,
          knownUsers: state.knownUsers
        });
        if (isExpanded) {
          card.dataset.expanded = "true";
          card.classList.add("mc-no-anim");
          card.style.maxHeight = "none";
        } else {
          card.style.maxHeight = `${getCollapsedHeightPx()}px`;
        }

        installMachineCardCoreHooks({
          assertStorageAvailable,
          autoSave,
          buildAddTaskAttachmentsUpdate,
          buildStatusToggleUpdate,
          clearMobileDetailState,
          collapseCard,
          expandCard,
          expandedById,
          getDraftById,
          hooks,
          installDocumentHooks,
          isMobileDashboardViewport,
          list,
          machine,
          normalizeLocation,
          normalizeStatus,
          notifyTopbar,
          openStatusIncidentModal,
          pendingStatusIncidentMachineIds,
          recalcHeight,
          refreshStorageFullState,
          renderCards,
          replaceMachine,
          RESTORE_OPERATION_TASK_SOURCE,
          scheduleHeightSync,
          state,
          syncMobileDetailUI,
          t,
          updateMachine,
          updateSaveState,
          upsertMachine,
        });
        installMachineCardTagHooks({
          assertStorageAvailable,
          assignTag,
          autoSave,
          buildMachineTagUrl,
          card,
          createTagToken,
          disconnectMachineTag,
          expandedById,
          generateMachineTagQr,
          getCurrentLang,
          getDraftById,
          hooks,
          machine,
          markLocalWrite,
          notifyTopbar,
          recalcHeight,
          refreshStorageFullState,
          renderCards,
          scheduleHeightSync,
          state,
          t,
          updateMachine,
          upsertMachine,
          upsertMachineAccessFromMachine,
          validateTag,
        });
        installMachineCardUserHooks({
          addUserWithRegistry,
          autoSave,
          card,
          deleteUserRegistry,
          expandedById,
          fetchMachines,
          generateSaltBase64,
          getDraftById,
          hashPassword,
          hooks,
          machine,
          recalcHeight,
          renderCards,
          scheduleHeightSync,
          state,
          t,
          updateMachine,
          updateSaveState,
          upsertMachineAccessFromMachine,
        });
        installMachineCardManagementHooks({
          autoSave,
          cancelMachineTransferInvite,
          createAdminInvite,
          createMachineTransferInvite,
          deleteMachine,
          expandedById,
          fetchMachine,
          getDraftById,
          hooks,
          installTaskHooks,
          isOwnerMachine,
          leaveAdminRole,
          list,
          normalizeEmail,
          normalizeMachine,
          normalizeStatus,
          notifyTopbar,
          removeMachineFromState,
          renderCards,
          revokeAdminInvite,
          state,
          t,
          updateMachine,
        });
        hooks.onContentResize = () => {
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
        };

        const targetGroupId = useGroupedLayout && validGroupIds.has(layoutPlacements[machine.id]?.groupId)
          ? layoutPlacements[machine.id]?.groupId || ""
          : "";
        if (targetGroupId) renderGroup(targetGroupId);
        const target = groupTargets.get(targetGroupId) || groupTargets.get("") || list;
        if (targetGroupId) {
          const cardWrap = document.createElement("div");
          cardWrap.className = "machine-card-wrap";
          cardWrap.appendChild(card);
          target.appendChild(cardWrap);
        } else {
          target.appendChild(card);
        }
        cardRefs.set(machine.id, { card, hooks });

        if (!isExpanded) {
          collapseCard(card, { suppressAnimation: true });
        }

        let desiredTab = selectedTabById[machine.id] || "quehaceres";
        if (!card.querySelector(`.mc-tab[data-tab="${desiredTab}"]`)) {
          desiredTab = "quehaceres";
          if (state.selectedTabById) state.selectedTabById[machine.id] = "quehaceres";
        }
        if (hooks.setActiveTab && isExpanded) {
          hooks.setActiveTab(desiredTab, { notify: false });
        }

        if (isExpanded) {
          scheduleHeightSync(machine.id, () => {
            recalcHeight(card);
            requestAnimationFrame(() => card.classList.remove("mc-no-anim"));
          });
        }
      });
};
