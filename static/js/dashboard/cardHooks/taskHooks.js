import {
  buildAddTaskAttachmentsUpdate,
  buildAddTaskNoteUpdate,
  buildAddTaskUpdate,
  buildCompleteTaskUpdate,
  buildEditTaskUpdate,
  buildRemoveTaskUpdate
} from "/static/js/dashboard/tabs/tasks/taskActions.js";

export const installTaskHooks = (hooks, deps = {}) => {
  const {
    autoSave,
    expandedById,
    getDraftById,
    notifyTopbar,
    normalizeStatus,
    renderCards,
    state,
    t,
    updateMachine
  } = deps;

  const getUserLabel = () => state.adminLabel || t("dashboard.admin", "Administrador");
  const showTaskTab = (id) => {
    if (!state.selectedTabById) state.selectedTabById = {};
    state.selectedTabById[id] = "quehaceres";
    state.expandedById = Array.from(expandedById);
  };

  hooks.onAddTask = (id, task) => {
    const current = getDraftById(id);
    const user = getUserLabel();
    updateMachine(id, buildAddTaskUpdate(current, task, user));
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    notifyTopbar(t("dashboard.taskCreated", "Tarea creada"));
    autoSave.saveNow(id, "add-task");
  };

  hooks.onRemoveTask = (id, taskId) => {
    const current = getDraftById(id);
    const user = getUserLabel();
    updateMachine(id, buildRemoveTaskUpdate(current, taskId, user));
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    autoSave.saveNow(id, "remove-task");
  };

  hooks.onAddTaskNote = (id, taskId, text) => {
    const current = getDraftById(id);
    if (!current) return;
    const user = getUserLabel();
    const updates = buildAddTaskNoteUpdate(current, taskId, text, user);
    if (!updates) return;
    updateMachine(id, updates);
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    autoSave.saveNow(id, "task-note");
  };

  hooks.onAddTaskImages = async (id, taskId, files = []) => {
    const current = getDraftById(id);
    const task = current?.tasks?.find((item) => item.id === taskId);
    const selected = Array.from(files || []).slice(0, 10);
    if (!current || !task || !selected.length || !hooks.onUploadMachineDocument) return;
    const user = getUserLabel();
    const uploadedAttachments = [];
    let failedUploads = 0;
    notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
    for (const file of selected) {
      try {
        const uploaded = await hooks.onUploadMachineDocument(
          id,
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
        if (uploaded) uploadedAttachments.push(uploaded);
      } catch {
        failedUploads += 1;
      }
    }
    const latest = getDraftById(id);
    const updates = latest
      ? buildAddTaskAttachmentsUpdate(latest, taskId, uploadedAttachments, user)
      : null;
    if (updates) {
      updateMachine(id, updates);
      showTaskTab(id);
      renderCards({ preserveScroll: true });
      autoSave.saveNow(id, "task-images");
    }
    if (failedUploads) {
      notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
    } else if (uploadedAttachments.length) {
      notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
    }
  };

  hooks.onEditTask = (id, taskId, patch) => {
    const current = getDraftById(id);
    if (!current) return;
    const user = getUserLabel();
    updateMachine(id, buildEditTaskUpdate(current, taskId, patch, user));
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    autoSave.saveNow(id, "task-edit");
  };

  hooks.onCompleteTask = (id, taskId) => {
    const current = getDraftById(id);
    const user = getUserLabel();
    const updates = buildCompleteTaskUpdate(id, current, taskId, user, { normalizeStatus });
    if (!updates) return;
    updateMachine(id, updates);
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    notifyTopbar(t("dashboard.taskCompleted", "Tarea completada"));
    autoSave.saveNow(id, "task-complete");
  };
};
