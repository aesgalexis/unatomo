export const selectItems = (state) => state.items;

export const selectSelectedItem = (state) =>
  state.items.find((item) => item.id === state.ui.selectedId) || null;
