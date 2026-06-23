export const installMachineCardTagHooks = (dependencies) => {
  const {
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
  } = dependencies;
        hooks.onConnectTag = async (id, tagInput, statusEl) => {
          const tagId = tagInput.value.trim();
          if (!tagId) return false;
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || current.ownerUid || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          statusEl.textContent = t("dashboard.checking", "Comprobando...");
          statusEl.dataset.state = "neutral";
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            const res = await validateTag(tagId);
            if (!res.exists) {
              statusEl.textContent = t("config.tagNotFound", "El Tag ID introducido no existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            if (res.machineId && res.machineId !== id) {
              statusEl.textContent = t("config.tagAlreadyAssigned", "Tag ya est\u00e1 asignado");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") {
                scheduleHeightSync(machine.id, () => recalcHeight(card));
              }
              return false;
            }
            updateMachine(id, {
              tagId,
              tagUrl: buildMachineTagUrl(tagId),
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = { text: t("dashboard.tagLinked", "Tag enlazado"), state: "ok" };
            notifyTopbar(t("dashboard.tagLinked", "Tag enlazado"));
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "tag");
            return true;
          } catch {
            statusEl.textContent = t("dashboard.tagValidateError", "Error al validar el tag");
            statusEl.dataset.state = "error";
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
            return false;
          }
        };

        hooks.onDisconnectTag = async (id, _tagInput, statusEl) => {
          const current = getDraftById(id);
          if (!current?.tagId) return;
          const confirmed = window.confirm(
            t(
              "config.disconnectTagConfirm",
              "\u00bfSeguro que quieres desconectar este Tag ID? Se eliminar\u00e1n el Tag ID, la URL asociada y el QR. Este cambio no se puede deshacer."
            )
          );
          if (!confirmed) return;
          if (statusEl) {
            statusEl.textContent = t("config.disconnecting", "Desconectando...");
            statusEl.dataset.state = "neutral";
          }
          if (card.dataset.expanded === "true") {
            scheduleHeightSync(machine.id, () => recalcHeight(card));
          }
          try {
            markLocalWrite(id);
            await disconnectMachineTag(id);
            updateMachine(id, {
              tagId: null,
              tagUrl: "",
              tagQrUrl: "",
              tagQrPath: "",
              tagQrSize: 0
            });
            state.tagStatusById[id] = {
              text: t("dashboard.tagDisconnected", "Tag desconectado"),
              state: "error"
            };
            notifyTopbar(t("dashboard.tagDisconnected", "Tag desconectado"));
            await refreshStorageFullState(current.tenantId || current.ownerUid || state.uid);
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
          } catch {
            if (statusEl) {
              statusEl.textContent = t(
                "config.disconnectError",
                "No se pudo desconectar el Tag ID"
              );
              statusEl.dataset.state = "error";
            }
            if (card.dataset.expanded === "true") {
              scheduleHeightSync(machine.id, () => recalcHeight(card));
            }
          }
        };

        hooks.onGenerateTag = async (id) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          const tenantId = current ? current.tenantId || state.uid : state.uid;
          await assertStorageAvailable(tenantId);
          if (current?.isNew) {
            await upsertMachine(tenantId, current);
            current.isNew = false;
          }
          const newId = await createTagToken(tenantId, id);
          notifyTopbar(t("dashboard.tagGenerated", "Tag ID generado"));
          return newId;
        };

        hooks.onCopyTagUrl = (id, btn, input) => {
          if (!input.value) return;
          navigator.clipboard
            .writeText(input.value)
            .catch(() => {
              input.select();
              document.execCommand("copy");
            })
            .finally(() => {
              const prev = btn.textContent;
              btn.textContent = t("config.copied", "Copiado");
              setTimeout(() => (btn.textContent = prev), 1000);
            });
        };

        hooks.onGenerateTagQr = async (id, statusEl) => {
          if (!state.uid) throw new Error("no-auth");
          const current = getDraftById(id);
          if (!current?.tagId) throw new Error("tag-missing");
          const tenantId = current.tenantId || state.uid;
          await assertStorageAvailable(tenantId);
          const tagUrl = current.tagUrl || buildMachineTagUrl(current.tagId);
          const machineForSave = {
            ...current,
            tagUrl,
            tagQrUrl: "",
            tagQrPath: "",
            tagQrSize: 0
          };
          markLocalWrite(id);
          updateMachine(id, { tagUrl, isNew: false });
          if (statusEl) {
            statusEl.textContent = t("config.generatingQr", "Generando QR...");
            statusEl.dataset.state = "neutral";
          }
          try {
            await upsertMachine(tenantId, machineForSave);
            machineForSave.isNew = false;
            await assignTag(machineForSave.tagId, tenantId, machineForSave.id);
            await upsertMachineAccessFromMachine(tenantId, machineForSave, state.uid);
            const result = await generateMachineTagQr(id, getCurrentLang());
            const qrUrl = (result.qrUrl || "").toString().trim();
            if (!qrUrl) throw new Error("qr-missing");
            updateMachine(id, {
              tagUrl: result.tagUrl || tagUrl,
              tagQrUrl: qrUrl,
              tagQrPath: result.qrPath || "",
              tagQrSize: Number(result.qrSize || 0),
              isNew: false
            });
            state.tagStatusById[id] = { text: t("config.qrGenerated", "QR generado"), state: "ok" };
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerated", "QR generado");
              statusEl.dataset.state = "ok";
            }
            renderCards({ preserveScroll: true });
            await refreshStorageFullState(tenantId);
            notifyTopbar(t("config.qrGenerated", "QR generado"));
            return result;
          } catch (error) {
            if (statusEl) {
              statusEl.textContent = t("config.qrGenerateError", "Error al generar QR");
              statusEl.dataset.state = "error";
            }
            throw error;
          }
        };

};
