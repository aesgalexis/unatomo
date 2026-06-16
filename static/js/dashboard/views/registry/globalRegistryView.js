import { t } from "/static/js/dashboard/i18n.js";
import { formatHistoryLog } from "../../history/historyEventFormatter.js";
import { buildGlobalRegistryEntries } from "./globalRegistryModel.js";

export const GLOBAL_REGISTRY_PAGE_SIZE = 254;

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const formatDate = (value, locale) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
};

const appendRow = (list, entry, locale) => {
  const row = document.createElement("article");
  row.className = "global-registry-row";

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

  entry.notes
    .slice()
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .forEach((noteLog) => {
      const note = document.createElement("article");
      note.className = "global-registry-row global-registry-row-note";

      const noteMeta = document.createElement("div");
      noteMeta.className = "global-registry-meta";
      const noteTime = document.createElement("time");
      noteTime.className = "global-registry-time";
      noteTime.dateTime = noteLog.ts || "";
      noteTime.textContent = formatDate(noteLog.ts, locale);
      noteMeta.appendChild(noteTime);

      const noteBody = document.createElement("div");
      noteBody.className = "global-registry-message";
      noteBody.textContent = formatHistoryLog(noteLog);

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
  const locale = getLocale();
  const entries = buildGlobalRegistryEntries(machines);

  container.innerHTML = "";
  container.className = "global-registry-view";
  container.removeAttribute("data-has-ungrouped");

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
    empty.textContent = t("dashboard.registryEmpty", "Sin registros.");
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "global-registry-list";
  entries.slice(0, visibleCount).forEach((entry) => appendRow(list, entry, locale));
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
