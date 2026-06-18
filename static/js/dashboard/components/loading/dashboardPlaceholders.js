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

export const renderDashboardLoadErrorPlaceholder = (container, text) => {
  renderDashboardPlaceholder(container, text);
};

export const renderDashboardNoResultsPlaceholder = (container, text) => {
  renderDashboardPlaceholder(container, text);
};
