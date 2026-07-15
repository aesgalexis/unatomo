import { t } from "../i18n.js";
import { formatHistoryLog } from "./historyEventFormatter.js";

const getLocale = () => (document.documentElement.lang === "en" ? "en-GB" : "es-ES");

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString(getLocale()) : "";
};

const createRow = (machine = {}, log = {}, options = {}) => ({
  date: formatDate(log.ts),
  machine: machine.title || t("machine.machine", "Equipo"),
  location: (machine.location || "").toString().trim(),
  event: formatHistoryLog(log, { omitTaskTitle: options.omitTaskTitle === true }),
  user: (log.user || "").toString(),
  type: (log.type || "").toString(),
  indent: options.indent === true,
});

export const buildMachineHistoryRows = (machine = {}) =>
  (Array.isArray(machine.logs) ? machine.logs : []).map((log) => createRow(machine, log));

export const buildGlobalHistoryRows = (entries = []) => {
  const rows = [];
  entries.forEach((entry) => {
    rows.push(createRow(entry.machine, entry.log));
    (entry.relatedLogs || []).forEach((log) => {
      rows.push(createRow(entry.machine, log, {
        indent: true,
        omitTaskTitle: log.type === "task_note_added",
      }));
    });
    (entry.notes || []).forEach((log) => {
      rows.push(createRow(entry.machine, log, { indent: true, omitTaskTitle: true }));
    });
  });
  return rows;
};

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  const safeText = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const buildCsv = (rows) => {
  const headers = [
    t("history.exportDate", "Fecha y hora"),
    t("history.exportMachine", "Máquina"),
    t("history.exportLocation", "Ubicación"),
    t("history.exportEvent", "Evento"),
    t("history.exportUser", "Usuario"),
    t("history.exportType", "Tipo"),
  ];
  const values = rows.map((row) => [
    row.date,
    row.machine,
    row.location,
    row.event,
    row.user,
    row.type,
  ]);
  return `\uFEFFsep=;\r\n${[headers, ...values]
    .map((columns) => columns.map(escapeCsvCell).join(";"))
    .join("\r\n")}`;
};

const buildText = (rows) => rows
  .map((row) => {
    const place = row.location ? ` | ${row.location}` : "";
    const indent = row.indent ? "  " : "";
    return `${indent}[${row.date}] ${row.machine}${place} - ${row.event}`;
  })
  .join("\n");

export const downloadHistoryRows = (rows, filenameBase, format = "txt") => {
  const csv = format === "csv";
  const content = csv ? buildCsv(rows) : buildText(rows);
  const blob = new Blob([content], {
    type: csv ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameBase}.${csv ? "csv" : "txt"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
