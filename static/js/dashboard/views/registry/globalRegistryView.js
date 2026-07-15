import { t } from "/static/js/dashboard/i18n.js";
import {
  formatHistoryLog,
  isTaskAttachmentLog
} from "../../history/historyEventFormatter.js";
import {
  buildGlobalRegistryEntries,
  filterGlobalRegistryEntries,
} from "./globalRegistryModel.js";
import { createDownloadMenu } from "../../components/downloadMenu/downloadMenu.js";
import {
  buildGlobalHistoryRows,
  downloadHistoryRows,
} from "../../history/historyExport.js";

export const GLOBAL_REGISTRY_PAGE_SIZE = 254;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const formatDate = (value, locale) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
};

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const clearTooltips = () => {
  document.querySelectorAll(".mc-tooltip").forEach((node) => node.remove());
};

const attachTooltip = (target) => {
  let tipEl = null;
  const showTip = (event) => {
    const label = target.getAttribute("data-tooltip");
    if (!label) return;
    clearTooltips();
    tipEl = document.createElement("div");
    tipEl.className = "mc-tooltip";
    tipEl.textContent = label;
    document.body.appendChild(tipEl);
    const x = (event && event.clientX) || 0;
    const y = (event && event.clientY) || 0;
    tipEl.style.top = `${Math.max(8, y - tipEl.offsetHeight - 10)}px`;
    tipEl.style.left = `${Math.max(8, x - tipEl.offsetWidth - 12)}px`;
  };
  const hideTip = () => {
    if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
    tipEl = null;
  };
  target.addEventListener("mouseenter", showTip);
  target.addEventListener("mouseleave", hideTip);
  target.addEventListener("blur", hideTip);
  target.addEventListener("click", hideTip);
};

const isEntryUnseen = (entry = {}, seenAt = "") => toTime(entry.time) > toTime(seenAt);
const isLogUnseen = (log = {}, seenAt = "") => toTime(log.ts) > toTime(seenAt);

const appendHistoryMessage = (container, log, options = {}) => {
  if (isTaskAttachmentLog(log) && log.attachmentUrl) {
    const image = String(log.contentType || "").startsWith("image/");
    const label = t(
      image ? "history.imageAdded" : "history.fileAdded",
      image ? "Imagen añadida" : "Archivo añadido"
    );
    container.append(`${label}: `);
    const link = document.createElement("a");
    link.className = "global-registry-attachment-link";
    link.href = log.attachmentUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = log.attachmentName || t("tasks.image", "Imagen");
    container.appendChild(link);
    if (log.user) {
      container.append(t("history.completedBy", (value) => ` - por ${value}`)(log.user));
    }
    return;
  }
  container.textContent = formatHistoryLog(log, options);
};

