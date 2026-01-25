const STORAGE_KEY = "unatomo_machines_v1";

const normalizeMachine = (raw, index) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || generateId(),
    title: raw.title || raw.nombre || `Equipo ${index + 1}`,
    brand: typeof raw.brand === "string" ? raw.brand : "",
    model: typeof raw.model === "string" ? raw.model : "",
    year: typeof raw.year === "number" ? raw.year : null,
    status: raw.status || "operativa",
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    url: typeof raw.url === "string" ? raw.url : "",
    users: Array.isArray(raw.users) ? raw.users : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : []
  };
};

const loadMachines = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, idx) => normalizeMachine(item, idx))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const saveMachines = (list) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

const generateId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `m_${Math.random().toString(36).slice(2, 10)}`;
};

const addMachine = (list) => {
  const count = list.length + 1;
  const machine = {
    id: generateId(),
    title: `Equipo ${count}`,
    brand: "",
    model: "",
    year: null,
    status: "operativa",
    logs: [],
    url: "",
    users: [],
    tasks: []
  };
  const next = [machine, ...list];
  saveMachines(next);
  return { machine, list: next };
};

export { loadMachines, saveMachines, addMachine };
