import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  MAX_TODO_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  renderRegistryDashboardView,
  renderGalleryDashboardView,
  renderSuggestionsDashboardView,
  renderTodoDashboardView,
  renderUsersDashboardView
} from "../views/dashboardInternalViews.js";
import {
  createDashboardSuggestion,
  deleteDashboardSuggestion,
  updateDashboardSuggestionResolved
} from "../views/suggestions/suggestionsRepo.js";
import {
  createDashboardTodo,
  deleteDashboardTodo,
  updateDashboardTodo
} from "../views/todo/todoRepo.js";
import {
  deleteGlobalLocalUser,
  saveGlobalLocalUser,
  saveMachineAccessRolePermissions
} from "../firestoreRepo.js";
import {
  generateSaltBase64,
  hashPassword
} from "/static/js/utils/crypto.js";
import {
  buildUserAccessContexts,
  collectAccessUsers,
  removeUserFromMachines,
  USERS_ALL_CONTEXT_ID,
  updateUsersInMachines
} from "../views/users/usersModel.js";
import { renderUsersTree } from "../views/users/usersTree.js";

export const createDashboardInternalViewController = ({
  state,
  list,
  filterInfo,
  cardRefs,
  t,
  clearMobileDetailState,
  syncMobileDetailUI,
  rerender,
  syncMachineAccessListeners,
  updateLoading,
  loadSuggestions,
  loadTodos,
  notifyTopbar,
  setInlineStatus,
  mount,
  groupTree,
  isLargeDashboardViewport
}) => {
  const getUsersContext = (ownerUid = state.usersContextOwnerUid) => {
    const contexts = buildUserAccessContexts(state.draftMachines, state.uid);
    const context = contexts.find((item) => item.ownerUid === ownerUid) ||
      contexts[0] ||
      null;
    if (
      context &&
      state.usersContextOwnerUid !== USERS_ALL_CONTEXT_ID &&
      state.usersContextOwnerUid !== context.ownerUid
    ) {
      state.usersContextOwnerUid = context.ownerUid;
    }
    return context;
  };
  const finish = () => {
    syncMachineAccessListeners(state.draftMachines);
    if (state.loading && state.ownerReady && state.adminReady) updateLoading();
    return true;
  };
  const prepare = () => {
    clearMobileDetailState();
    syncMobileDetailUI();
    filterInfo.textContent = "";
    filterInfo.style.display = "none";
    cardRefs.clear();
  };
  const renderRegistry = (machines) => {
    prepare();
    renderRegistryDashboardView(list, machines, {
      query: state.searchQuery,
      seenAt: state.dashboardLayout?.registrySeenAt || "",
      visibleCount: state.registryVisibleCount,
      onLoadMore: () => {
        state.registryVisibleCount += GLOBAL_REGISTRY_PAGE_SIZE;
        rerender({ preserveScroll: true });
      }
    });
    return finish();
  };
  const renderGallery = (machines) => {
    prepare();
    renderGalleryDashboardView(list, machines, {
      query: state.searchQuery
    });
    return finish();
  };
  const renderUsers = (machines) => {
    prepare();
    const contexts = buildUserAccessContexts(machines, state.uid);
    const useSideTree = !!isLargeDashboardViewport?.();
    if (useSideTree) {
      if (!state.usersContextOwnerUid) {
        state.usersContextOwnerUid = USERS_ALL_CONTEXT_ID;
      }
      mount.classList.add("has-group-tree");
      groupTree.hidden = false;
      renderUsersTree(groupTree, {
        contexts,
        selectedOwnerUid: state.usersContextOwnerUid,
        policyOpen: state.usersPolicyOpen,
        isEn: document.documentElement.lang?.toLowerCase().startsWith("en"),
        onSelectContext: (ownerUid) => {
          state.usersContextOwnerUid = ownerUid;
          state.usersPolicyOpen = false;
          state.usersCreateOpen = false;
          state.expandedUsers = [];
          rerender({ preserveScroll: false });
        },
        onSelectRoles: () => {
          if (state.usersContextOwnerUid === USERS_ALL_CONTEXT_ID) {
            state.usersContextOwnerUid =
              contexts.find((item) => item.isOwner)?.ownerUid ||
              contexts[0]?.ownerUid ||
              "";
          }
          state.usersPolicyOpen = true;
          state.usersCreateOpen = false;
          state.expandedUsers = [];
          rerender({ preserveScroll: false });
        }
      });
    }
    renderUsersDashboardView(list, machines, {
      currentUid: state.uid,
      query: state.searchQuery,
      contextOwnerUid: state.usersContextOwnerUid,
      expandedUsers: state.expandedUsers,
      createOpen: state.usersCreateOpen,
      policyOpen: state.usersPolicyOpen,
      showInlineNavigation: !useSideTree,
      isEn: document.documentElement.lang?.toLowerCase().startsWith("en"),
      onContextChange: (ownerUid) => {
        state.usersContextOwnerUid = ownerUid;
        state.usersCreateOpen = false;
        state.expandedUsers = [];
        rerender({ preserveScroll: true });
      },
      onToggleUser: (username) => {
        state.expandedUsers = state.expandedUsers.includes(username)
          ? []
          : [username];
        rerender({ preserveScroll: true });
      },
      onCloseCreate: () => {
        state.usersCreateOpen = false;
        rerender({ preserveScroll: true });
      },
      onCreate: async ({ username, pin, role }, button) => {
        const context = getUsersContext();
        if (!context) return;
        const cleanUsername = (username || "").trim().replace(/\s+/g, " ");
        if (!cleanUsername || !pin) return;
        button.disabled = true;
        setInlineStatus(t("dashboard.usersSaving", "Guardando..."));
        try {
          const normalizedUsername = cleanUsername.toLowerCase();
          if (collectAccessUsers(context.machines).some(
            (item) => item.normalized === normalizedUsername
          )) {
            throw new Error("duplicate-user");
          }
          const saltBase64 = generateSaltBase64();
          const passwordHashBase64 = await hashPassword(pin, saltBase64);
          const user = {
            id: globalThis.crypto?.randomUUID?.() || `user-${Date.now()}`,
            username: cleanUsername,
            role,
            createdAt: new Date().toISOString(),
            saltBase64,
            passwordHashBase64,
            isNew: true
          };
          const machineIds = context.machines.map((machine) => machine.id);
          await saveGlobalLocalUser({
            ownerUid: context.ownerUid,
            actorUid: state.uid,
            machines: context.machines,
            assignedMachineIds: machineIds,
            user
          });
          state.draftMachines = updateUsersInMachines(
            state.draftMachines,
            context,
            user,
            machineIds
          );
          state.usersCreateOpen = false;
          setInlineStatus(t("dashboard.usersCreated", "Usuario creado"), "ok");
          rerender({ preserveScroll: true });
        } catch (error) {
          const duplicate = `${error?.message || ""}`.includes("duplicate-user");
          setInlineStatus(
            duplicate
              ? t("dashboard.userExists", "El usuario ya existe")
              : t("dashboard.usersSaveError", "No se pudo guardar el usuario"),
            "error"
          );
          button.disabled = false;
        }
      },
      onSaveUser: async (user, button) => {
        const context = getUsersContext(user.contextOwnerUid);
        if (!context || !user.assignedMachineIds?.length) {
          notifyTopbar(t("dashboard.usersNeedMachine", "Selecciona al menos una máquina"));
          return;
        }
        button.disabled = true;
        setInlineStatus(t("dashboard.usersSaving", "Guardando..."));
        try {
          let saltBase64 = user.saltBase64;
          let passwordHashBase64 = user.passwordHashBase64;
          if (user.pin) {
            if (!context.isOwner) throw new Error("pin-owner-only");
            saltBase64 = generateSaltBase64();
            passwordHashBase64 = await hashPassword(user.pin, saltBase64);
          }
          const savedUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            saltBase64,
            passwordHashBase64
          };
          await saveGlobalLocalUser({
            ownerUid: context.ownerUid,
            actorUid: state.uid,
            machines: context.machines,
            assignedMachineIds: user.assignedMachineIds,
            user: savedUser
          });
          state.draftMachines = updateUsersInMachines(
            state.draftMachines,
            context,
            savedUser,
            user.assignedMachineIds
          );
          setInlineStatus(t("dashboard.usersSaved", "Usuario actualizado"), "ok");
          rerender({ preserveScroll: true });
        } catch {
          button.disabled = false;
          setInlineStatus(t("dashboard.usersSaveError", "No se pudo guardar el usuario"), "error");
        }
      },
      onDeleteUser: async (user, button) => {
        const context = getUsersContext(user.contextOwnerUid);
        if (!context) return;
        const confirmed = window.confirm(
          t(
            "dashboard.usersDeleteConfirm",
            (name) => `¿Eliminar a ${name} de todas las máquinas?`
          )(user.username)
        );
        if (!confirmed) return;
        button.disabled = true;
        setInlineStatus(t("dashboard.usersDeleting", "Eliminando..."));
        try {
          await deleteGlobalLocalUser({
            ownerUid: context.ownerUid,
            actorUid: state.uid,
            machines: context.machines,
            username: user.username
          });
          state.draftMachines = removeUserFromMachines(
            state.draftMachines,
            context.ownerUid,
            user.username
          );
          state.expandedUsers = state.expandedUsers.filter((item) => item !== user.cardKey);
          setInlineStatus(t("dashboard.usersDeleted", "Usuario eliminado"), "ok");
          rerender({ preserveScroll: true });
        } catch (error) {
          console.error("Unable to delete dashboard user", {
            code: error?.code || "",
            message: error?.message || "",
            stage: error?.userDeleteStage || ""
          });
          button.disabled = false;
          const code = (error?.code || "").toString().replace(/^firestore\//, "");
          const stage = error?.userDeleteStage || "";
          const detail = [stage, code].filter(Boolean).join(": ");
          setInlineStatus(
            detail
              ? `${t("dashboard.usersDeleteError", "No se pudo eliminar")} (${detail})`
              : t("dashboard.usersDeleteError", "No se pudo eliminar"),
            "error"
          );
        }
      },
      onTogglePolicy: () => {
        if (
          !state.usersPolicyOpen &&
          state.usersContextOwnerUid === USERS_ALL_CONTEXT_ID
        ) {
          state.usersContextOwnerUid =
            contexts.find((item) => item.isOwner)?.ownerUid ||
            contexts[0]?.ownerUid ||
            "";
        }
        state.usersPolicyOpen = !state.usersPolicyOpen;
        rerender({ preserveScroll: true });
      },
      onSavePolicy: async (permissions, button) => {
        const context = getUsersContext();
        if (!context) return;
        button.disabled = true;
        setInlineStatus(t("dashboard.usersSaving", "Guardando..."));
        try {
          await saveMachineAccessRolePermissions(state.uid, context.machines, permissions);
          state.draftMachines = state.draftMachines.map((machine) =>
            (machine.ownerUid || machine.tenantId) === context.ownerUid
              ? { ...machine, accessRolePermissions: structuredClone(permissions) }
              : machine
          );
          setInlineStatus(t("dashboard.usersPermissionsSaved", "Permisos actualizados"), "ok");
          rerender({ preserveScroll: true });
        } catch {
          button.disabled = false;
          setInlineStatus(t("dashboard.usersPermissionsError", "No se pudieron guardar los permisos"), "error");
        }
      }
    });
    return finish();
  };
  const renderSuggestions = () => {
    prepare();
    renderSuggestionsDashboardView(list, {
      items: state.suggestions,
      ready: state.suggestionsReady,
      canSuggest: state.canSuggest || state.isSuperadmin,
      isSuperadmin: state.isSuperadmin,
      seenAt: state.dashboardLayout?.suggestionsSeenAt || "",
      query: state.searchQuery,
      replyTarget: state.suggestionReplyTarget,
      visibleCount: state.suggestionsVisibleCount,
      onLoadMore: () => {
        state.suggestionsVisibleCount += SUGGESTIONS_PAGE_SIZE;
        rerender({ preserveScroll: true });
      },
      onReply: (target) => {
        state.suggestionReplyTarget = target || null;
        rerender({ preserveScroll: true });
      },
      onCancelReply: () => {
        state.suggestionReplyTarget = null;
        rerender({ preserveScroll: true });
      },
      onResolve: async (suggestionId, resolved) => {
        try {
          await updateDashboardSuggestionResolved(suggestionId, resolved);
          await loadSuggestions({ preserveScroll: true });
        } catch {
          notifyTopbar(t("dashboard.saveError", "Error al guardar"));
        }
      },
      onDelete: async (suggestionId) => {
        try {
          await deleteDashboardSuggestion(suggestionId);
          await loadSuggestions({ preserveScroll: true });
        } catch {
          notifyTopbar(t("dashboard.saveError", "Error al guardar"));
        }
      },
      onSubmit: async (rawText, controls = {}) => {
        const prefix = controls.input?.dataset?.replyPrefix || "";
        let textValue = (rawText || "").toString();
        if (prefix && textValue.startsWith(prefix)) textValue = textValue.slice(prefix.length);
        textValue = textValue.trim();
        const replyToSuggestionId = controls.replyToSuggestionId || "";
        const expectedReplyId = state.suggestionReplyTarget?.suggestionId || "";
        const status = controls.status;
        if (!textValue) return;
        if (expectedReplyId && !replyToSuggestionId) {
          if (status) {
            status.hidden = false;
            status.textContent = t("dashboard.suggestionsError", "No se pudo enviar la sugerencia");
            status.dataset.state = "error";
          }
          return;
        }
        if (controls.input) controls.input.disabled = true;
        if (controls.submit) controls.submit.disabled = true;
        if (status) {
          status.hidden = false;
          status.textContent = t("dashboard.suggestionsSending", "Enviando...");
          status.removeAttribute("data-state");
        }
        try {
          await createDashboardSuggestion(textValue.slice(0, MAX_SUGGESTION_LENGTH), {
            replyToSuggestionId
          });
          state.suggestionReplyTarget = null;
          if (controls.input) controls.input.value = "";
          if (status) status.textContent = t("dashboard.suggestionsSent", "Sugerencia enviada");
          await loadSuggestions({ preserveScroll: true });
        } catch {
          if (status) {
            status.textContent = t("dashboard.suggestionsError", "No se pudo enviar la sugerencia");
            status.dataset.state = "error";
          }
        } finally {
          if (controls.input) controls.input.disabled = false;
          if (controls.submit) controls.submit.disabled = false;
        }
      }
    });
    return finish();
  };
  const renderTodo = () => {
    prepare();
    renderTodoDashboardView(list, {
      items: state.todos,
      ready: state.todosReady,
      canTodo: state.canTodo || state.isSuperadmin,
      collaborators: state.todoCollaborators,
      query: state.searchQuery,
      page: state.todoPage,
      showCompleted: state.todoShowCompleted,
      onPageChange: (page) => {
        state.todoPage = page;
        rerender({ preserveScroll: true });
      },
      onShowCompletedChange: (showCompleted) => {
        state.todoShowCompleted = showCompleted;
        state.todoPage = 1;
        rerender({ preserveScroll: true });
      },
      onBack: () => { window.location.hash = "#/dashboard"; },
      onToggle: async (todoId, completed) => {
        try {
          await updateDashboardTodo(todoId, completed);
          await loadTodos({ preserveScroll: true });
        } catch {
          notifyTopbar(t("dashboard.saveError", "Error al guardar"));
        }
      },
      onDelete: async (todoId, button) => {
        if (button) button.disabled = true;
        setInlineStatus(t("dashboard.todoDeleting", "Eliminando..."));
        try {
          await deleteDashboardTodo(todoId);
          state.todos = (state.todos || []).filter((item) => item.id !== todoId);
          setInlineStatus(t("dashboard.todoDeleted", "Tarea eliminada"), "ok");
          rerender({ preserveScroll: true });
          await loadTodos({ preserveScroll: true });
        } catch {
          if (button) button.disabled = false;
          setInlineStatus(t("dashboard.todoDeleteError", "No se pudo eliminar"), "error");
        }
      },
      onSubmit: async (rawText, controls = {}) => {
        const textValue = (rawText || "").toString().trim();
        if (!textValue) return;
        if (controls.input) controls.input.disabled = true;
        if (controls.submit) controls.submit.disabled = true;
        setInlineStatus(t("dashboard.todoSaving", "Guardando..."));
        try {
          await createDashboardTodo(textValue.slice(0, MAX_TODO_LENGTH));
          if (controls.input) controls.input.value = "";
          controls.resetRecipients?.();
          setInlineStatus(t("dashboard.todoSaved", "Tarea añadida"), "ok");
          await loadTodos({ preserveScroll: true });
        } catch (error) {
          const reason = `${error?.code || ""} ${error?.message || ""}`;
          const message = reason.includes("todo-mention-not-found")
            ? t("dashboard.todoMentionNotFound", "No existe un usuario de Tareas con esa mención")
            : reason.includes("todo-mention-ambiguous")
              ? t("dashboard.todoMentionAmbiguous", "Esa mención corresponde a más de una cuenta")
              : reason.includes("todo-recipient-disabled")
                ? t("dashboard.todoRecipientDisabled", "Ese usuario no es colaborador")
                : t("dashboard.todoError", "No se pudo guardar");
          setInlineStatus(message, "error");
        } finally {
          if (controls.input) controls.input.disabled = false;
          if (controls.submit) controls.submit.disabled = false;
        }
      }
    });
    return finish();
  };

  const render = (view, machines) => {
    if (view === "sugerencias" && !state.canSuggest && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return true;
    }
    if (view === "todo" && !state.canTodo && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return true;
    }
    if (view === "registro") return renderRegistry(machines);
    if (view === "galeria") return renderGallery(machines);
    if (view === "usuarios") return renderUsers(machines);
    if (view === "sugerencias") return renderSuggestions();
    if (view === "todo") return renderTodo();
    return false;
  };

  return { render };
};
