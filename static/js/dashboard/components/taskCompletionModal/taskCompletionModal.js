import { t } from "../../i18n.js";

export const openTaskCompletionModal = ({ machineTitle = "", taskTitle = "" } = {}) =>
  new Promise((resolve) => {
    const previousActive = document.activeElement;
    const previousScrollY = window.scrollY || 0;
    const overlay = document.createElement("div");
    overlay.className = "status-incident-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "status-incident-dialog status-return-dialog";
    dialog.tabIndex = -1;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const modalTitle = t("dashboard.taskCompletionModalTitle", "Completar tarea puntual");
    dialog.setAttribute("aria-label", modalTitle);

    const title = document.createElement("h2");
    title.className = "status-incident-title";
    title.textContent = modalTitle;

    const machine = document.createElement("p");
    machine.className = "status-incident-machine";
    machine.textContent = machineTitle || t("machine.machine", "Equipo");

    const heading = document.createElement("div");
    heading.className = "status-incident-heading";
    heading.appendChild(title);
    heading.appendChild(machine);

    const statusIcon = document.createElement("span");
    statusIcon.className = "status-incident-warning-icon";
    statusIcon.setAttribute("aria-hidden", "true");
    statusIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>';

    const header = document.createElement("div");
    header.className = "status-incident-header";
    header.appendChild(heading);
    header.appendChild(statusIcon);

    const form = document.createElement("form");
    form.className = "status-incident-form";

    const summary = document.createElement("p");
    summary.className = "status-incident-summary";
    summary.textContent = t(
      "dashboard.taskCompletionModalSummary",
      (name) => `La tarea «${name}» se marcará como completada.`
    )(taskTitle || t("tasks.oneOff", "Tarea puntual"));

    const actions = document.createElement("div");
    actions.className = "status-incident-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "status-incident-cancel";
    cancel.textContent = t("dashboard.cancel", "Cancelar");

    const confirm = document.createElement("button");
    confirm.type = "submit";
    confirm.className = "status-incident-confirm status-return-confirm";
    confirm.textContent = t("dashboard.taskCompletionModalConfirm", "Completar tarea");

    actions.appendChild(cancel);
    actions.appendChild(confirm);
    form.appendChild(summary);
    form.appendChild(actions);
    dialog.appendChild(header);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.setProperty("--status-incident-scroll-top", `${-previousScrollY}px`);
    document.body.classList.add("status-incident-open");

    const cleanup = (confirmed) => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.classList.remove("status-incident-open");
      document.body.style.removeProperty("--status-incident-scroll-top");
      overlay.remove();
      window.scrollTo(0, previousScrollY);
      if (previousActive && typeof previousActive.focus === "function") {
        try {
          previousActive.focus({ preventScroll: true });
        } catch {
          previousActive.focus();
        }
      }
      resolve(confirmed);
    };

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cleanup(false);
    }

    cancel.addEventListener("click", () => cleanup(false));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      cleanup(true);
    });
    document.addEventListener("keydown", onKeyDown, true);
    window.requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  });
