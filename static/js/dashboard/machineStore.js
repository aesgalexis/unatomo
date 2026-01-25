const STORAGE_KEY = "unatomo_machines_v1";

const loadMachines = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
