const activeSources = new Set();

const render = () => {
  const logo = document.querySelector(".topbar-logo--rotating");
  if (!logo) return;
  logo.classList.toggle("is-loading", activeSources.size > 0);
};

export const setTopbarLogoLoading = (source, loading) => {
  const key = String(source || "default");
  if (loading) activeSources.add(key);
  else activeSources.delete(key);
  render();
};

export const isTopbarLoadingMessage = (message = "") =>
  /^(cargando|guardando|subiendo|descargando|conectando|comprobando|iniciando|validando|creando|enviando|calculando|generando|preparando|loading|saving|uploading|downloading|connecting|checking|signing|validating|creating|sending|calculating|generating|preparing)\b/i.test(
    String(message).trim()
  );

const activitySelector = [
  "[aria-busy='true']",
  ".dashboard-loading",
  ".is-loading",
  ".is-uploading",
  ".is-downloading"
].join(",");

const statusSelector = "[role='status'], [aria-live]";
let observedRoot = null;
let stopObserving = null;

const isVisible = (element) =>
  !element.hidden && element.getClientRects().length > 0;

export const initTopbarLogoMotion = (root = document.body) => {
  render();
  if (!root || typeof MutationObserver === "undefined") return () => {};
  if (observedRoot === root && stopObserving) return stopObserving;
  if (stopObserving) stopObserving();
  let frame = 0;
  const update = () => {
    frame = 0;
    const hasActiveIndicator = Array.from(root.querySelectorAll(activitySelector)).some(
      (element) =>
        !element.classList.contains("topbar-logo--rotating") &&
        isVisible(element)
    );
    const hasLoadingStatus = Array.from(root.querySelectorAll(statusSelector)).some(
      (element) =>
        isVisible(element) && isTopbarLoadingMessage(element.textContent)
    );
    setTopbarLogoLoading("page-indicator", hasActiveIndicator || hasLoadingStatus);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["aria-busy", "class", "hidden", "style"],
    childList: true,
    characterData: true,
    subtree: true
  });
  schedule();
  const stop = () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    setTopbarLogoLoading("page-indicator", false);
    if (stopObserving === stop) {
      observedRoot = null;
      stopObserving = null;
    }
  };
  observedRoot = root;
  stopObserving = stop;
  return stop;
};

export const observeDashboardLoading = initTopbarLogoMotion;