const appendRow = (list, entry, locale, options = {}) => {
  const isUnseen = isEntryUnseen(entry, options.seenAt);
  const row = document.createElement("article");
  row.className = "global-registry-row";
  row.classList.toggle("is-unseen", isUnseen);

  const meta = document.createElement("div");
  meta.className = "global-registry-meta";

  const time = document.createElement("time");
  time.className = "global-registry-time";
  time.dateTime = entry.log.ts || "";
  time.textContent = formatDate(entry.log.ts, locale);

  const machine = document.createElement("span");
  machine.className = "global-registry-machine";
  machine.textContent = entry.machine.title || t("machine.machine", "Equipo");

  meta.appendChild(time);
  meta.appendChild(machine);

  const location = (entry.machine.location || "").toString().trim();
  if (location) {
    const locationEl = document.createElement("span");
    locationEl.className = "global-registry-location";
    locationEl.textContent = location;
    meta.appendChild(locationEl);
  }

  const body = document.createElement("div");
  body.className = "global-registry-message";
  appendHistoryMessage(body, entry.log);

  row.appendChild(meta);
  row.appendChild(body);
  list.appendChild(row);

  if (Array.isArray(entry.relatedLogs) && entry.relatedLogs.length) {
    entry.relatedLogs
      .slice()
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .forEach((relatedLog) => {
        const relatedUnseen = isLogUnseen(relatedLog, options.seenAt);
        const related = document.createElement("article");
        related.className = "global-registry-row global-registry-row-note";
        related.classList.toggle("is-unseen", relatedUnseen);

        const relatedMeta = document.createElement("div");
        relatedMeta.className = "global-registry-meta";
        const relatedTime = document.createElement("time");
        relatedTime.className = "global-registry-time";
        relatedTime.dateTime = relatedLog.ts || "";
        relatedTime.textContent = formatDate(relatedLog.ts, locale);
        relatedMeta.appendChild(relatedTime);

        const relatedBody = document.createElement("div");
        relatedBody.className = "global-registry-message";
        appendHistoryMessage(relatedBody, relatedLog, {
          omitTaskTitle: relatedLog.type === "task_note_added",
        });

        related.appendChild(relatedMeta);
        related.appendChild(relatedBody);
        list.appendChild(related);
      });
    return;
  }

  entry.notes
    .slice()
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .forEach((noteLog) => {
      const noteUnseen = isLogUnseen(noteLog, options.seenAt);
      const note = document.createElement("article");
      note.className = "global-registry-row global-registry-row-note";
      note.classList.toggle("is-unseen", noteUnseen);

      const noteMeta = document.createElement("div");
      noteMeta.className = "global-registry-meta";
      const noteTime = document.createElement("time");
      noteTime.className = "global-registry-time";
      noteTime.dateTime = noteLog.ts || "";
      noteTime.textContent = formatDate(noteLog.ts, locale);
      noteMeta.appendChild(noteTime);

      const noteBody = document.createElement("div");
      noteBody.className = "global-registry-message";
      appendHistoryMessage(noteBody, noteLog, { omitTaskTitle: true });

      note.appendChild(noteMeta);
      note.appendChild(noteBody);
      list.appendChild(note);
    });
};

export const renderGlobalRegistryView = (container, machines = [], options = {}) => {
  const visibleCount = Math.max(
    GLOBAL_REGISTRY_PAGE_SIZE,
    Number(options.visibleCount || GLOBAL_REGISTRY_PAGE_SIZE)
  );
  const onLoadMore = options.onLoadMore;
  const query = (options.query || "").toString().trim();
  const seenAt = options.seenAt || "";
  const locale = getLocale();
  const allEntries = buildGlobalRegistryEntries(machines);
  const entries = filterGlobalRegistryEntries(allEntries, query);

  container.innerHTML = "";
  container.className = "global-registry-view";
  container.removeAttribute("data-has-ungrouped");

  const toolbar = document.createElement("div");
  toolbar.className = "global-registry-toolbar";
  const downloadMenu = createDownloadMenu({
    placement: "bottom",
    className: "global-registry-download",
    onSelect: (format) => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadHistoryRows(
        buildGlobalHistoryRows(entries),
        `registro_global_${stamp}`,
        format
      );
    },
  });
  attachTooltip(downloadMenu.toggle);
  toolbar.appendChild(downloadMenu.wrap);
  container.appendChild(toolbar);

  const header = document.createElement("div");
  header.className = "global-registry-header";
  const title = document.createElement("h3");
  title.textContent = t("dashboard.registryTitle", "Registro global");
  const count = document.createElement("span");
  count.className = "global-registry-count";
  count.textContent = `${Math.min(visibleCount, entries.length)}/${entries.length}`;
  header.appendChild(title);
  header.appendChild(count);
  container.appendChild(header);

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "global-registry-empty";
    empty.textContent = query
      ? t("dashboard.noResults", (value) => `No results for "${value}".`)(query)
      : t("dashboard.registryEmpty", "Sin registros.");
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "global-registry-list";
  entries.slice(0, visibleCount).forEach((entry) => appendRow(list, entry, locale, { seenAt }));
  container.appendChild(list);

  if (visibleCount < entries.length) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "global-registry-load-more";
    loadMore.textContent = t("dashboard.registryLoadMore", "Cargar más");
    loadMore.addEventListener("click", () => {
      if (onLoadMore) onLoadMore();
    });
    container.appendChild(loadMore);
  }
};
