export const createDashboardMachineState = (dependencies) => {
  const { getDraftIndex, list, recalcHeight, state } = dependencies;
  const updateMachine = (id, patch) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = { ...state.draftMachines[idx], ...patch };
  };

  const replaceMachine = (id, next) => {
    const idx = getDraftIndex(id);
    if (idx === -1) return;
    state.draftMachines[idx] = next;
  };

  const removeMachineFromState = (id) => {
    state.draftMachines = state.draftMachines.filter((m) => m.id !== id);
  };

  const computeNextOrder = () => {
    const maxOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order > acc ? m.order : acc),
      -1
    );
    return maxOrder + 1;
  };

  const computePrevOrder = () => {
    const minOrder = state.draftMachines.reduce(
      (acc, m) => (typeof m.order === "number" && m.order < acc ? m.order : acc),
      0
    );
    return state.draftMachines.length ? minOrder - 1 : 0;
  };

  const updateTagStatusUI = (id) => {
    const status = state.tagStatusById[id];
    const card = list.querySelector(`.machine-card[data-machine-id="${id}"]`);
    if (!card) return;
    const statusEl = card.querySelector('.mc-panel[data-panel="configuracion"] .mc-tag-status');
    if (!statusEl) return;
    statusEl.textContent = status.text || "";
    statusEl.dataset.state = status.state || "";
    if (card.dataset.expanded === "true") {
      requestAnimationFrame(() => recalcHeight(card));
    }
  };

  const isOwnerMachine = (machine) => (machine.role || "owner") === "owner";
  return {
    computeNextOrder,
    computePrevOrder,
    isOwnerMachine,
    removeMachineFromState,
    replaceMachine,
    updateMachine,
    updateTagStatusUI
  };

};
