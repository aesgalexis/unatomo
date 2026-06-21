import { t } from "/static/js/dashboard/i18n.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const durationDays = {
  diaria: 1,
  semanal: 7,
  mensual: 30,
  trimestral: 90,
  semestral: 182,
  anual: 365,
};

const customDurationMs = (task) => {
  const amount = Math.max(1, Number(task.customDueAmount || 1) || 1);
  const unit = task.customDueUnit || "days";
  if (unit === "hours") return amount * 60 * 60 * 1000;
  if (unit === "weeks") return amount * 7 * DAY;
  if (unit === "months") return amount * 30 * DAY;
  return amount * DAY;
};

const toMs = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return Date.now();
  return date.getTime();
};

const unitLabel = (key, count) => t(`tasks.${count === 1 ? key : `${key}s`}`, key);

const formatCount = (count, unitKey) => `${count} ${unitLabel(unitKey, count)}`;

const formatRemaining = (ms, frequency) => {
  if (frequency === "puntual") {
    return t("tasks.oneOff", "Tarea puntual");
  }
  const days = Math.ceil(ms / DAY);
  if (frequency === "diaria") {
    const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
    return `${t("tasks.dueIn", "Faltan")} ${formatCount(hours, "hour")}`;
  }
  if (frequency === "semanal") {
    if (days < 14) return `${t("tasks.dueIn", "Faltan")} ${formatCount(days, "day")}`;
    const weeks = Math.ceil(days / 7);
    return `${t("tasks.dueIn", "Faltan")} ${formatCount(weeks, "week")}`;
  }
  if (frequency === "mensual") {
    if (days >= 30) {
      const months = Math.ceil(days / 30);
      return `${t("tasks.dueIn", "Faltan")} ${formatCount(months, "month")}`;
    }
    return `${t("tasks.dueIn", "Faltan")} ${formatCount(days, "day")}`;
  }
  if (frequency === "trimestral" || frequency === "semestral" || frequency === "anual") {
    if (days >= 30) {
      const months = Math.ceil(days / 30);
      return `${t("tasks.dueIn", "Faltan")} ${formatCount(months, "month")}`;
    }
    return `${t("tasks.dueIn", "Faltan")} ${formatCount(days, "day")}`;
  }
  return `${t("tasks.dueIn", "Faltan")} ${formatCount(days, "day")}`;
};

const formatOverdue = (ms) => {
  const days = Math.ceil(ms / DAY);
  if (days >= 7) {
    const weeks = Math.ceil(days / 7);
    return `${t("tasks.overdue", "Vencida hace")} ${formatCount(weeks, "week")}`;
  }
  if (days >= 2) {
    return `${t("tasks.overdue", "Vencida hace")} ${formatCount(days, "day")}`;
  }
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return `${t("tasks.overdue", "Vencida hace")} ${formatCount(hours, "hour")}`;
};

export const getOverdueDuration = (task, nowMs = Date.now()) => {
  const baseMs = toMs(task.lastCompletedAt || task.createdAt);
  const nextDue =
    task.frequency === "custom"
      ? baseMs + customDurationMs(task)
      : baseMs + (durationDays[task.frequency] || 1) * DAY;
  const diff = nowMs - nextDue;
  if (diff <= 0) return "";
  const dayCount = Math.max(1, Math.ceil(diff / DAY));
  if (dayCount >= 30) {
    const months = Math.ceil(dayCount / 30);
    return formatCount(months, "month");
  }
  if (dayCount >= 7) {
    const weeks = Math.ceil(dayCount / 7);
    return formatCount(weeks, "week");
  }
  return formatCount(dayCount, "day");
};

export const getCompletionDuration = (task, nowMs = Date.now()) => {
  const baseMs = toMs(task.createdAt);
  const diff = Math.max(0, nowMs - baseMs);
  if (diff < HOUR) {
    const minutes = Math.max(1, Math.ceil(diff / MINUTE));
    return formatCount(minutes, "minute");
  }
  if (diff < DAY) {
    const hours = Math.max(1, Math.ceil(diff / HOUR));
    return formatCount(hours, "hour");
  }
  const dayCount = Math.max(1, Math.ceil(diff / DAY));
  if (dayCount >= 30) {
    const months = Math.ceil(dayCount / 30);
    return formatCount(months, "month");
  }
  if (dayCount >= 7) {
    const weeks = Math.ceil(dayCount / 7);
    return formatCount(weeks, "week");
  }
  return formatCount(dayCount, "day");
};

export const getTaskTiming = (task, nowMs = Date.now()) => {
  if (task.frequency === "puntual") {
    return {
      nextDue: toMs(task.createdAt),
      pending: true,
      label: t("tasks.oneOff", "Tarea puntual"),
    };
  }
  const baseMs = toMs(task.lastCompletedAt || task.createdAt);
  const nextDue =
    task.frequency === "custom"
      ? baseMs + customDurationMs(task)
      : baseMs + (durationDays[task.frequency] || 1) * DAY;
  const remaining = nextDue - nowMs;
  if (remaining <= 0) {
    return {
      nextDue,
      pending: true,
      label: formatOverdue(Math.abs(remaining)),
    };
  }
  return {
    nextDue,
    pending: false,
    label: formatRemaining(remaining, task.frequency),
  };
};
