import {
  buildMachineHistoryRows,
  downloadHistoryRows,
} from "../../history/historyExport.js";

export const installMachineCardManagementHooks = (dependencies) => {
  const {
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
  } = dependencies;
        hooks.onDownloadLogs = (machineData, format = "txt") => {
          const safeTitle = (machineData.title || machineData.id || "registro")
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");
          downloadHistoryRows(
            buildMachineHistoryRows(machineData),
            `registro_${safeTitle}`,
            format
          );
        };

        hooks.onRemoveMachine = (machineData) => {
          if (!isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(`\u00bfSeguro que quieres eliminar ${title}?, Esta acci\u00f3n no se puede deshacer.`);
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          autoSave.saveNow(machineData.id, "delete", async () => {
            const tenantId = machineData.tenantId || state.uid;
            try {
              await deleteMachine(tenantId, machineData.id);
            } catch {
              notifyTopbar("No se pudo eliminar el equipo");
              const restored = await fetchMachine(tenantId, machineData.id);
              if (restored) {
                const normalized = normalizeMachine(restored, state.draftMachines.length);
                normalized.tenantId = tenantId;
                normalized.role = "owner";
                normalized.ownerEmail = state.adminEmail || "";
                state.draftMachines = [normalized, ...state.draftMachines];
                renderCards({ preserveScroll: true });
              }
            }
          });
        };

        hooks.onLeaveAdmin = (machineData) => {
          if (isOwnerMachine(machineData)) return;
          const title = (machineData && machineData.title) || "este equipo";
          const ok = window.confirm(
            `\u00bfSeguro que quieres dejar de administrar ${title}?`
          );
          if (!ok) return;
          removeMachineFromState(machineData.id);
          renderCards();
          leaveAdminRole(machineData.id).catch(() => {});
        };

        installTaskHooks(hooks, {
          autoSave,
          expandedById,
          getDraftById,
          notifyTopbar,
          normalizeStatus,
          renderCards,
          state,
          t,
          updateMachine
        });

        hooks.onUpdateNotifications = (id, next) => {
          updateMachine(id, { notifications: next });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "notifications");
        };

        hooks.onUpdateAdmin = async (id, email) => {
          const current = getDraftById(id);
          if (!current) return false;
          const ownerEmail = (current.ownerEmail || state.adminEmail || "").trim();
          if (!isOwnerMachine(current)) {
            notifyTopbar("Solo el propietario puede asignar administrador");
            return false;
          }
          const nextEmail = normalizeEmail(email);
          const ownerNormalized = normalizeEmail(ownerEmail);
          const transferStatus = (current.ownershipTransferStatus || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          if (transferStatus.startsWith("pendiente")) {
            notifyTopbar(
              t(
                "dashboard.adminBlockedByTransfer",
                "No puedes asignar administrador con una transferencia pendiente"
              )
            );
            return false;
          }

          if (!nextEmail) {
            updateMachine(id, { adminEmail: "", adminStatus: "" });
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.scheduleSave(id, "admin");
            return true;
          }
          if (ownerNormalized && nextEmail === ownerNormalized) {
            updateMachine(id, {
              adminEmail: "",
              adminStatus: t("dashboard.adminOwnEmail", "Introduce otra dirección de correo que no sea la tuya")
            });
            state.selectedTabById = { ...(state.selectedTabById || {}), [id]: "configuracion" };
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return false;
          }
          const restoreY = window.scrollY;
          const anchorCard = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
          state.nextScrollAnchor = anchorCard
            ? { id, top: anchorCard.getBoundingClientRect().top }
            : null;
          state.nextScrollRestoreY = restoreY;
          setTimeout(() => {
            if (state.nextScrollRestoreY === restoreY) state.nextScrollRestoreY = null;
            if (state.nextScrollAnchor?.id === id) state.nextScrollAnchor = null;
          }, 3000);
          try {
            await createAdminInvite(id, nextEmail);
          } catch {
            state.nextScrollRestoreY = null;
            state.nextScrollAnchor = null;
            notifyTopbar(t("dashboard.adminAssignNoPermission", "No tienes permisos para asignar administrador"));
            return false;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          notifyTopbar(t("dashboard.adminPending", "Pendiente aceptación"));
          return true;
        };

        hooks.onRemoveAdmin = async (id) => {
          const current = getDraftById(id);
          if (!current) return;
          updateMachine(id, { adminEmail: "", adminStatus: "" });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await revokeAdminInvite(id, current.adminEmail || "");
          } catch {
            // ignore link update failures
          }
          autoSave.scheduleSave(id, "admin");
        };

        hooks.onTransferOwnership = async (id, email) => {
          const current = getDraftById(id);
          if (!current) return;
          if (!isOwnerMachine(current)) {
            notifyTopbar(t("dashboard.transferOnlyOwner", "Solo el propietario puede transferir la máquina"));
            return;
          }
          if ((current.adminEmail || "").trim()) {
            const status = t(
              "dashboard.transferBlockedByAdmin",
              "Quita el administrador antes de transferir la propiedad"
            );
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: status
            });
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            notifyTopbar(status);
            return;
          }
          const nextEmail = normalizeEmail(email);
          if (!nextEmail) return;
          if (nextEmail === normalizeEmail(state.adminEmail || "")) {
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: t("dashboard.transferOwnEmail", "Introduce otra cuenta registrada")
            });
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
          }
          updateMachine(id, {
            ownershipTransferEmail: nextEmail,
            ownershipTransferStatus: t("config.pendingAcceptance", "Pendiente aceptación")
          });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await createMachineTransferInvite(id, nextEmail);
            notifyTopbar(t("dashboard.transferPending", "Transferencia pendiente de aceptación"));
          } catch (error) {
            const message = (error?.message || error?.code || "").toString();
            const status = message.includes("target-account-not-found") || message.includes("not-found")
              ? t("dashboard.transferAccountNotFound", "La cuenta no existe")
              : t("dashboard.transferError", "No se pudo procesar la transferencia");
            updateMachine(id, {
              ownershipTransferEmail: "",
              ownershipTransferStatus: status
            });
            renderCards({ preserveScroll: true });
            notifyTopbar(status);
          }
        };

        hooks.onCancelOwnershipTransfer = async (id) => {
          const current = getDraftById(id);
          if (!current) return;
          updateMachine(id, {
            ownershipTransferEmail: "",
            ownershipTransferStatus: ""
          });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          try {
            await cancelMachineTransferInvite(id);
            notifyTopbar(t("dashboard.transferCanceled", "Transferencia cancelada"));
          } catch {
            notifyTopbar(t("dashboard.transferError", "No se pudo procesar la transferencia"));
          }
        };

        hooks.onTestNotification = (machineData) => {
          const logs = [
            ...(machineData.logs || []),
            {
              ts: new Date().toISOString(),
              type: "notification",
              message: t("dashboard.testNotificationRequested", "Notificación de prueba solicitada")
            }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machineData.id, "notification-test");
        };

};
