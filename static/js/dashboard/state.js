export const ActionTypes = {
  ADD_ITEM: "ADD_ITEM",
  SELECT_ITEM: "SELECT_ITEM",
  UPDATE_ITEM: "UPDATE_ITEM",
  REMOVE_ITEM: "REMOVE_ITEM",
  SET_MODAL_OPEN: "SET_MODAL_OPEN",
};

export const createInitialState = (overrides = {}) => ({
  items: [],
  ui: {
    selectedId: null,
    isModalOpen: false,
    modalAnchor: null,
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
          selectedId: action.payload.id,
          isModalOpen: true,
          modalAnchor: action.payload.anchor || null,
        },
      };
    case ActionTypes.SELECT_ITEM:
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedId: action.payload?.id || null,
          isModalOpen: Boolean(action.payload?.id),
          modalAnchor: action.payload?.anchor || null,
        },
      };
    case ActionTypes.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.changes } : item
        ),
      };
    case ActionTypes.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        ui: {
          ...state.ui,
          selectedId: state.ui.selectedId === action.payload ? null : state.ui.selectedId,
          isModalOpen: state.ui.selectedId === action.payload ? false : state.ui.isModalOpen,
        },
      };
    case ActionTypes.SET_MODAL_OPEN:
      return {
        ...state,
        ui: {
          ...state.ui,
          isModalOpen: action.payload,
          selectedId: action.payload ? state.ui.selectedId : null,
          modalAnchor: action.payload ? state.ui.modalAnchor : null,
        },
      };
    default:
      return state;
  }
};

export const actions = {
  addItem: (payload) => ({ type: ActionTypes.ADD_ITEM, payload }),
  selectItem: (payload) => ({ type: ActionTypes.SELECT_ITEM, payload }),
  updateItem: (id, changes) => ({
    type: ActionTypes.UPDATE_ITEM,
    payload: { id, changes },
  }),
  removeItem: (id) => ({ type: ActionTypes.REMOVE_ITEM, payload: id }),
  setModalOpen: (open) => ({ type: ActionTypes.SET_MODAL_OPEN, payload: open }),
};
