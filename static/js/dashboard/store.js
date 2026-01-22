export const createStore = (reducer, preloadedState) => {
  let state = preloadedState;
  const listeners = new Set();

  const getState = () => state;

  const dispatch = (action) => {
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  dispatch({ type: "@@init" });

  return { getState, dispatch, subscribe };
};
