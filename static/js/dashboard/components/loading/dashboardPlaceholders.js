export const renderDashboardPlaceholder = (container, text) => {
  container.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.className = "machine-placeholder";
  placeholder.textContent = text;
  container.appendChild(placeholder);
};

export const renderDashboardEmptyPlaceholder = (container, text) => {
  renderDashboardPlaceholder(container, text);
};

export const renderDashboardLoadErrorPlaceholder = (
  container,
  text,
  { actionLabel = "", onAction = null } = {}
) => {
  container.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.className = "machine-placeholder machine-placeholder-error";

  const label = document.createElement("span");
  label.textContent = text;
  placeholder.appendChild(label);

  if (actionLabel && typeof onAction === "function") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "dashboard-bootstrap-retry";
    action.textContent = actionLabel;
    action.addEventListener("click", onAction);
    placeholder.appendChild(action);
  }

  container.appendChild(placeholder);
};

export const renderDashboardNoResultsPlaceholder = (container, text) => {
  renderDashboardPlaceholder(container, text);
};
