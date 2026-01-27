const DAY = 24 * 60 * 60 * 1000;
const durationDays = {
  diaria: 1,
  semanal: 7,
  mensual: 30,
  trimestral: 90,
  semestral: 182,
  anual: 365
};

const toMs = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return Date.now();
  return date.getTime();
};

const formatCount = (count, unitSingular, unitPlural) => {
  return count === 1 ? `${count} ${unitSingular}` : `${count} ${unitPlural}`;
};

const formatRemaining = (ms, frequency) => {
  const days = Math.ceil(ms / DAY);
  if (frequency === "diaria") {
    const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
    return `Faltan ${formatCount(hours, "hora", "horas")}`;
  }
  if (frequency === "semanal") {
    if (days < 14) return `Faltan ${formatCount(days, "d?a", "d?as")}`;
    const weeks = Math.ceil(days / 7);
    return `Faltan ${formatCount(weeks, "semana", "semanas")}`;
  }
  if (frequency === "mensual") {
    if (days >= 30) {
      const months = Math.ceil(days / 30);
      return `Faltan ${formatCount(months, "mes", "meses")}`;
    }
    return `Faltan ${formatCount(days, "d?a", "d?as")}`;
  }
  if (frequency === "trimestral" || frequency === "semestral" || frequency === "anual") {
    if (days >= 30) {
      const months = Math.ceil(days / 30);
      return `Faltan ${formatCount(months, "mes", "meses")}`;
    }
    return `Faltan ${formatCount(days, "d?a", "d?as")}`;
  }
  return `Faltan ${formatCount(days, "d?a", "d?as")}`;
};

const formatOverdue = (ms) => {
  const days = Math.ceil(ms / DAY);
  if (days >= 7) {
    const weeks = Math.ceil(days / 7);
    return `Vencida hace ${formatCount(weeks, "semana", "semanas")}`;
  }
  if (days >= 2) {
    return `Vencida hace ${formatCount(days, "d?a", "d?as")}`;
  }
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return `Vencida hace ${formatCount(hours, "hora", "horas")}`;
};

export const getTaskTiming = (task, nowMs = Date.now()) => {
  const baseMs = toMs(task.lastCompletedAt || task.createdAt);
  const days = durationDays[task.frequency] || 1;
  const nextDue = baseMs + days * DAY;
  const remaining = nextDue - nowMs;
  if (remaining <= 0) {
    return {
      nextDue,
      pending: true,
      label: formatOverdue(Math.abs(remaining))
    };
  }
  return {
    nextDue,
    pending: false,
    label: formatRemaining(remaining, task.frequency)
  };
};
