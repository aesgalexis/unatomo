(function () {
  function text(id) {
    const el = document.getElementById(id);
    return el ? (el.textContent || "").trim() : "";
  }

  function value(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").toString().trim() : "";
  }

  function collectMachines(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    const items = Array.from(list.querySelectorAll(".mach-item"));
    return items.map((item) => {
      const name = item.querySelector("input.field")?.value?.trim() || "";
      const cap = item.querySelector('select[data-role="cap"]')?.value || "";
      const cycle = item.querySelector('select[data-role="cycle"]')?.value || "";
      const perday = item.querySelector('[data-role="perday"]')?.textContent?.trim() || "";
      const cyctime = item.querySelector('[data-role="cyctime"]')?.textContent?.trim() || "";
      return { name, cap, cycle, perday, cyctime };
    });
  }

  function buildReport() {
    const now = new Date();
    const date = now.toLocaleString("es-ES");

    const totals = {
      totalUnits: value("total-units"),
      totalKg: value("total-kg"),
      pctCama: text("pct-cama-kg"),
      pctRizo: text("pct-rizo-kg"),
      pctMant: text("pct-mant-kg"),
    };

    const work = {
      hours: value("work-hours"),
    };

    const wash = {
      mode: value("mach-mode"),
      fixedCap: value("mach-fixed-cap"),
      kgTotal: text("mach-kg-total"),
      machinesTotal: text("mach-machines-total"),
      capTotal: text("mach-cap-total"),
      cover: text("mach-cover-total"),
      list: collectMachines("mach-list"),
    };

    const dry = {
      mode: value("dry-mode"),
      fixedCap: value("dry-fixed-cap"),
      kgTotal: text("dry-kg-total"),
      machinesTotal: text("dry-machines-total"),
      capTotal: text("dry-cap-total"),
      cover: text("dry-cover-total"),
      list: collectMachines("dry-list"),
    };

    return { date, totals, work, wash, dry };
  }

  function renderReport(data) {
    const modeLabel = (mode) => (mode === "fixed" ? "Fijo" : "Automático");

    const renderMachineTable = (title, group) => {
      const rows = group.list
        .map(
          (m) => `
            <tr>
              <td>${m.name || "-"}</td>
              <td>${m.cap || "-"}</td>
              <td>${m.cycle || "-"}</td>
              <td>${m.perday || "-"}</td>
              <td>${m.cyctime || "-"}</td>
            </tr>`
        )
        .join("");

      return `
        <section>
          <h2>${title}</h2>
          <p><strong>Modo:</strong> ${modeLabel(group.mode)}${group.mode === "fixed" && group.fixedCap ? ` · <strong>Capacidad fija:</strong> ${group.fixedCap} kg` : ""}</p>
          <p><strong>Kilos/día:</strong> ${group.kgTotal} · <strong>Total equipos:</strong> ${group.machinesTotal} · <strong>Capacidad total:</strong> ${group.capTotal} kg/día · <strong>Cobertura:</strong> ${group.cover}</p>
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Capacidad (kg)</th>
                <th>Duración ciclo (min)</th>
                <th>kg/día</th>
                <th>Ciclo total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">Sin equipos</td></tr>'}
            </tbody>
          </table>
        </section>`;
    };

    return `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Informe configurador</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          h2 { margin: 24px 0 8px; font-size: 18px; }
          p { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f8fafc; }
          .meta { color: #475569; font-size: 12px; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <h1>Informe de configurador</h1>
        <div class="meta">${data.date}</div>
        <section>
          <h2>Resumen</h2>
          <p><strong>Unidades:</strong> ${data.totals.totalUnits || "0"} · <strong>Kilos:</strong> ${data.totals.totalKg || "0"}</p>
          <p><strong>Ropa de cama:</strong> ${data.totals.pctCama || "0%"} · <strong>Rizo:</strong> ${data.totals.pctRizo || "0%"} · <strong>Mantelería:</strong> ${data.totals.pctMant || "0%"}</p>
          <p><strong>Jornada:</strong> ${data.work.hours || "0"} h</p>
        </section>
        ${renderMachineTable("Equipos de lavado", data.wash)}
        ${renderMachineTable("Equipos de secado", data.dry)}
      </body>
      </html>
    `;
  }

  function openReport() {
    const data = buildReport();
    const html = renderReport(data);
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function init() {
    const btn = document.getElementById("export-pdf");
    if (!btn) return;
    btn.addEventListener("click", openReport);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
