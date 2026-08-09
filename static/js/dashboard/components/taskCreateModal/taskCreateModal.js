import { t } from "../../i18n.js";
import { renderMachineTaskComposer } from "../../views/machineTasks/machineTasksComposer.js";
import { createStatusFormModalShell } from "../statusFormModal/statusFormModalShell.js";

const TASK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';

export const openTaskCreateModal = ({ machines = [], onCreate } = {}) => {
  const shell = createStatusFormModalShell({
    title: t("dashboard.todoNewTask", "Nueva tarea"),
    subtitle: t("dashboard.todoTitle", "Tareas"),
    summary: t("dashboard.todoModalSummary", "Selecciona la máquina y completa los datos de la tarea."),
    iconSvg: TASK_ICON,
    className: "task-create-dialog"
  });
  renderMachineTaskComposer(
    shell.content,
    machines,
    async (values) => {
      await onCreate?.(values);
      shell.close();
    },
    true,
    shell.close,
    { modal: true }
  );
  window.requestAnimationFrame(() => {
    shell.content.querySelector("select")?.focus({ preventScroll: true });
  });
};
