import { STATUS_LABELS } from "../components/machineCard/machineCardTypes.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const total = machine.logs  machine.logs.length : 0;
  if (!total) {
    panel.textContent = "Sin registros.";
    return;
  }
  const header = document.createElement("div");
  header.className = "mc-log-header";
  const visibleCount = Math.min(16, total);
  header.textContent = `${visibleCount}/${total}`;
  panel.appendChild(header);

  const sepTop = document.createElement("hr");
  sepTop.className = "mc-sep";
  panel.appendChild(sepTop);

  const list = document.createElement("div");
  list.className = "mc-log-list";
  [...machine.logs]
    .slice()
    .reverse()
    .slice(0, 16)
    .forEach((log) => {
      const item = document.createElement("div");
      item.className = "mc-log-item";
      const time = new Date(log.ts).toLocaleString("es-ES");
      if (log.type === "task") {
        const title = log.title || "Tarea";
        const user = log.user  ` - por ${log.user}` : "";
        const prefix = log.overdue  "Tarea completada fuera de plazo: " : "Tarea completada: ";
        item.textContent = `${time} - ${prefix}${title}${user}`;
      } else if (log.type === "status") {
        const label = STATUS_LABELS[log.value] || log.value;
        item.textContent = `${time} - Estado -> ${label}`;
      } else {
        item.textContent = `${time} - ${log.type || "Evento"}`;
      }
      list.appendChild(item);
    });
  panel.appendChild(list);

  const sep = document.createElement("hr");
  sep.className = "mc-sep";
  panel.appendChild(sep);

  if (options.canDownloadHistory !== false) {
    const download = document.createElement("a");
    download.className = "mc-log-download";
    download.textContent = "Descargar registro completo";
    download.href = "#";
    download.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hooks.onDownloadLogs) hooks.onDownloadLogs(machine);
    });
    panel.appendChild(download);
  }
};
