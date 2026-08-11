const VALID_STATUSES = new Set(["operativa", "fuera_de_servicio", "desconectada"]);

const toTime = (value) => {
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : null;
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const buildMachineStatistics = (machine = {}, now = Date.now(), options = {}) => {
  const createdAt = toTime(machine.createdAt);
  const statusLogs = (Array.isArray(machine.logs) ? machine.logs : [])
    .filter((log) => log?.type === "status" && VALID_STATUSES.has(log.value))
    .map((log) => ({ ...log, time: toTime(log.ts) }))
    .filter((log) => log.time !== null && log.time <= now)
    .sort((a, b) => a.time - b.time);

  const durations = { operativa: 0, fuera_de_servicio: 0, desconectada: 0 };
  const firstStatus = statusLogs[0]?.value || null;
  const initialStatus = firstStatus
    ? (firstStatus === "operativa" ? "fuera_de_servicio" : "operativa")
    : (VALID_STATUSES.has(machine.status) ? machine.status : "operativa");
  const recordedStart = createdAt ?? statusLogs[0]?.time ?? null;
  const requestedStart = Number.isFinite(options.periodStart) ? options.periodStart : recordedStart;
  const periodStart = recordedStart === null
    ? requestedStart
    : Math.max(recordedStart, requestedStart ?? recordedStart);
  let statusAtPeriodStart = initialStatus;
  statusLogs.forEach((log) => {
    if (periodStart !== null && log.time <= periodStart) statusAtPeriodStart = log.value;
  });
  if (periodStart !== null && periodStart <= now) {
    let cursor = periodStart;
    let currentStatus = statusAtPeriodStart;
    statusLogs.filter((log) => log.time > periodStart).forEach((log) => {
      durations[currentStatus] += Math.max(0, log.time - cursor);
      cursor = log.time;
      currentStatus = log.value;
    });
    durations[currentStatus] += Math.max(0, now - cursor);
  }

  const availabilityBase = durations.operativa + durations.fuera_de_servicio;
  const availability = availabilityBase > 0
    ? (durations.operativa / availabilityBase) * 100
    : null;

  const recoveries = [];
  let incidentStart = periodStart !== null && statusAtPeriodStart !== "operativa" ? periodStart : null;
  statusLogs.filter((log) => periodStart === null || log.time > periodStart).forEach((log) => {
    if ((log.value === "fuera_de_servicio" || log.value === "desconectada") && incidentStart === null) {
      incidentStart = log.time;
    } else if (log.value === "operativa" && incidentStart !== null) {
      recoveries.push(Math.max(0, log.time - incidentStart));
      incidentStart = null;
    }
  });

  const completionLogs = (Array.isArray(machine.logs) ? machine.logs : [])
    .filter((log) => log?.type === "task")
    .filter((log) => {
      if (periodStart === null) return true;
      const time = toTime(log.ts);
      return time !== null && time >= periodStart && time <= now;
    });
  const onTimeCount = completionLogs.filter((log) => !log.overdue).length;
  const tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
  const overdueTasks = typeof options.isOverdue === "function"
    ? tasks.filter((task) => options.isOverdue(task, now))
    : [];
  const activeIncidentDuration = incidentStart === null ? null : Math.max(0, now - incidentStart);
  const incidentDurations = activeIncidentDuration === null
    ? recoveries
    : [...recoveries, activeIncidentDuration];

  return {
    status: {
      hasData: createdAt !== null || statusLogs.length > 0,
      since: periodStart,
      currentSince: statusLogs.at(-1)?.time ?? createdAt,
      durations,
      availability
    },
    incidents: {
      total: recoveries.length + (incidentStart === null ? 0 : 1),
      closed: recoveries.length,
      medianRecovery: median(recoveries),
      longest: incidentDurations.length ? Math.max(...incidentDurations) : null,
      activeDuration: activeIncidentDuration
    },
    tasks: {
      completed: completionLogs.length,
      onTimeRate: completionLogs.length ? (onTimeCount / completionLogs.length) * 100 : null,
      pending: tasks.length,
      overdue: overdueTasks.length
    }
  };
};
