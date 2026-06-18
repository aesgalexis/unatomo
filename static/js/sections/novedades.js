import { getCurrentLang } from "/static/js/site/locale.js";
import { whatsNewEntries } from "./whatsNewData.js";

const formatDate = (value, isEn) => {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat(isEn ? "en-GB" : "es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const render = (mount) => {
  const isEn = getCurrentLang() === "en";
  const wrap = document.createElement("div");
  wrap.className = "section-block section-whats-new";

  const title = document.createElement("h2");
  title.textContent = isEn ? "What's new" : "Novedades";
  wrap.appendChild(title);

  const note = document.createElement("p");
  note.className = "section-whats-new-note";
  note.textContent = isEn
    ? "Brief release notes drafted by Codex from relevant product changes."
    : "Notas breves redactadas por Codex a partir de cambios relevantes del producto.";
  wrap.appendChild(note);

  const list = document.createElement("div");
  list.className = "section-whats-new-list";

  whatsNewEntries.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "section-whats-new-row";

    const time = document.createElement("time");
    time.dateTime = entry.date;
    time.textContent = formatDate(entry.date, isEn);

    const body = document.createElement("p");
    body.textContent = isEn ? entry.en : entry.es;

    row.appendChild(time);
    row.appendChild(body);
    list.appendChild(row);
  });

  wrap.appendChild(list);
  mount.appendChild(wrap);
};
