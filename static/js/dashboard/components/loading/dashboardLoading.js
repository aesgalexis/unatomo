import { t } from "/static/js/dashboard/i18n.js";

export const createDashboardLoading = () => {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-loading";

  const text = document.createElement("div");
  text.className = "dashboard-loading-text";
  text.textContent = t("dashboard.loading", "Loading... ");

  const percent = document.createElement("span");
  percent.className = "dashboard-loading-percent";
  percent.textContent = "0%";

  text.appendChild(percent);
  wrap.appendChild(text);

  let displayed = 0;
  let target = 0;
  let frame = null;
  let progressWaiters = [];

  const resolveReachedProgress = () => {
    const pending = [];
    progressWaiters.forEach((waiter) => {
      if (displayed >= waiter.value) waiter.resolve(true);
      else pending.push(waiter);
    });
    progressWaiters = pending;
  };

  const paint = () => {
    percent.textContent = `${Math.round(displayed)}%`;
    resolveReachedProgress();
  };

  const animate = () => {
    frame = null;
    if (displayed >= target) {
      displayed = target;
      paint();
      return;
    }
    const distance = target - displayed;
    const step = Math.max(1, Math.ceil(distance / 12));
    displayed = Math.min(target, displayed + step);
    paint();
    frame = window.requestAnimationFrame(animate);
  };

  const setProgress = (value) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    target = Math.max(target, safe);
    const reached = new Promise((resolve) => {
      if (displayed >= safe) {
        resolve(true);
        return;
      }
      progressWaiters.push({ value: safe, resolve });
    });
    if (!frame && displayed < target) frame = window.requestAnimationFrame(animate);
    return reached;
  };

  const resetProgress = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = null;
    progressWaiters.forEach((waiter) => waiter.resolve(false));
    progressWaiters = [];
    displayed = 0;
    target = 0;
    paint();
  };

  return { wrap, setProgress, resetProgress };
};
