import { t } from "/static/js/dashboard/i18n.js";
import { formatHistoryLog } from "../../history/historyEventFormatter.js";
import {
  buildGlobalRegistryEntries,
  filterGlobalRegistryEntries,
} from "./globalRegistryModel.js";

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

const formatDownloadLine = (entry, log, locale, indent = "") => {
  const date = formatDate(log.ts, locale);
  const machine = entry.machine?.title || t("machine.machine", "Equipo");
  const location = (entry.machine?.location || "").toString().trim();
  const place = location ? ` | ${location}` : "";
  const text = formatHistoryLog(log, { omitTaskTitle: indent.length > 0 && log.type === "task_note_added" });
  return `${indent}[${date}] ${machine}${place} - ${text}`;
};

const buildDownloadText = (entries, locale) => {
  const lines = [];
  entries.forEach((entry) => {
    lines.push(formatDownloadLine(entry, entry.log, locale));
    (entry.relatedLogs || []).forEach((log) => {
      lines.push(formatDownloadLine(entry, log, locale, "  "));
    });
    (entry.notes || []).forEach((log) => {
      lines.push(formatDownloadLine(entry, log, locale, "  "));
    });
  });
  return lines.join("\n");
};

const downloadTextFile = (content, filename) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const isEntryUnseen = (entry = {}, seenAt = "") => toTime(entry.time) > toTime(seenAt);
const isLogUnseen = (log = {}, seenAt = "") => toTime(log.ts) > toTime(seenAt);

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
  body.textContent = formatHistoryLog(entry.log);

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
        relatedBody.textContent = formatHistoryLog(relatedLog, {
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
      noteBody.textContent = formatHistoryLog(noteLog, { omitTaskTitle: true });

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
  const download = document.createElement("button");
  download.type = "button";
  download.className = "global-registry-download mc-log-download";
  download.setAttribute("aria-label", t("history.download", "Descargar registro completo"));
  download.setAttribute("data-tooltip", t("history.download", "Descargar registro completo"));
  download.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/></svg>';
  download.addEventListener("click", () => {
    const text = buildDownloadText(entries, locale);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(text, `registro_global_${stamp}.txt`);
  });
  attachTooltip(download);
  toolbar.appendChild(download);
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
