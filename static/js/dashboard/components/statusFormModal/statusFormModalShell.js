export const createStatusFormModalShell = ({
  ariaLabel,
  className = "",
  iconSvg = "",
  subtitle = "",
  summary = "",
  title
}) => {
  const previousActive = document.activeElement;
  const previousScrollY = window.scrollY || 0;
  const overlay = document.createElement("div");
  overlay.className = "status-incident-overlay";
  overlay.setAttribute("role", "presentation");
  const dialog = document.createElement("section");
  dialog.className = `status-incident-dialog ${className}`.trim();
  dialog.tabIndex = -1;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", ariaLabel || title);

  const header = document.createElement("div");
  header.className = "status-incident-header";
  const heading = document.createElement("div");
  heading.className = "status-incident-heading";
  const titleElement = document.createElement("h2");
  titleElement.className = "status-incident-title";
  titleElement.textContent = title;
  heading.appendChild(titleElement);
  if (subtitle) {
    const subtitleElement = document.createElement("p");
    subtitleElement.className = "status-incident-machine";
    subtitleElement.textContent = subtitle;
    heading.appendChild(subtitleElement);
  }
  header.appendChild(heading);
  if (iconSvg) {
    const icon = document.createElement("span");
    icon.className = "status-incident-warning-icon status-form-modal-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = iconSvg;
    header.appendChild(icon);
  }

  const content = document.createElement("div");
  content.className = "status-form-modal-content";
  dialog.appendChild(header);
  if (summary) {
    const summaryElement = document.createElement("p");
    summaryElement.className = "status-incident-summary status-form-modal-summary";
    summaryElement.textContent = summary;
    dialog.appendChild(summaryElement);
  }
  dialog.appendChild(content);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  document.body.style.setProperty("--status-incident-scroll-top", `${-previousScrollY}px`);
  document.body.classList.add("status-incident-open");

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown, true);
    document.body.classList.remove("status-incident-open");
    document.body.style.removeProperty("--status-incident-scroll-top");
    overlay.remove();
    window.scrollTo(0, previousScrollY);
    previousActive?.focus?.({ preventScroll: true });
  };
  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    close();
  }
  document.addEventListener("keydown", onKeyDown, true);
  window.requestAnimationFrame(() => dialog.focus({ preventScroll: true }));
  return { close, content, dialog };
};
