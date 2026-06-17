const MAX_TITLE = 64;
const MAX_DESCRIPTION = 1024;
const MAX_NOTE = 512;
const CUSTOM_UNITS = ["hours", "days", "weeks", "months"];
const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const toIso = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

export const normalizeTask = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const description =
    typeof raw.description === "string"
      ? raw.description.slice(0, MAX_DESCRIPTION)
      : typeof raw.title === "string"
      ? raw.title
      : "";
  let title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    title = description ? description.trim().slice(0, MAX_TITLE) : "Tarea";
  }
  if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);

  const customAmount = Math.max(1, Math.min(999, Number(raw.customDueAmount || 1) || 1));
  const customUnit = CUSTOM_UNITS.includes(raw.customDueUnit) ? raw.customDueUnit : "days";
  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .map((note) => {
          if (!note || typeof note !== "object") return null;
          const text =
            typeof note.text === "string"
              ? note.text.trim().slice(0, MAX_NOTE)
              : "";
          if (!text) return null;
          return {
            id: note.id || `n_${Math.random().toString(36).slice(2, 8)}`,
            text,
            createdAt: toIso(note.createdAt),
            createdBy: note.createdBy || null
          };
        })
        .filter(Boolean)
    : [];

  return {
    id: raw.id || `t_${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    frequency: raw.frequency || "diaria",
    customDueAmount: raw.frequency === "custom" ? customAmount : null,
    customDueUnit: raw.frequency === "custom" ? customUnit : null,
    notes,
    createdAt: toIso(raw.createdAt),
    lastCompletedAt: raw.lastCompletedAt ?? null,
    createdBy: raw.createdBy || null,
    source: raw.source || null,
    automated: raw.automated === true,
    statusTarget: raw.statusTarget || null,
    statusCycleId: raw.statusCycleId || null
  };
};

export const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map(normalizeTask)
    .filter(Boolean)
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aRestore = a.task.source === RESTORE_OPERATION_TASK_SOURCE ? 0 : 1;
      const bRestore = b.task.source === RESTORE_OPERATION_TASK_SOURCE ? 0 : 1;
      if (aRestore !== bRestore) return aRestore - bRestore;
      return a.index - b.index;
    })
    .map(({ task }) => task);
};

export const createTask = ({
  title,
  description,
  frequency,
  customDueAmount,
  customDueUnit,
  createdBy
}) => {
  const cleanDesc = (description || "").trim();
  const trimmedDesc =
    cleanDesc.length > MAX_DESCRIPTION
      ? cleanDesc.slice(0, MAX_DESCRIPTION)
      : cleanDesc;
  const cleanTitle = (title || "").trim();
  const baseTitle = cleanTitle || "Tarea";
  const trimmed =
    baseTitle.length > MAX_TITLE ? baseTitle.slice(0, MAX_TITLE) : baseTitle;
  return {
    task: {
      id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
      title: trimmed,
      description: trimmedDesc,
      frequency: frequency || "puntual",
      customDueAmount:
        frequency === "custom"
          ? Math.max(1, Math.min(999, Number(customDueAmount || 1) || 1))
          : null,
      customDueUnit:
        frequency === "custom" && CUSTOM_UNITS.includes(customDueUnit)
          ? customDueUnit
          : null,
      notes: [],
      createdAt: new Date().toISOString(),
      lastCompletedAt: null,
      createdBy: createdBy || null
    }
  };
};

export const MAX_TASK_TITLE = MAX_TITLE;
export const MAX_TASK_DESCRIPTION = MAX_DESCRIPTION;
export const MAX_TASK_NOTE = MAX_NOTE;
export const CUSTOM_TASK_UNITS = CUSTOM_UNITS;
