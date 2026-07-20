import {
  buildAddTaskAttachmentsUpdate,
  buildAddTaskNoteUpdate,
  buildAddTaskUpdate,
  buildCompleteTaskUpdate,
  buildEditTaskUpdate,
  buildRemoveTaskUpdate
} from "/static/js/dashboard/tabs/tasks/taskActions.js";
import { openOperationalReturnModal } from "/static/js/dashboard/components/operationalReturnModal/operationalReturnModal.js";

const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

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
  const pendingCompletionTaskIds = new Set();
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
    const updates = buildEditTaskUpdate(current, taskId, patch, user);
    if (!updates) return;
    updateMachine(id, updates);
    showTaskTab(id);
    renderCards({ preserveScroll: true });
    autoSave.saveNow(id, "task-edit");
  };

  hooks.onCompleteTask = async (id, taskId, _context = {}, completionDetails) => {
    const pendingKey = `${id}:${taskId}`;
    if (pendingCompletionTaskIds.has(pendingKey)) return false;
    const initial = getDraftById(id);
    const initialTask = initial?.tasks?.find((task) => task.id === taskId);
    if (!initial || !initialTask) return false;
    const isRestoreTask = initialTask.source === RESTORE_OPERATION_TASK_SOURCE;
    pendingCompletionTaskIds.add(pendingKey);
    try {
      let details = completionDetails;
      if (isRestoreTask && details === undefined) {
        details = await openOperationalReturnModal({
          machineTitle: initial.title || "",
          completesTask: true,
          changesStatus: normalizeStatus(initial.status) !== "operativa"
        });
        if (!details) return false;
      }

      const user = getUserLabel();
      const noteText = isRestoreTask ? (details?.note || "").trim() : "";
      if (noteText) {
        const current = getDraftById(id);
        const noteUpdate = buildAddTaskNoteUpdate(current, taskId, noteText, user);
        if (noteUpdate) updateMachine(id, noteUpdate);
      }

      const selectedImages = isRestoreTask && Array.isArray(details?.images)
        ? details.images.slice(0, 10)
        : [];
      const uploadedAttachments = [];
      let failedUploads = 0;
      if (selectedImages.length && hooks.onUploadMachineDocument) {
        notifyTopbar(t("dashboard.incidentUploadingImages", "Subiendo imágenes..."));
        for (const file of selectedImages) {
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
                  linkedTaskId: taskId,
                  linkedStatusCycleId: initialTask.statusCycleId || ""
                }
              }
            );
            if (uploaded) uploadedAttachments.push(uploaded);
          } catch {
            failedUploads += 1;
          }
        }
      }
      if (uploadedAttachments.length) {
        const current = getDraftById(id);
        const attachmentUpdate = buildAddTaskAttachmentsUpdate(
          current,
          taskId,
          uploadedAttachments,
          user
        );
        if (attachmentUpdate) updateMachine(id, attachmentUpdate);
      }

      const current = getDraftById(id);
      const updates = buildCompleteTaskUpdate(id, current, taskId, user, { normalizeStatus });
      if (!updates) return false;
      updateMachine(id, updates);
      showTaskTab(id);
      renderCards({ preserveScroll: true });
      notifyTopbar(t("dashboard.taskCompleted", "Tarea completada"));
      if (failedUploads) {
        notifyTopbar(t("dashboard.incidentImageUploadError", "Alguna imagen no se pudo subir"));
      } else if (uploadedAttachments.length) {
        notifyTopbar(t("dashboard.incidentImagesUploaded", "Imágenes guardadas"));
      }
      autoSave.saveNow(id, "task-complete");
      return true;
    } finally {
      pendingCompletionTaskIds.delete(pendingKey);
    }
  };
};
