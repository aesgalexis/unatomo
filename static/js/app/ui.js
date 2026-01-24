import { normalizeHash, parseRoute, onRouteChange } from "./router.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderMachine } from "./pages/machine.js";

const clearMount = (mount) => {
  while (mount.firstChild) {
    mount.removeChild(mount.firstChild);
  }
};

export const initApp = (mountId) => {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const render = () => {
    clearMount(mount);
    const hash = normalizeHash();
    if (!window.location.hash) {
      window.location.hash = hash;
    }
    const route = parseRoute(hash);

    if (route.name === "machine") {
      renderMachine(mount, route);
      return;
    }

    renderDashboard(mount);
  };

  onRouteChange(render);
  render();
};
