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
        hooks.onDownloadLogs = (machineData) => {
          const logs = machineData.logs || [];
          const historyLocale = document.documentElement.lang === "en" ? "en-GB" : "es-ES";
          const lines = logs.map((log) => {
            const time = new Date(log.ts).toLocaleString(historyLocale);
            if (log.type === "task") {
              const title = log.title || t("history.task", "Tarea");
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              if (log.punctual) {
                const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
                return `[${time}] ${t("history.oneOffCompleted", "Tarea puntual completada")}${duration}: ${title}${user}`;
              }
              const overdueText = log.overdueDuration
                ? t("history.lateSuffix", (text) => `, ${text} tarde`)(log.overdueDuration)
                : "";
              const prefix = log.overdue
                ? t("history.completedLate", (text) => `Tarea completada fuera de plazo${text}: `)(overdueText)
                : t("history.completed", "Tarea completada: ");
              return `[${time}] ${prefix}${title}${user}`;
            }
            if (log.type === "location") {
              const value = log.value ? log.value : t("history.noLocation", "Sin ubicación");
              return `[${time}] ${t("history.location", "Ubicación")} -> ${value}`;
            }
            if (log.type === "intervencion") {
              const message = log.message || "";
              const user = log.user ? t("history.completedBy", (value) => ` - por ${value}`)(log.user) : "";
              return `[${time}] ${t("history.interventionLog", "Intervención")}: ${message}${user}`;
            }
            const value =
              log.value === "operativa"
                ? t("dashboard.statusByValue.operativa", "Operativo")
                : t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio");
            return `[${time}] ${t("history.status", "Estado")} -> ${value}`;
          });
          const blob = new Blob([lines.join("\n")], {
            type: "text/plain;charset=utf-8"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const safeTitle = (machineData.title || machineData.id || "registro")
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");
          a.href = url;
          a.download = `registro_${safeTitle}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
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

        hooks.onAddIntervention = (machineData, message) => {
          const current = getDraftById(machineData.id) || machineData;
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const logs = [
            ...(current.logs || []),
            { ts: new Date().toISOString(), type: "intervencion", message, user }
          ];
          updateMachine(machineData.id, { logs });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machineData.id] = "historial";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          notifyTopbar(t("dashboard.interventionDone", "Intervención realizada"));
          autoSave.saveNow(machineData.id, "intervencion");
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
          if (!current) return;
          const ownerEmail = (current.ownerEmail || state.adminEmail || "").trim();
          if (!isOwnerMachine(current)) {
            notifyTopbar("Solo el propietario puede asignar administrador");
            return;
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
            return;
          }

          if (!nextEmail) {
            updateMachine(id, { adminEmail: "", adminStatus: "" });
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.scheduleSave(id, "admin");
            return;
          }
          if (ownerNormalized && nextEmail === ownerNormalized) {
            updateMachine(id, {
              adminEmail: "",
              adminStatus: t("dashboard.adminOwnEmail", "Introduce otra dirección de correo que no sea la tuya")
            });
            state.selectedTabById = { ...(state.selectedTabById || {}), [id]: "configuracion" };
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            return;
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
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          notifyTopbar(t("dashboard.adminPending", "Pendiente aceptación"));
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
