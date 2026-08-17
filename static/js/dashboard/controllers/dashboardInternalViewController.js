import {
  GLOBAL_REGISTRY_PAGE_SIZE,
  MAX_SUGGESTION_LENGTH,
  MAX_TODO_LENGTH,
  SUGGESTIONS_PAGE_SIZE,
  renderRegistryDashboardView,
  renderGalleryDashboardView,
  renderNotificationsDashboardView,
  renderStatisticsDashboardView,
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
  buildAddTaskAttachmentsUpdate,
  buildAddTaskNoteUpdate,
  buildAddTaskUpdate,
  buildCompleteTaskUpdate,
  buildRemoveTaskUpdate
} from "../tabs/tasks/taskActions.js";
import { createTask } from "../tabs/tasks/tasksModel.js";
import { openTaskCompletionModal } from "../components/taskCompletionModal/taskCompletionModal.js";
import {
  machineStatusResultPatch,
  transitionMachineStatus
} from "../machineStatusRepo.js";
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
import { renderPrivacyDashboardView } from "../views/privacy/privacyView.js";
import { openTaskCreateModal } from "../components/taskCreateModal/taskCreateModal.js";
import { openOperationalReturnModal } from "../components/operationalReturnModal/operationalReturnModal.js";
import { openUserCreateModal } from "../components/userCreateModal/userCreateModal.js";
import {
  getDashboardScopedMachines,
  TREE_UNGROUPED_ID
} from "../rendering/groupTreeRenderer.js";

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
  dashboardFixedMenus,
  dashboardViewHeaderSlot,
  addBar,
  loadingEl,
  setInlineStatus,
  mount,
  groupTree,
  renderGroupTree,
  isLargeDashboardViewport,
  autoSave,
  getDraftById,
  updateMachine,
  getNotifications,
  markNotificationsRead
}) => {
  const clearFixedViewHeader = () => {
    if (loadingEl && dashboardViewHeaderSlot?.contains(loadingEl)) {
      addBar?.prepend(loadingEl);
    }
    dashboardViewHeaderSlot?.replaceChildren();
    if (dashboardViewHeaderSlot) dashboardViewHeaderSlot.hidden = true;
    dashboardFixedMenus?.classList.remove(
      "has-view-header",
      "has-static-dashboard-header",
      "has-static-registry-header",
      "has-static-gallery-header",
      "has-static-tasks-header",
      "has-static-users-header",
      "has-static-privacy-header"
    );
  };
  const getFixedViewHeaderContainer = (always = false) =>
    window.matchMedia("(max-width: 768px)").matches ||
      always ||
      state.internalViewChromeExpanded
      ? dashboardViewHeaderSlot
      : null;
  const normalizeMobileFixedViewHeader = () => {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    const heading = dashboardViewHeaderSlot?.querySelector("h3");
    if (!heading || heading.closest(".dashboard-mobile-section-heading")) return;
    const loading = dashboardViewHeaderSlot.querySelector(".dashboard-loading");
    const headingGroup = document.createElement("div");
    headingGroup.className = "dashboard-mobile-section-heading";
    heading.before(headingGroup);
    headingGroup.appendChild(heading);
    if (loading) headingGroup.appendChild(loading);
  };
  const showFixedViewHeader = (staticView = "") => {
    if (!dashboardViewHeaderSlot?.childElementCount) return;
    normalizeMobileFixedViewHeader();
    dashboardViewHeaderSlot.hidden = false;
    dashboardFixedMenus?.classList.add(
      staticView ? `has-static-${staticView}-header` : "has-view-header"
    );
  };
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
  const createDashboardUser = async ({ username, pin, role }, button) => {
    const context = getUsersContext();
    if (!context) return false;
    const cleanUsername = (username || "").trim().replace(/\s+/g, " ");
    if (!cleanUsername || !pin) return false;
    button.disabled = true;
    setInlineStatus(t("dashboard.usersSaving", "Guardando..."));
    try {
      const normalizedUsername = cleanUsername.toLowerCase();
      if (collectAccessUsers(context.machines).some(
        (item) => item.normalized === normalizedUsername
      )) throw new Error("duplicate-user");
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
      return true;
    } catch (error) {
      const duplicate = `${error?.message || ""}`.includes("duplicate-user");
      setInlineStatus(
        duplicate
          ? t("dashboard.userExists", "El usuario ya existe")
          : t("dashboard.usersSaveError", "No se pudo guardar el usuario"),
        "error"
      );
      button.disabled = false;
      return false;
    }
  };
  const createMachineTask = async (values) => {
    const current = getDraftById(values.machineId);
    if (!current) return false;
    const actor = state.adminLabel || t("dashboard.admin", "Administrador");
    const { task } = createTask({ ...values, createdBy: actor });
    updateMachine(current.id, buildAddTaskUpdate(current, task, actor));
    rerender({ preserveScroll: true });
    notifyTopbar(t("dashboard.taskCreated", "Tarea creada"));
    await autoSave.saveNow(current.id, "add-task-global-view");
    return true;
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
  const getMachineScope = (machines, { includeHidden = false } = {}) => {
    const layout = state.dashboardLayout || {};
    const groups = layout.groups || [];
    const placements = layout.placements || {};
    const validGroupIds = new Set(groups.map((group) => group.id));
    if (
      state.selectedTreeGroupId &&
      state.selectedTreeGroupId !== TREE_UNGROUPED_ID &&
      !validGroupIds.has(state.selectedTreeGroupId)
    ) {
      state.selectedTreeGroupId = "";
    }
    if (
      state.selectedTreeMachineId &&
      !machines.some((machine) => machine.id === state.selectedTreeMachineId)
    ) {
      state.selectedTreeMachineId = "";
    }
    const hiddenGroupIds = new Set(state.hiddenTreeGroupIds || []);
    const visibleMachines = includeHidden
      ? machines
      : machines.filter((machine) => {
          const groupId = placements[machine.id]?.groupId || "";
          return !hiddenGroupIds.has(groupId);
        });
    return getDashboardScopedMachines({
      machines: visibleMachines,
      groups,
      placements,
      selectedGroupId: state.selectedTreeGroupId,
      selectedMachineId: state.selectedTreeMachineId
    });
  };
  const renderMachineFilterTree = (machines, options = {}) => {
    if (state.loading || !isLargeDashboardViewport?.()) return machines;
    const layout = state.dashboardLayout || {};
    mount.classList.add("has-group-tree");
    groupTree.hidden = false;
    renderGroupTree({
      groups: layout.groups || [],
      placements: layout.placements || {},
      machines,
      selectedGroupId: state.selectedTreeGroupId,
      selectedMachineId: state.selectedTreeMachineId,
      expandedGroupIds: state.expandedTreeGroupIds,
      hiddenGroupIds: state.hiddenTreeGroupIds || [],
      showIncidentCounts: state.showTreeIncidentCounts !== false,
      showTaskCounts: state.showTreeTaskCounts !== false,
      filterOnly: false
    });
    return getMachineScope(machines, options);
  };
  const renderRegistry = (machines) => {
    prepare();
    const scopedMachines = renderMachineFilterTree(machines);
    const headerContainer = getFixedViewHeaderContainer(true);
    renderRegistryDashboardView(list, scopedMachines, {
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      loading: state.loading,
      query: state.searchQuery,
      seenAt: state.dashboardLayout?.registrySeenAt || "",
      visibleCount: state.registryVisibleCount,
      onLoadMore: () => {
        state.registryVisibleCount += GLOBAL_REGISTRY_PAGE_SIZE;
        rerender({ preserveScroll: true });
      }
    });
    showFixedViewHeader("registry");
    return finish();
  };
  const renderGallery = (machines) => {
    prepare();
    const scopedMachines = renderMachineFilterTree(machines);
    const headerContainer = getFixedViewHeaderContainer(true);
    renderGalleryDashboardView(list, scopedMachines, {
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      loading: state.loading,
      query: state.searchQuery
    });
    showFixedViewHeader("gallery");
    return finish();
  };
  const renderStatistics = (machines) => {
    prepare();
    const scopedMachines = renderMachineFilterTree(machines, { includeHidden: true });
    const headerContainer = getFixedViewHeaderContainer(true);
    renderStatisticsDashboardView(list, scopedMachines, {
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      loading: state.loading,
      query: state.searchQuery,
      period: state.statisticsPeriod,
      totalMachineCount: machines.length,
      hasTreeScope: !!(state.selectedTreeGroupId || state.selectedTreeMachineId),
      onClearScope: () => {
        state.selectedTreeGroupId = "";
        state.selectedTreeMachineId = "";
        rerender({ preserveScroll: false });
      },
      onSelectMachine: isLargeDashboardViewport?.()
        ? (machineId) => {
            state.selectedTreeGroupId = "";
            state.selectedTreeMachineId = machineId;
            rerender({ preserveScroll: false });
          }
        : null
    });
    showFixedViewHeader("tasks");
    return finish();
  };
  const renderUsers = (machines) => {
    prepare();
    const contexts = buildUserAccessContexts(machines, state.uid);
    const useSideTree = !state.loading && !!isLargeDashboardViewport?.();
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
    const headerContainer = getFixedViewHeaderContainer(true);
    renderUsersDashboardView(list, machines, {
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      loading: state.loading,
      currentUid: state.uid,
      query: state.searchQuery,
      contextOwnerUid: state.usersContextOwnerUid,
      expandedUsers: state.expandedUsers,
      createOpen: state.usersCreateOpen && window.matchMedia("(min-width: 769px)").matches,
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
      onCreate: createDashboardUser,
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
    showFixedViewHeader("users");
    return finish();
  };
  const renderSuggestions = () => {
    prepare();
    renderSuggestionsDashboardView(list, {
      headerContainer: getFixedViewHeaderContainer(),
      items: state.suggestions,
      ready: state.suggestionsReady,
      canSuggest: state.canSuggest || state.isSuperadmin,
      isSuperadmin: state.isSuperadmin,
      seenAt: state.dashboardLayout?.suggestionsSeenAt || "",
      query: state.searchQuery,
      replyTarget: state.suggestionReplyTarget,
      createOpen: state.suggestionsCreateOpen,
      visibleCount: state.suggestionsVisibleCount,
      onLoadMore: () => {
        state.suggestionsVisibleCount += SUGGESTIONS_PAGE_SIZE;
        rerender({ preserveScroll: true });
      },
      onReply: (target) => {
        state.suggestionReplyTarget = target || null;
        state.suggestionsCreateOpen = true;
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
    showFixedViewHeader("registry");
    return finish();
  };
  const renderTodo = (viewOptions = {}) => {
    prepare();
    const scopedMachines = renderMachineFilterTree(state.draftMachines || []);
    const headerContainer = getFixedViewHeaderContainer(true);
    renderTodoDashboardView(list, scopedMachines, {
      unscopedMachines: state.draftMachines || [],
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      loading: state.loading,
      query: state.searchQuery,
      page: state.todoPage,
      createOpen: state.todoCreateOpen && window.matchMedia("(min-width: 769px)").matches,
      onCloseCreate: () => {
        state.todoCreateOpen = false;
        rerender({ preserveScroll: true });
      },
      showCompleted: state.todoShowCompleted,
      statusFilter: state.todoStatusFilter,
      sort: state.todoSort,
      onPageChange: (page) => {
        state.todoPage = page;
        rerender({ preserveScroll: true });
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      },
      onShowCompletedChange: (showCompleted) => {
        state.todoShowCompleted = showCompleted;
        state.todoStatusFilter = "visible";
        state.todoPage = 1;
        rerender({ preserveScroll: true });
      },
      onCreate: createMachineTask,
      onAddTaskNote: async (machineId, taskId, text) => {
        const current = getDraftById(machineId);
        if (!current) return;
        const actor = state.adminLabel || t("dashboard.admin", "Administrador");
        const updates = buildAddTaskNoteUpdate(current, taskId, text, actor);
        if (!updates) return;
        updateMachine(machineId, updates);
        rerender({ preserveScroll: true });
        await autoSave.saveNow(machineId, "task-note-global-view");
      },
      onAddTaskImages: async (machineId, taskId, files = []) => {
        const current = getDraftById(machineId);
        const task = current?.tasks?.find((item) => item.id === taskId);
        const selected = Array.from(files || []).slice(0, 10);
        if (!current || !task || !selected.length || !viewOptions.uploadMachineDocument) return;
        const actor = state.adminLabel || t("dashboard.admin", "Administrador");
        const uploaded = [];
        let failedUploads = 0;
        notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
        for (const file of selected) {
          try {
            const result = await viewOptions.uploadMachineDocument(
              machineId,
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
                  linkedTaskId: task.id,
                  linkedStatusCycleId: task.statusCycleId || ""
                }
              }
            );
            if (result) uploaded.push(result);
          } catch {
            failedUploads += 1;
          }
        }
        const latest = getDraftById(machineId);
        const updates = latest
          ? buildAddTaskAttachmentsUpdate(latest, taskId, uploaded, actor)
          : null;
        if (!updates) {
          if (failedUploads) {
            notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
          }
          return;
        }
        updateMachine(machineId, updates);
        rerender({ preserveScroll: true });
        await autoSave.saveNow(machineId, "task-images-global-view");
        if (failedUploads) {
          notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
        } else {
          notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
        }
      },
      onCompleteTask: async (machineId, taskId) => {
        const current = getDraftById(machineId);
        if (!current) return;
        const actor = state.adminLabel || t("dashboard.admin", "Administrador");
        const task = current.tasks?.find((item) => item.id === taskId);
        if (!task) return;
        const isRestoreTask = task.source === "status-out-of-service";
        if (
          task.frequency === "puntual" &&
          !isRestoreTask &&
          !(await openTaskCompletionModal({
            machineTitle: current.title || "",
            taskTitle: task.title || ""
          }))
        ) return;
        const details = isRestoreTask
          ? await openOperationalReturnModal({
              machineTitle: current.title || "",
              completesTask: true,
              changesStatus: current.status !== "operativa"
            })
          : null;
        if (isRestoreTask && !details) return;
        if (!isRestoreTask && details?.note?.trim()) {
          const noteUpdate = buildAddTaskNoteUpdate(current, taskId, details.note.trim(), actor);
          if (noteUpdate) updateMachine(machineId, noteUpdate);
        }
        const uploaded = [];
        if (isRestoreTask && details.images?.length && viewOptions.uploadMachineDocument) {
          for (const file of details.images.slice(0, 10)) {
            try {
              const attachment = await viewOptions.uploadMachineDocument(
                machineId,
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
                    linkedTaskId: task.id,
                    linkedStatusCycleId: task.statusCycleId || ""
                  }
                }
              );
              if (attachment) uploaded.push(attachment);
            } catch {
              notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
            }
          }
        }
        if (isRestoreTask) {
          try {
            const result = await transitionMachineStatus(
              machineId,
              "operativa",
              actor,
              {
                restoreTaskId: taskId,
                note: details.note?.trim() || "",
                attachments: uploaded
              }
            );
            updateMachine(machineId, machineStatusResultPatch(result));
            state.todoPage = 1;
            rerender({ preserveScroll: true });
          } catch {
            notifyTopbar(t("dashboard.saveError", "Error al guardar"));
          }
          return;
        }
        if (uploaded.length) {
          const attachmentUpdate = buildAddTaskAttachmentsUpdate(
            getDraftById(machineId), taskId, uploaded, actor
          );
          if (attachmentUpdate) updateMachine(machineId, attachmentUpdate);
        }
        const latest = getDraftById(machineId);
        const updates = buildCompleteTaskUpdate(machineId, latest, taskId, actor);
        if (!updates) return;
        updateMachine(machineId, updates);
        state.todoPage = 1;
        rerender({ preserveScroll: true });
        await autoSave.saveNow(machineId, "task-complete-global-view");
      },
      onRemoveTask: async (machineId, taskId) => {
        const current = getDraftById(machineId);
        if (!current) return;
        const actor = state.adminLabel || t("dashboard.admin", "Administrador");
        const updates = buildRemoveTaskUpdate(current, taskId, actor);
        if (!updates) return;
        updateMachine(machineId, updates);
        state.todoPage = 1;
        rerender({ preserveScroll: true });
        await autoSave.saveNow(machineId, "task-remove-global-view");
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
    showFixedViewHeader("tasks");
    return finish();
  };

  const renderPrivacy = () => {
    prepare();
    const headerContainer = getFixedViewHeaderContainer(true);
    renderPrivacyDashboardView(list, {
      headerContainer,
      loadingElement: headerContainer ? loadingEl : null,
      isEnglish: document.documentElement.lang?.toLowerCase().startsWith("en")
    });
    showFixedViewHeader();
    return finish();
  };

  const renderNotifications = () => {
    prepare();
    const headerContainer = getFixedViewHeaderContainer(true);
    renderNotificationsDashboardView(list, {
      headerContainer,
      items: getNotifications?.({ includeRead: true }) || [],
      isEnglish: document.documentElement.lang?.toLowerCase().startsWith("en")
    });
    markNotificationsRead?.();
    showFixedViewHeader("registry");
    return finish();
  };

  const render = (view, machines, viewOptions = {}) => {
    clearFixedViewHeader();
    if (view === "sugerencias" && !state.canSuggest && !state.isSuperadmin) {
      window.location.hash = "#/dashboard";
      return true;
    }
    if (view === "registro") return renderRegistry(machines);
    if (view === "galeria") return renderGallery(machines);
    if (view === "estadisticas") return renderStatistics(machines);
    if (view === "usuarios") return renderUsers(machines);
    if (view === "sugerencias") return renderSuggestions();
    if (view === "todo") return renderTodo(viewOptions);
    if (view === "notificaciones") return renderNotifications();
    if (view === "privacidad") return renderPrivacy();
    const headerContainer = getFixedViewHeaderContainer(true);
    if (headerContainer) {
      const header = document.createElement("div");
      header.className = "global-registry-header dashboard-home-header";
      const title = document.createElement("h3");
      title.textContent = "Dashboard";
      header.appendChild(title);
      if (loadingEl) header.appendChild(loadingEl);
      headerContainer.appendChild(header);
      showFixedViewHeader("dashboard");
    }
    return false;
  };

  const openMobileTaskCreate = () => openTaskCreateModal({
    machines: renderMachineFilterTree(state.draftMachines || []),
    onCreate: createMachineTask
  });
  const openMobileUserCreate = () => {
    const context = getUsersContext();
    if (!context) return;
    const contextLabel = context.isOwner
      ? t("dashboard.usersMyMachines", "Mis máquinas")
      : context.ownerEmail || t("dashboard.usersManagedMachines", "Máquinas administradas");
    openUserCreateModal({
      contextLabel,
      machineCount: context.machines.length,
      onCreate: createDashboardUser
    });
  };

  return { openMobileTaskCreate, openMobileUserCreate, render };
};
