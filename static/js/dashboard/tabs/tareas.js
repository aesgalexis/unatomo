import { renderTasksPanel } from "/static/js/dashboard/tabs/tasks/tasksUI.js";

export const render = (panel, machine, hooks, options = {}) => {
  renderTasksPanel(panel, machine, hooks, options, {
    createdBy: options.createdBy || null
  });
};
