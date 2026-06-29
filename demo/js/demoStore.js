import { cloneMachines, createDraftMachine, normalizeMachine } from "/static/js/dashboard/machineStore.js";
import { createDemoLayout, createDemoMachines } from "./demoSeed.js";

const STORAGE_KEY = "unatomo_demo_dashboard_v1";

const normalizeMachines = (machines = []) =>
  machines
    .map((machine, index) => normalizeMachine(machine, index))
    .filter(Boolean);

const createInitialState = () => ({
  machines: normalizeMachines(createDemoMachines()),
  layout: createDemoLayout(),
  selectedTabById: {},
  expandedById: []
});

export const createDemoStore = () => {
  let state = createInitialState();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.machines)) return state;
      state = {
        ...createInitialState(),
        ...parsed,
        machines: normalizeMachines(parsed.machines),
        layout: {
          ...createDemoLayout(),
          ...(parsed.layout || {})
        },
        selectedTabById: parsed.selectedTabById || {},
        expandedById: Array.isArray(parsed.expandedById) ? parsed.expandedById : []
      };
    } catch {
      state = createInitialState();
    }
    return state;
  };

  const reset = () => {
    state = createInitialState();
    save();
    return state;
  };

  const getState = () => state;

  const getMachine = (id) => state.machines.find((machine) => machine.id === id) || null;

  const updateMachine = (id, patch = {}) => {
    state = {
      ...state,
      machines: state.machines.map((machine) =>
        machine.id === id
          ? normalizeMachine({ ...machine, ...patch }, machine.order || 0)
          : machine
      )
    };
    save();
    return getMachine(id);
  };

  const replaceMachine = (id, nextMachine = {}) => {
    state = {
      ...state,
      machines: state.machines.map((machine, index) =>
        machine.id === id ? normalizeMachine(nextMachine, index) : machine
      )
    };
    save();
    return getMachine(id);
  };

  const updateUiState = (patch = {}) => {
    state = { ...state, ...patch };
    save();
  };

  const addMachine = () => {
    const order = state.machines.reduce((max, machine) => Math.max(max, Number(machine.order || 0)), -1) + 1;
    const machine = normalizeMachine(
      {
        ...createDraftMachine(state.machines.length + 1, order),
        ownerEmail: "demo@unatomo.com",
        title: `Equipo demo ${state.machines.length + 1}`,
        location: "Nueva ubicacion",
        logs: [{
          ts: new Date().toISOString(),
          type: "intervencion",
          message: "Maquina creada en demo",
          user: "Demo"
        }]
      },
      state.machines.length
    );
    state = {
      ...state,
      machines: [...state.machines, machine],
      expandedById: [machine.id],
      selectedTabById: {
        ...(state.selectedTabById || {}),
        [machine.id]: "general"
      }
    };
    save();
    return machine;
  };

  load();

  return {
    getState,
    getMachine,
    updateMachine,
    replaceMachine,
    updateUiState,
    addMachine,
    reset,
    cloneMachines: () => cloneMachines(state.machines)
  };
};
