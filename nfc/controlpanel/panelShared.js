export const createCard = (title) => {
  const card = document.createElement("section");
  card.className = "controlpanel-card";
  card.dataset.expanded = "false";
  card.innerHTML = `
    <button type="button" class="controlpanel-toggle" aria-expanded="false">
      <span class="controlpanel-title">${title}</span>
      <span class="controlpanel-icon">+</span>
    </button>
    <div class="controlpanel-body" hidden></div>
  `;
  return card;
};

export const toggleCard = (card) => {
  const body = card.querySelector(".controlpanel-body");
  const toggle = card.querySelector(".controlpanel-toggle");
  const icon = card.querySelector(".controlpanel-icon");
  const open = card.dataset.expanded === "true";
  card.dataset.expanded = open ? "false" : "true";
  if (toggle) toggle.setAttribute("aria-expanded", String(!open));
  if (icon) icon.textContent = open ? "+" : "-";
  if (body) body.hidden = open;
};

export const renderState = (body, hint, message, state = "") => {
  body.innerHTML = "";
  const note = document.createElement("p");
  note.className = "controlpanel-note";
  note.textContent = hint;
  body.appendChild(note);

  const status = document.createElement("p");
  status.className = "controlpanel-state";
  if (state) status.dataset.state = state;
  status.textContent = message;
  body.appendChild(status);
};

export const formatMaybeDate = (value, isEn, noData = "-") => {
  if (!value) return noData;
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : value?.seconds
          ? new Date(value.seconds * 1000)
          : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return noData;
  return new Intl.DateTimeFormat(isEn ? "en" : "es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const formatBytes = (value, isEn) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(isEn ? "en" : "es", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(size)} ${units[unitIndex]}`;
};

export const formatBackupAge = (value, noData = "-") => {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return noData;
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

export const getBackupStatusText = (status, text) => {
  if (status === "ok") return text.backupOk;
  if (status === "partial") return text.backupPartial;
  if (status === "running") return text.backupRunning;
  if (status === "error") return text.backupFailed;
  return text.backupPending;
};

export const appendBackupMeta = (wrap, label, value) => {
  if (value == null || value === "") return;
  const row = document.createElement("div");
  row.className = "controlpanel-backup-meta";
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("strong");
  val.textContent = value;
  row.appendChild(key);
  row.appendChild(val);
  wrap.appendChild(row);
};
