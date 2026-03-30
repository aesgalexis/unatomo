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

  const setProgress = (value) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    percent.textContent = `${Math.round(safe)}%`;
  };

  return { wrap, setProgress };
};
