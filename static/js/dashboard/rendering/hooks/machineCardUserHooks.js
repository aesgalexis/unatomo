export const installMachineCardUserHooks = (dependencies) => {
  const {
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
  } = dependencies;
        hooks.onAddUser = async (id, userInput, passInput, addBtn) => {
          const normalizeName = (value) =>
            (value || "")
              .trim()
              .replace(/\s+/g, " ")
              .toLowerCase();
          const rawName = userInput.value;
          const username = (rawName || "").trim().replace(/\s+/g, " ");
          const normalizedUser = normalizeName(username);
          const password = passInput.value.trim();
          const usingExisting = passInput.disabled && normalizedUser;
          const globalUsers = state.draftMachines
            .flatMap((m) => m.users || [])
            .filter((u) => u && u.username);
          const existingGlobal = globalUsers.find(
            (u) => normalizeName(u.username) === normalizedUser
          );
          const isKnown = !!existingGlobal;
          if (!username || (!password && !isKnown)) {
            userInput.setAttribute("aria-invalid", "true");
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            return;
          }
          const current = getDraftById(id);
          if (!current) return;
          const tenantId = current.tenantId || state.uid;
          const users = Array.isArray(current.users) ? [...current.users] : [];
          if (users.some((u) => normalizeName(u.username) === normalizedUser)) {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            return;
          }
          try {
            let saltBase64 = "";
            let passwordHashBase64 = "";
            if (isKnown) {
              saltBase64 = existingGlobal ? existingGlobal.saltBase64 || "" : "";
              passwordHashBase64 = existingGlobal ? existingGlobal.passwordHashBase64 || "" : "";
            } else {
              saltBase64 = generateSaltBase64();
              passwordHashBase64 = await hashPassword(password, saltBase64);
            }
            if (!passwordHashBase64 || !saltBase64) {
              if (addBtn) {
                const prev = addBtn.textContent;
                addBtn.textContent = t("dashboard.genericError", "Error");
                setTimeout(() => (addBtn.textContent = prev), 1000);
              }
              return;
            }
            const newUser = {
              id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `u_${Date.now()}`,
              username: existingGlobal ? existingGlobal.username : username,
              role: "usuario",
              createdAt: new Date().toISOString(),
              saltBase64,
              passwordHashBase64
            };
            updateSaveState(t("dashboard.saving", "Guardando..."));
            const updatedUsers = await addUserWithRegistry(tenantId, id, newUser, {
              normalizeName,
              allowExisting: usingExisting
            });
            updateMachine(id, { users: updatedUsers });
            if (current.tagId) {
              await upsertMachineAccessFromMachine(tenantId, {
                ...current,
                users: updatedUsers
              }, state.uid);
            }
            updateSaveState(
              usingExisting
                ? t("dashboard.userAssigned", "Usuario asignado")
                : t("dashboard.userCreated", "Usuario creado")
            );
            userInput.value = "";
            passInput.value = "";
          } catch {
            if (addBtn) {
              const prev = addBtn.textContent;
              addBtn.textContent = t("dashboard.genericError", "Error");
              setTimeout(() => (addBtn.textContent = prev), 1000);
            }
            const statusEl = card.querySelector(".mc-user-status");
            if (statusEl) {
              statusEl.textContent = t("dashboard.userExists", "El usuario ya existe");
              statusEl.dataset.state = "error";
              if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              if (statusEl._timer) clearTimeout(statusEl._timer);
              statusEl._timer = setTimeout(() => {
                statusEl.textContent = "";
                statusEl.dataset.state = "";
                if (card.dataset.expanded === "true") scheduleHeightSync(machine.id, () => recalcHeight(card));
              }, 2200);
            }
            updateSaveState(t("dashboard.saveError", "Error al guardar"));
            return;
          }
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
        };

        hooks.onUpdateUserRole = (id, userId, role) => {
          const current = getDraftById(id);
          const users = (current.users || []).map((u) =>
            u.id === userId ? { ...u, role } : u
          );
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.scheduleSave(id, "role");
        };

        hooks.onRemoveUser = (id, userId) => {
          const current = getDraftById(id);
          const users = (current.users || []).filter((u) => u.id !== userId);
          const removedUser = (current.users || []).find((u) => u.id === userId);
          const normalizedRemoved = removedUser
            ? (removedUser.username || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase()
            : "";
          updateMachine(id, { users });
          if (!state.selectedTabById) state.selectedTabById = {};
          state.selectedTabById[id] = "configuracion";
          state.expandedById = Array.from(expandedById);
          renderCards({ preserveScroll: true });
          autoSave.saveNow(id, "remove-user");
          const tenantId = current.tenantId || state.uid;
          if (tenantId && normalizedRemoved) {
            const stillAssignedLocal = state.draftMachines
              .flatMap((m) => m.users || [])
              .some(
                (u) =>
                  (u.username || "")
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase() === normalizedRemoved
              );
            if (!stillAssignedLocal) {
              (async () => {
                try {
                  const remoteMachines = await fetchMachines(tenantId);
                  const stillAssignedRemote = remoteMachines
                    .flatMap((m) => m.users || [])
                    .some(
                      (u) =>
                        (u.username || "")
                          .trim()
                          .replace(/\s+/g, " ")
                          .toLowerCase() === normalizedRemoved
                    );
                  if (!stillAssignedRemote) {
                    await deleteUserRegistry(tenantId, normalizedRemoved);
                  }
                } catch {
                  // ignore cleanup errors
                }
              })();
            }
          }
        };

        hooks.onUpdateUserPassword = async (id, userId, nextPassword, input) => {
          const current = getDraftById(id);
          if (!current) return;
          try {
            const saltBase64 = generateSaltBase64();
            const passwordHashBase64 = await hashPassword(nextPassword, saltBase64);
            const users = (current.users || []).map((u) =>
              u.id === userId ? { ...u, saltBase64, passwordHashBase64 } : u
            );
            updateMachine(id, { users });
            if (input) input.setAttribute("aria-invalid", "false");
            if (!state.selectedTabById) state.selectedTabById = {};
            state.selectedTabById[id] = "configuracion";
            state.expandedById = Array.from(expandedById);
            renderCards({ preserveScroll: true });
            autoSave.saveNow(id, "user-pin");
          } catch {
            if (input) input.setAttribute("aria-invalid", "true");
          }
        };

};
