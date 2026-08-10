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
  /^(cargando|guardando|subiendo|loading|saving|uploading)\b/i.test(
    String(message).trim()
  );

const activitySelector = [
  "[aria-busy='true']",
  ".dashboard-loading",
  ".is-loading",
  ".is-uploading",
  ".is-downloading"
].join(",");

export const observeDashboardLoading = (root = document.body) => {
  if (!root || typeof MutationObserver === "undefined") return () => {};
  let frame = 0;
  const update = () => {
    frame = 0;
    const active = Array.from(root.querySelectorAll(activitySelector)).some(
      (element) =>
        !element.classList.contains("topbar-logo--rotating") &&
        !element.hidden &&
        element.getClientRects().length > 0
    );
    setTopbarLogoLoading("dashboard-indicator", active);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["aria-busy", "class", "hidden", "style"],
    childList: true,
    subtree: true
  });
  schedule();
  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    setTopbarLogoLoading("dashboard-indicator", false);
  };
};
