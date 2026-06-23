export const installMachineCardCoreHooks = (dependencies) => {
  const {
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
  } = dependencies;
        hooks.onToggleExpand = (node) => {
          if (node.classList.contains("is-dragging")) return;
          const isExpanded = node.dataset.expanded === "true";
          if (isExpanded) {
            expandedById.delete(machine.id);
            if (state.mobileFocusedMachineId === machine.id) clearMobileDetailState();
            collapseCard(node);
          } else {
            expandedById.clear();
            expandedById.add(machine.id);
            if (isMobileDashboardViewport()) {
              state.mobileFocusedMachineId = machine.id;
              state.mobileDetailJustEntered = true;
            }
            list.querySelectorAll(".machine-card").forEach((cardEl) => {
              if (cardEl !== node) collapseCard(cardEl);
            });
            expandCard(node);
          }
          state.expandedById = Array.from(expandedById);
          syncMobileDetailUI();
        };

        hooks.onSelectTab = (node, tabId) => {
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[machine.id] = tabId || "quehaceres";
          if (node.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(node));
          }
        };

        hooks.onStatusToggle = async (node) => {
          if (pendingStatusIncidentMachineIds.has(machine.id)) return;
          const statusOrder = ["operativa", "fuera_de_servicio"];
          const current = getDraftById(machine.id);
          if (!current) return;
          const currentStatus = normalizeStatus(current.status);
          const idx = statusOrder.indexOf(currentStatus);
          const nextStatus = statusOrder[(idx + 1) % statusOrder.length];
          const keepExpanded = node.dataset.expanded === "true";
          const user = state.adminLabel || t("dashboard.admin", "Administrador");
          const defaultRestoreTitle = t(
            "tasks.restoreOperation",
            "Volver a poner la máquina en operatividad"
          );
          let incidentDetails = null;
          if (currentStatus !== "fuera_de_servicio" && nextStatus === "fuera_de_servicio") {
            pendingStatusIncidentMachineIds.add(machine.id);
            try {
              incidentDetails = await openStatusIncidentModal({
                machineTitle: current.title || machine.title || "",
                defaultTitle: defaultRestoreTitle
              });
              if (!incidentDetails) return;
            } finally {
              pendingStatusIncidentMachineIds.delete(machine.id);
            }
          }
          const statusUpdate = buildStatusToggleUpdate(
            machine.id,
            current,
            nextStatus,
            user,
            {
              normalizeStatus,
              restoreTitle: (incidentDetails?.title || "").trim() || defaultRestoreTitle,
              restoreDescription: (incidentDetails?.description || "").trim(),
              restoreNote: (incidentDetails?.note || "").trim()
            }
          );
          replaceMachine(machine.id, {
            ...current,
            ...statusUpdate
          });

          const selectedImages = Array.isArray(incidentDetails?.images)
            ? incidentDetails.images
            : [];
          const restoreTask = statusUpdate.tasks?.find(
            (task) =>
              task.source === RESTORE_OPERATION_TASK_SOURCE &&
              task.statusCycleId === statusUpdate.activeStatusCycleId
          );
          const uploadedAttachments = [];
          let failedUploads = 0;
          if (selectedImages.length && restoreTask && hooks.onUploadMachineDocument) {
            notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
            for (const file of selectedImages) {
              try {
                const uploaded = await hooks.onUploadMachineDocument(
                  machine.id,
                  "other",
                  file,
                  null,
                  {
                    silent: true,
                    deferRender: true,
                    rethrow: true,
                    preserveTab: true,
                    documentMetadata: {
                      context: "task-attachment",
                      linkedTaskId: restoreTask.id,
                      linkedStatusCycleId: restoreTask.statusCycleId || ""
                    }
                  }
                );
                if (uploaded) uploadedAttachments.push(uploaded);
              } catch {
                failedUploads += 1;
              }
            }
          }
          if (uploadedAttachments.length && restoreTask) {
            const latest = getDraftById(machine.id);
            if (latest) {
              const attachmentUpdate = buildAddTaskAttachmentsUpdate(
                latest,
                restoreTask.id,
                uploadedAttachments,
                user
              );
              if (attachmentUpdate) updateMachine(machine.id, attachmentUpdate);
            }
          }
          renderCards({ preserveScroll: true });
          autoSave.saveNow(machine.id, "status");
          if (failedUploads) {
            notifyTopbar(
              t(
                "dashboard.incidentImageUploadError",
                "Alguna imagen no se pudo subir"
              )
            );
          } else if (uploadedAttachments.length) {
            notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
          }
          if (keepExpanded) {
            expandedById.add(machine.id);
            state.expandedById = Array.from(expandedById);
          }
        };

        hooks.onTitleUpdate = (node, nextTitle) => {
          const trimmed = (nextTitle || "").trim();
          const normalized = trimmed.toLowerCase();
          if (!normalized) return false;
          const duplicate = state.draftMachines.some(
            (m) => m.id !== machine.id && (m.title || "").trim().toLowerCase() === normalized
          );
          if (duplicate) {
            updateSaveState(t("dashboard.duplicateName", "Nombre duplicado"));
            return false;
          }
          updateMachine(machine.id, { title: trimmed });
          autoSave.scheduleSave(machine.id, "title");
          return true;
        };

        hooks.onUpdateGeneral = (id, field, value, input, errorEl) => {
          if (field === "year") {
            const currentYear = new Date().getFullYear();
            const parsed = value ? Number(value) : null;
            if (parsed !== null && (Number.isNaN(parsed) || parsed > currentYear || parsed < currentYear - 50)) {
              if (errorEl) {
                errorEl.textContent = t("dashboard.invalidYear", (min, max) => `Año inválido (entre ${min} y ${max}).`)(currentYear - 50, currentYear);
                errorEl.dataset.state = "error";
              }
              if (input) input.setAttribute("aria-invalid", "true");
              return;
            }
            if (errorEl) {
              errorEl.textContent = "";
              errorEl.dataset.state = "";
            }
            if (input) input.removeAttribute("aria-invalid");
            updateMachine(id, { year: parsed });
            machine.year = parsed;
          } else {
            updateMachine(id, { [field]: value });
            machine[field] = value;
          }
          autoSave.scheduleSave(id, `general:${field}`);
        };

        installDocumentHooks(hooks, {
          assertStorageAvailable,
          expandedById,
          getDraftById,
          notifyTopbar,
          refreshStorageFullState,
          renderCards,
          state,
          t,
          updateMachine,
          upsertMachine
        });

        hooks.onUpdateLocation = (id, nextValue) => {
          const current = getDraftById(id);
          const normalized = normalizeLocation(nextValue);
          const prev = normalizeLocation(current.location);
          if (normalized === prev) return;
          updateMachine(id, { location: normalized });
          const logs = [
            ...(current.logs || []),
            {
              ts: new Date().toISOString(),
              type: "location",
              value: normalized || ""
            }
          ];
          updateMachine(id, { logs });
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "location");
        };

};
