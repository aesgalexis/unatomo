import { t } from "/static/js/dashboard/i18n.js";
import { STATUS_LABELS } from "../components/machineCard/machineCardTypes.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const total = machine.logs ? machine.logs.length : 0;

  const locale = document.documentElement.lang === "en" ? "en-GB" : "es-ES";
  const completedBy = (user) => (user ? t("history.completedBy", (value) => ` - por ${value}`)(user) : "");

  const form = document.createElement("div");
  form.className = "mc-log-form";

  const label = document.createElement("span");
  label.className = "mc-log-label";
  label.textContent = t("history.intervention", "Intervención");

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 255;
  input.className = "mc-log-input";
  input.addEventListener("click", (event) => event.stopPropagation());

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mc-log-btn";
  btn.textContent = t("history.register", "Registrar");
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const value = input.value.trim();
    if (!value) return;
    if (hooks.onAddIntervention) hooks.onAddIntervention(machine, value);
    input.value = "";
  });

  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(btn);
  panel.appendChild(form);

  const sepTop = document.createElement("hr");
  sepTop.className = "mc-sep";
  panel.appendChild(sepTop);

  const list = document.createElement("div");
  list.className = "mc-log-list";
  if (!total) {
    const empty = document.createElement("div");
    empty.className = "mc-log-item";
    empty.textContent = t("history.empty", "Sin registros.");
    list.appendChild(empty);
  }

  [...(machine.logs || [])]
    .slice()
    .reverse()
    .slice(0, 16)
    .forEach((log) => {
      const item = document.createElement("div");
      item.className = "mc-log-item";
      const time = new Date(log.ts).toLocaleString(locale);
      if (log.type === "task") {
        const title = log.title || t("history.task", "Tarea");
        const user = completedBy(log.user);
        if (log.punctual) {
          const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
          item.textContent = `${time} - ${t("history.oneOffCompleted", "Tarea puntual completada")}${duration}: ${title}${user}`;
        } else {
          const overdueText = log.overdueDuration ? t("history.lateSuffix", (text) => `, ${text} tarde`)(log.overdueDuration) : "";
          const prefix = log.overdue
            ? t("history.completedLate", (text) => `Tarea completada fuera de plazo${text}: `)(overdueText)
            : t("history.completed", "Tarea completada: ");
          item.textContent = `${time} - ${prefix}${title}${user}`;
        }
      } else if (log.type === "location") {
        const value = log.value ? log.value : t("history.noLocation", "Sin ubicación");
        item.textContent = `${time} - ${t("history.location", "Ubicación")} -> ${value}`;
      } else if (log.type === "status") {
        const labelText = STATUS_LABELS[log.value] || log.value;
        const user = completedBy(log.user);
        item.textContent = `${time} - ${t("history.status", "Estado")} -> ${labelText}${user}`;
      } else if (log.type === "task_created") {
        const title = log.title || t("history.task", "Tarea");
        const desc = log.description ? ` - ${log.description}` : "";
        const user = completedBy(log.user);
        item.textContent = `${time} - ${t("history.taskCreated", "Tarea creada")}: ${title}${desc}${user}`;
      } else if (log.type === "task_removed") {
        const title = log.title || t("history.task", "Tarea");
        const desc = log.description ? ` - ${log.description}` : "";
        const user = completedBy(log.user);
        item.textContent = `${time} - ${t("history.taskRemoved", "Tarea eliminada")}: ${title}${desc}${user}`;
      } else if (log.type === "admin_accept") {
        const admin = log.admin ? ` ${log.admin}` : "";
        const user = completedBy(log.user);
        item.textContent = `${time} - ${t("history.adminAccepted", "Administrador aceptado:")}${admin}${user}`;
      } else if (log.type === "intervencion") {
        const message = log.message || "";
        const user = completedBy(log.user);
        item.textContent = `${time} - ${t("history.interventionLog", "Intervencion")}: ${message}${user}`;
      } else {
        item.textContent = `${time} - ${log.type || t("history.event", "Evento")}`;
      }
      list.appendChild(item);
    });
  panel.appendChild(list);

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  const footer = document.createElement("div");
  footer.className = "mc-log-footer";

  const counter = document.createElement("div");
  counter.className = "mc-log-header";
  const visibleCount = Math.min(16, total);
  counter.textContent = `${visibleCount}/${total}`;
  footer.appendChild(counter);

  if (options.canDownloadHistory !== false) {
    const download = document.createElement("a");
    download.className = "mc-log-download";
    download.setAttribute("aria-label", t("history.download", "Descargar registro completo"));
    download.setAttribute("data-tooltip", t("history.download", "Descargar registro completo"));
    download.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/></svg>';
    let tipEl = null;
    const showTip = (event) => {
      const labelText = download.getAttribute("data-tooltip");
      if (!labelText) return;
      tipEl = document.createElement("div");
      tipEl.className = "mc-tooltip";
      tipEl.textContent = labelText;
      document.body.appendChild(tipEl);
      const x = (event && event.clientX) || 0;
      const y = (event && event.clientY) || 0;
      const left = x + 12;
      const top = y - tipEl.offsetHeight - 10;
      tipEl.style.top = `${Math.max(8, top)}px`;
      tipEl.style.left = `${Math.max(8, left)}px`;
    };
    const hideTip = () => {
      if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
      tipEl = null;
    };
    download.addEventListener("mouseenter", showTip);
    download.addEventListener("mouseleave", hideTip);
    download.addEventListener("blur", hideTip);
    download.href = "#";
    download.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onDownloadLogs) hooks.onDownloadLogs(machine);
    });
    footer.appendChild(download);
  }
  panel.appendChild(footer);
};
