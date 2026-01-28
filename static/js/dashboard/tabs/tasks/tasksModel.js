const MAX_TITLE = 64;

const toIso = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

export const normalizeTask = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const description = typeof raw.description === "string" ? raw.description : (typeof raw.title === "string" ? raw.title : "");
  let title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    title = description ? description.trim().slice(0, MAX_TITLE) : "Tarea";
  }
  if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);

  return {
    id: raw.id || `t_${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    frequency: raw.frequency || "diaria",
    createdAt: toIso(raw.createdAt),
    lastCompletedAt: raw.lastCompletedAt ?? null,
    createdBy: raw.createdBy || null
  };
};

export const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(normalizeTask).filter(Boolean);
};

export const createTask = ({ title, description, frequency, createdBy }) => {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) return { error: "title" };
  const trimmed = cleanTitle.length > MAX_TITLE ? cleanTitle.slice(0, MAX_TITLE) : cleanTitle;
  return {
    task: {
      id: (window.crypto?.randomUUID && window.crypto.randomUUID()) || `t_${Date.now()}`,
      title: trimmed,
      description: (description || "").trim(),
      frequency: frequency || "diaria",
      createdAt: new Date().toISOString(),
      lastCompletedAt: null,
      createdBy: createdBy || null
    }
  };
};

export const MAX_TASK_TITLE = MAX_TITLE;
