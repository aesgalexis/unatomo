import { lang, t } from "/static/js/dashboard/i18n.js";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (Number.isFinite(value?.seconds)) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const renderLastModified = (machine) => {
  const footer = document.createElement("footer");
  footer.className = "mc-info-last-modified";
  const date = toDate(machine.updatedAt || machine.createdAt);
  const label = t("general.lastModified", "Última modificación");
  const time = document.createElement("time");
  time.dateTime = date?.toISOString() || "";
  time.textContent = date
    ? `${label}: ${new Intl.DateTimeFormat(lang === "en" ? "en" : "es", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)}`
    : `${label}: —`;
  footer.appendChild(time);
  return footer;
};
