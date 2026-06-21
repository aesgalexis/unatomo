import { t } from "/static/js/dashboard/i18n.js";
import { STATUS_LABELS } from "../components/machineCard/machineCardTypes.js";

const completedBy = (user) =>
  user ? t("history.completedBy", (value) => ` - por ${value}`)(user) : "";

const formatTemplate = (template = "", params = {}) =>
  String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    params[key] == null ? match : String(params[key])
  );

const resolveMessageKey = (log = {}) => {
  if (!log.messageKey) return "";
  const value = t(log.messageKey, "");
  if (!value) return "";
  if (typeof value === "function") {
    const params = log.messageParams;
    return Array.isArray(params) ? value(...params) : value(params || {});
  }
  return formatTemplate(value, log.messageParams || {});
};

export const getTaskLogKeys = (log = {}) => {
  const keys = [];
  const taskId = String(log.taskId || "").trim();
  const title = String(log.title || "").trim().toLowerCase();
  if (taskId) keys.push(`id:${taskId}`);
  if (title) keys.push(`title:${title}`);
  return keys;
};

export const getPrimaryTaskLogKey = (log = {}) => getTaskLogKeys(log)[0] || "";

export const isTaskNoteLog = (log = {}) => log.type === "task_note_added";

export const isTaskAttachmentLog = (log = {}) =>
  log.type === "task_attachment_added";

export const isTaskCreatedLog = (log = {}) => log.type === "task_created";

export const formatHistoryLog = (log = {}, options = {}) => {
  if (log.type === "task") {
    const title = log.title || t("history.task", "Tarea");
    const user = completedBy(log.user);
    if (log.punctual) {
      const duration = log.completionDuration ? ` (${log.completionDuration})` : "";
      return `${t("history.oneOffCompleted", "Tarea puntual completada")}${duration}: ${title}${user}`;
    }
    const overdueText = log.overdueDuration
      ? t("history.lateSuffix", (text) => `, ${text} tarde`)(log.overdueDuration)
      : "";
    const prefix = log.overdue
      ? t("history.completedLate", (text) => `Tarea completada fuera de plazo${text}: `)(overdueText)
      : t("history.completed", "Tarea completada: ");
    return `${prefix}${title}${user}`;
  }

  if (log.type === "location") {
    const value = log.value ? log.value : t("history.noLocation", "Sin ubicacion");
    return `${t("history.location", "Ubicacion")} -> ${value}`;
  }

  if (log.type === "status") {
    const labelText = STATUS_LABELS[log.value] || log.value;
    const user = completedBy(log.user);
    return `${t("history.status", "Estado")} -> ${labelText}${user}`;
  }

  if (log.type === "task_created") {
    const title = log.title || t("history.task", "Tarea");
    const desc = log.description ? ` - ${log.description}` : "";
    const user = completedBy(log.user);
    return `${t("history.taskCreated", "Tarea creada")}: ${title}${desc}${user}`;
  }

  if (log.type === "task_removed") {
    const title = log.title || t("history.task", "Tarea");
    const desc = log.description ? ` - ${log.description}` : "";
    const user = completedBy(log.user);
    return `${t("history.taskRemoved", "Tarea eliminada")}: ${title}${desc}${user}`;
  }

  if (log.type === "task_note_added") {
    const title = log.title || t("history.task", "Tarea");
    const note = log.note ? ` - ${log.note}` : "";
    const user = completedBy(log.user);
    if (options.omitTaskTitle) {
      return `${t("history.taskNoteAdded", "Nota en tarea")}${note}${user}`;
    }
    return `${t("history.taskNoteAdded", "Nota en tarea")}: ${title}${note}${user}`;
  }

  if (log.type === "task_attachment_added") {
    const name = log.attachmentName || t("tasks.image", "Imagen");
    const image = String(log.contentType || "").startsWith("image/");
    const label = t(
      image ? "history.imageAdded" : "history.fileAdded",
      image ? "Imagen añadida" : "Archivo añadido"
    );
    const user = completedBy(log.user);
    return `${label}: ${name}${user}`;
  }

  if (log.type === "task_edited") {
    const title = log.title || t("history.task", "Tarea");
    const user = completedBy(log.user);
    return `${t("history.taskEdited", "Tarea editada")}: ${title}${user}`;
  }

  if (log.type === "admin_accept") {
    const admin = log.admin ? ` ${log.admin}` : "";
    const user = completedBy(log.user);
    return `${t("history.adminAccepted", "Administrador aceptado:")}${admin}${user}`;
  }

  if (log.type === "ownership_transfer") {
    const from = log.fromOwnerEmail ? String(log.fromOwnerEmail).trim() : "";
    const to = log.toOwnerEmail ? String(log.toOwnerEmail).trim() : "";
    const user = completedBy(log.user);
    if (from && to) {
      return `${t(
        "history.ownershipTransferredFromTo",
        (fromEmail, toEmail) => `Propiedad transferida de ${fromEmail} a ${toEmail}`
      )(from, to)}${user}`;
    }
    if (to) {
      return `${t(
        "history.ownershipTransferredTo",
        (email) => `Propiedad transferida a ${email}`
      )(to)}${user}`;
    }
    return `${t("history.ownershipTransferred", "Propiedad transferida")}${user}`;
  }

  if (log.type === "intervencion") {
    const message = log.message || "";
    const user = completedBy(log.user);
    return `${t("history.interventionLog", "Intervencion")}: ${message}${user}`;
  }

  return (
    log.summary ||
    log.message ||
    resolveMessageKey(log) ||
    log.type ||
    t("history.event", "Evento")
  );
};

export const buildHistoryPresentationEvent = (log = {}) => ({
  log,
  type: log.type || "",
  text: formatHistoryLog(log),
  timestamp: log.ts || "",
  user: log.user || "",
  taskId: log.taskId || "",
  groupKey: getPrimaryTaskLogKey(log),
  isTaskNote: isTaskNoteLog(log),
});
