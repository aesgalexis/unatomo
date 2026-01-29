import { normalizeTasks } from "/static/js/dashboard/tabs/tasks/tasksModel.js";

const generateId = () => {
  if (window.crypto.randomUUID) return window.crypto.randomUUID();
  return `m_${Math.random().toString(36).slice(2, 10)}`;
};

export const cloneMachines = (list) => {
  if (typeof structuredClone === "function") return structuredClone(list);
  return JSON.parse(JSON.stringify(list || []));
};

export const normalizeMachine = (raw, index = 0) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || generateId(),
    title: raw.title || raw.nombre || `Equipo ${index + 1}`,
    brand: typeof raw.brand === "string" ? raw.brand : "",
    model: typeof raw.model === "string" ? raw.model : "",
    serial: typeof raw.serial === "string" ? raw.serial : "",
    year: typeof raw.year === "number" ? raw.year : null,
    status: raw.status === "desconectada" ? "fuera_de_servicio" : raw.status || "operativa",
    location: typeof raw.location === "string" ? raw.location : "",
    tagId: typeof raw.tagId === "string" ? raw.tagId : null,
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    tasks: normalizeTasks(raw.tasks),
    users: Array.isArray(raw.users) ? raw.users : [],
    notifications:
      typeof raw.notifications === "object" && raw.notifications
        ? raw.notifications
        : {
          enabled: false,
          email: "",
          events: {
            statusChanged: false,
            taskOverdue: false,
            taskLateCompleted: false,
            tagDisconnected: false
          }
        },
    order: typeof raw.order === "number" ? raw.order : index,
    isNew: !!raw.isNew
  };
};

export const createDraftMachine = (count, order) => {
  return {
    id: generateId(),
    title: `Equipo ${count}`,
    brand: "",
    model: "",
    serial: "",
    year: null,
    status: "operativa",
    location: "",
    tagId: null,
    logs: [],
    tasks: [],
    users: [],
    notifications: {
      enabled: false,
      email: "",
      events: {
        statusChanged: false,
        taskOverdue: false,
        taskLateCompleted: false,
        tagDisconnected: false
      }
    },
    order,
    isNew: true
  };
};
