import { t } from "../../i18n.js";

const DOWNLOAD_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/></svg>';

export const createDownloadMenu = ({ onSelect, placement = "top", className = "" } = {}) => {
  const wrap = document.createElement("div");
  wrap.className = `history-download-menu ${className}`.trim();
  wrap.dataset.placement = placement;

  const label = t("history.download", "Descargar registro completo");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mc-log-download history-download-menu-toggle";
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("data-tooltip", label);
  toggle.setAttribute("aria-haspopup", "menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = DOWNLOAD_ICON;

  const panel = document.createElement("div");
  panel.className = "history-download-menu-panel";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", t("history.downloadFormat", "Formato de descarga"));
  panel.hidden = true;

  let outsideListeners = null;
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    outsideListeners?.abort();
    outsideListeners = null;
  };

  const addOption = (format, labelText, extension) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "history-download-menu-item";
    option.setAttribute("role", "menuitem");

    const icon = document.createElement("span");
    icon.className = "history-download-menu-filetype";
    icon.textContent = extension;

    const text = document.createElement("span");
    text.textContent = labelText;

    option.appendChild(icon);
    option.appendChild(text);
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      close();
      onSelect?.(format);
    });
    panel.appendChild(option);
  };

  addOption("csv", t("history.downloadExcel", "Excel (.csv)"), "CSV");
  addOption("txt", t("history.downloadText", "Texto (.txt)"), "TXT");

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!panel.hidden) {
      close();
      return;
    }
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    panel.querySelector("button")?.focus();
    outsideListeners = new AbortController();
    const { signal } = outsideListeners;
    document.addEventListener("click", close, { signal });
    document.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key !== "Escape") return;
      close();
      toggle.focus();
    }, { signal });
  });

  wrap.appendChild(toggle);
  wrap.appendChild(panel);
  return { wrap, toggle, close };
};
