const MAX_TITLE = 64;
const MAX_DESCRIPTION = 1024;
const MAX_NOTE = 512;
const CUSTOM_UNITS = ["hours", "days", "weeks", "months", "years"];
const ASSIGNABLE_ROLES = ["operator", "technician"];
export const RESTORE_OPERATION_TASK_SOURCE = "status-out-of-service";

const normalizeInitialCycleProgress = (raw) => {
  const value = Number(raw?.initialCycleProgress);
  if (Number.isFinite(value)) return Math.max(0, Math.min(1, value));
  return raw?.initialCycleState === "overdue" ? 1 : 0;
};

const toIso = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeAttachment = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const url = String(raw.url || "").trim();
  if (!url) return null;
  return {
    id: raw.id || raw.documentId || raw.storagePath || `attachment_${Date.now()}`,
    documentId: raw.documentId || raw.id || "",
    name: String(raw.displayName || raw.name || "Imagen").trim().slice(0, 120),
    url,
    storagePath: String(raw.storagePath || "").trim(),
    contentType: String(raw.contentType || "").trim(),
    uploadedAt: toIso(raw.uploadedAt),
    uploadedBy: raw.uploadedBy || null
  };
};

export const normalizeTaskAssignee = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const userId = String(raw.userId || raw.id || "").trim().slice(0, 160);
  const username = String(raw.username || "").trim().slice(0, 60);
  const role = raw.role === "tecnico" ? "technician" : String(raw.role || "").trim();
  if ((!userId && !username) || !ASSIGNABLE_ROLES.includes(role)) return null;
  return { userId, username, role };
};

export const normalizeTask = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const frequency = raw.frequency || "diaria";
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
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(normalizeAttachment).filter(Boolean)
    : [];

  return {
    id: raw.id || `t_${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    frequency,
    customDueAmount: frequency === "custom" ? customAmount : null,
    customDueUnit: frequency === "custom" ? customUnit : null,
    initialCycleProgress:
      frequency === "puntual" ? 0 : normalizeInitialCycleProgress(raw),
    notes,
    attachments,
    createdAt: toIso(raw.createdAt),
    lastCompletedAt: raw.lastCompletedAt ?? null,
    createdBy: raw.createdBy || null,
    assignedTo: normalizeTaskAssignee(raw.assignedTo),
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
  initialCycleProgress,
  createdBy,
  assignedTo
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
  const normalizedFrequency = frequency || "puntual";
  return {
    task: {
      id: (window.crypto.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
      title: trimmed,
      description: trimmedDesc,
      frequency: normalizedFrequency,
      customDueAmount:
        normalizedFrequency === "custom"
          ? Math.max(1, Math.min(999, Number(customDueAmount || 1) || 1))
          : null,
      customDueUnit:
        normalizedFrequency === "custom" && CUSTOM_UNITS.includes(customDueUnit)
          ? customDueUnit
          : null,
      initialCycleProgress:
        normalizedFrequency === "puntual"
          ? 0
          : Math.max(0, Math.min(1, Number(initialCycleProgress) || 0)),
      notes: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      lastCompletedAt: null,
      createdBy: createdBy || null,
      assignedTo: normalizeTaskAssignee(assignedTo)
    }
  };
};

export const MAX_TASK_TITLE = MAX_TITLE;
export const MAX_TASK_DESCRIPTION = MAX_DESCRIPTION;
export const MAX_TASK_NOTE = MAX_NOTE;
export const CUSTOM_TASK_UNITS = CUSTOM_UNITS;
