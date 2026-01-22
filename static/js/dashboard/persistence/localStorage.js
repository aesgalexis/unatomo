import { createAdapter } from "./adapter.js";

const STORAGE_KEY = "unatomo-dashboard-state";

const load = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const save = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures.
  }
};

export const localStorageAdapter = createAdapter({ load, save });
