const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const saveBlob = (content, filename, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadStatisticsCsv = (headers, rows, filenameBase) => {
  const content = `\uFEFFsep=;\r\n${[headers, ...rows]
    .map((columns) => columns.map(escapeCsvCell).join(";"))
    .join("\r\n")}`;
  saveBlob(content, `${filenameBase}.csv`, "text/csv;charset=utf-8");
};

export const printStatisticsPdf = (title, subtitle, headers, rows) => {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
  frame.setAttribute("title", title);
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowsHtml = rows.map((row) =>
    `<tr>${row.map((value, index) => `<${index === 0 ? "th" : "td"}>${escapeHtml(value)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`
  ).join("");
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: landscape; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    h1 { margin: 0; font-size: 18px; }
    p { margin: 5px 0 18px; color: #555; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { padding: 6px; border-bottom: 1px solid #ddd; text-align: center; }
    th:first-child, td:first-child { text-align: left; }
    thead th { color: #555; font-weight: 600; }
  </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
  doc.close();
  window.setTimeout(() => {
    const printWindow = frame.contentWindow;
    printWindow?.addEventListener("afterprint", () => frame.remove(), { once: true });
    printWindow?.focus();
    printWindow?.print();
    window.setTimeout(() => frame.remove(), 60000);
  }, 50);
};
