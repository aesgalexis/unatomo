const MOBILE_QUERY = "(max-width: 768px)";

export const MOBILE_ACTION_ICONS = {
  add: '<path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3Z"></path>',
  complete: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.4 14.2-4.1-4.1 1.4-1.4 2.7 2.7 5.5-5.5 1.4 1.4-6.9 6.9Z"></path>',
  delete: '<path d="M8 3h8l1 2h5v2H2V5h5l1-2Zm-3 6h14l-1 13H6L5 9Zm4 2v8h2v-8H9Zm4 0v8h2v-8h-2Z"></path>',
  edit: '<path d="m17.7 2.3 4 4a1 1 0 0 1 0 1.4L9.4 20H4v-5.4L16.3 2.3a1 1 0 0 1 1.4 0ZM6 15.4V18h2.6l9.9-9.9-2.6-2.6L6 15.4Z"></path>',
  file: '<path d="M6 2h8l5 5v15H6V2Zm8 2.5V8h3.5L14 4.5ZM9 12v2h7v-2H9Zm0 4v2h7v-2H9Z"></path>',
  images: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.5 7A2.5 2.5 0 1 1 6 9.5 2.5 2.5 0 0 1 8.5 7ZM5 19l4.5-6 3.5 4.5 2.5-3L19 19H5Z"></path>',
  note: '<path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 4v3H8v2h3v3h2v-3h3v-2h-3V7h-2Z"></path>',
  reply: '<path d="m10 5-7 7 7 7v-4h3c4.2 0 6.8 1.3 9 4-1-6-4.2-9-9-9h-3V5Z"></path>'
};

export const decorateMobileAction = (button, icon, label = button.textContent || "") => {
  const iconElement = document.createElement("span");
  iconElement.className = "mobile-action-sheet-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${icon}</svg>`;
  const labelElement = document.createElement("span");
  labelElement.className = "mobile-action-sheet-label";
  labelElement.textContent = label;
  button.classList.add("mobile-action-sheet-action");
  button.replaceChildren(iconElement, labelElement);
};

export const createMobileActionSheet = ({ container, panel, onRequestClose }) => {
  const backdrop = document.createElement("div");
  backdrop.className = "mobile-action-sheet-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.addEventListener("click", () => onRequestClose?.());

  const open = () => {
    if (!window.matchMedia(MOBILE_QUERY).matches) return false;
    panel.classList.add("mobile-action-sheet-panel");
    document.documentElement.classList.add("mobile-action-sheet-open");
    document.body.append(backdrop, panel);
    requestAnimationFrame(() => backdrop.classList.add("is-visible"));
    return true;
  };

  const close = () => {
    panel.classList.remove("mobile-action-sheet-panel");
    backdrop.classList.remove("is-visible");
    backdrop.remove();
    document.documentElement.classList.remove("mobile-action-sheet-open");
    container.appendChild(panel);
  };

  return { close, open };
};
