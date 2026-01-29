import { STATUS_LABELS } from "../components/machineCard/machineCardTypes.js";

export const render = (panel, machine, hooks, options = {}) => {
  panel.innerHTML = "";
  const total = machine.logs ? machine.logs.length : 0;

  const form = document.createElement("div");
  form.className = "mc-log-form";

  const label = document.createElement("span");
  label.className = "mc-log-label";
  label.textContent = "Registrar intervencion";

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 255;
  input.className = "mc-log-input";
  input.addEventListener("click", (event) => event.stopPropagation());

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mc-log-btn";
  btn.textContent = "Registrar";
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
  if (!total) {
    const empty = document.createElement("div");
    empty.className = "mc-log-item";
    empty.textContent = "Sin registros.";
    list.appendChild(empty);
  }
  [...(machine.logs || [])]
    .slice()
    .reverse()
    .slice(0, 16)
    .forEach((log) => {
      const item = document.createElement("div");
      item.className = "mc-log-item";
      const time = new Date(log.ts).toLocaleString("es-ES");
      if (log.type === "task") {
        const title = log.title || "Tarea";
        const user = log.user ? ` - por ${log.user}` : "";
        const prefix = log.overdue
          ? "Tarea completada fuera de plazo: "
          : "Tarea completada: ";
        item.textContent = `${time} - ${prefix}${title}${user}`;
      } else if (log.type === "location") {
        const value = log.value ? log.value : "Sin ubicacion";
        item.textContent = `${time} - Ubicacion -> ${value}`;
      } else if (log.type === "status") {
        const label = STATUS_LABELS[log.value] || log.value;
        item.textContent = `${time} - Estado -> ${label}`;
      } else if (log.type === "intervencion") {
        const message = log.message || "";
        const user = log.user ? ` - por ${log.user}` : "";
        item.textContent = `${time} - Intervencion: ${message}${user}`;
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
