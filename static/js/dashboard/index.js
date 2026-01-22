import { createStore } from "./store.js";
import { createInitialState, reducer } from "./state.js";
import { localStorageAdapter } from "./persistence/localStorage.js";
import { createCanvas } from "./ui/canvas.js";
import { createContextMenu } from "./ui/contextMenu.js";
import { createInspector } from "./ui/inspector.js";

const mount = document.getElementById("dashboard-mount");

if (mount) {
  const persisted = localStorageAdapter.load();
  const initialState = createInitialState({
    ...(persisted || {}),
    ui: {
      ...(persisted?.ui || {}),
      isModalOpen: false,
      selectedId: null,
    },
  });
  const store = createStore(reducer, initialState);

  const { rect } = createCanvas(store, mount);
  const toolbar = createContextMenu(store);
  const inspector = createInspector(store);

  rect.appendChild(toolbar);
  rect.appendChild(inspector);

  store.subscribe(() => {
    localStorageAdapter.save(store.getState());
  });
}
