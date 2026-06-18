import {
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
