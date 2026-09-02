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
  if (unit === "years") return amount * 365 * DAY;
  return amount * DAY;
};

const toMs = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return Date.now();
  return date.getTime();
};

const taskDurationMs = (task) =>
  task.frequency === "custom"
    ? customDurationMs(task)
    : (durationDays[task.frequency] || 1) * DAY;

const initialCycleProgress = (task) =>
  Math.max(0, Math.min(1, Number(task.initialCycleProgress) || 0));

const cycleBaseMs = (task) => {
  if (task.lastCompletedAt) return toMs(task.lastCompletedAt);
  return toMs(task.createdAt) - taskDurationMs(task) * initialCycleProgress(task);
};

const unitLabel = (key, count) => t(`tasks.${count === 1 ? key : `${key}s`}`, key);

const formatCount = (count, unitKey) => `${count} ${unitLabel(unitKey, count)}`;

const formatElapsedDuration = (ms) => {
  const diff = Math.max(0, ms);
  if (diff < HOUR) {
    return formatCount(Math.max(1, Math.ceil(diff / MINUTE)), "minute");
  }
  if (diff < DAY) {
    return formatCount(Math.max(1, Math.ceil(diff / HOUR)), "hour");
  }
  const dayCount = Math.max(1, Math.ceil(diff / DAY));
  if (dayCount >= 30) {
    return formatCount(Math.ceil(dayCount / 30), "month");
  }
  if (dayCount >= 7) {
    return formatCount(Math.ceil(dayCount / 7), "week");
  }
  return formatCount(dayCount, "day");
};

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
  const nextDue = cycleBaseMs(task) + taskDurationMs(task);
  const diff = nowMs - nextDue;
  if (diff <= 0) return "";
  return formatElapsedDuration(diff);
};

export const getCompletionDuration = (task, nowMs = Date.now()) => {
  return formatElapsedDuration(nowMs - toMs(task.createdAt));
};

export const getTaskTiming = (task, nowMs = Date.now()) => {
  if (task.frequency === "puntual") {
    return {
      nextDue: toMs(task.createdAt),
      pending: true,
      label: t("tasks.oneOff", "Tarea puntual"),
    };
  }
  const nextDue = cycleBaseMs(task) + taskDurationMs(task);
  const remaining = nextDue - nowMs;
  if (remaining <= 0) {
    return {
      nextDue,
      pending: true,
      label:
        !task.lastCompletedAt && initialCycleProgress(task) === 1 && Math.abs(remaining) < HOUR
          ? t("tasks.overdueNow", "Vencida ahora")
          : formatOverdue(Math.abs(remaining)),
    };
  }
  return {
    nextDue,
    pending: false,
    label: formatRemaining(remaining, task.frequency),
  };
};
