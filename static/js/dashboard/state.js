export const ActionTypes = {
  ADD_ITEM: "ADD_ITEM",
  SELECT_ITEM: "SELECT_ITEM",
  UPDATE_ITEM: "UPDATE_ITEM",
  SET_MODAL_OPEN: "SET_MODAL_OPEN",
};

export const createInitialState = (overrides = {}) => ({
  items: [],
  ui: {
    selectedId: null,
    isModalOpen: false,
  },
  ...overrides,
});

export const reducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.ADD_ITEM:
      return {
        ...state,
        items: [...state.items, action.payload],
        ui: {
          ...state.ui,
          selectedId: state.ui.selectedId,
          isModalOpen: state.ui.isModalOpen,
        },
      };
    case ActionTypes.SELECT_ITEM:
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedId: action.payload,
          isModalOpen: Boolean(action.payload),
        },
      };
    case ActionTypes.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.changes } : item
        ),
      };
    case ActionTypes.SET_MODAL_OPEN:
      return {
        ...state,
        ui: {
          ...state.ui,
          isModalOpen: action.payload,
          selectedId: action.payload ? state.ui.selectedId : null,
        },
      };
    default:
      return state;
  }
};

export const actions = {
  addItem: (payload) => ({ type: ActionTypes.ADD_ITEM, payload }),
  selectItem: (id) => ({ type: ActionTypes.SELECT_ITEM, payload: id }),
  updateItem: (id, changes) => ({
    type: ActionTypes.UPDATE_ITEM,
    payload: { id, changes },
  }),
  setModalOpen: (open) => ({ type: ActionTypes.SET_MODAL_OPEN, payload: open }),
};
