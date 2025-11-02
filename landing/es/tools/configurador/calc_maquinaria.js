// ===== calc_maquinaria.js =====
// Lee los kg/unidades/ppu actuales del configurador y propone maquinaria.
// No necesita tocar tu otro JS. Se actualiza al teclear y al cambiar horas/día.

// ---- Config: mapeos y supuestos de productividad ----
const MACH_CATEGORIES = {
  cama: ['sabanas_s','sabanas_m','sabanas_l','nordico_s','nordico_m','nordico_l','fundas_std'],
  rizo: ['toalla_alfombrin','toalla_manos','toalla_bano','toalla_piscina','albornoz'],
  mant: ['mantel','servilleta']
};

// Pesos de referencia (por si solo hay kg o solo unidades)
const REF_WEIGHTS = {
  sabanas_s: 0.50, sabanas_m: 0.70, sabanas_l: 0.90,
  nordico_s: 1.50, nordico_m: 2.00, nordico_l: 2.50,
  fundas_std: 0.20,
  toalla_alfombrin: 0.60, toalla_manos: 0.25, toalla_bano: 0.50, toalla_piscina: 0.70,
  albornoz: 1.20,
  mantel: 0.40, servilleta: 0.05
};

// Productividades (supuestos simples y conservadores)
const PRODUCTIVITY = {
  washer: { // lavadora
    capacities: [20, 30, 50],         // kg nominales
    cyclesPerHour: 1.2,               // 45-50 min por ciclo
    loadFactor: 0.9                    // llenado medio 90%
  },
  dryer: { // secadora (solo rizo)
    capacities: [25, 35],             // kg nominales
    cyclesPerHour: 1.2,
    loadFactor: 0.85
  },
  ironer: { // calandra mural (para ropa plana: cama + mantelería)
    // kg/h por máquina según rango: orientativo
    optionsKgPerHour: [
      { label: 'Calandra mural pequeña',  kgph: 40 },
      { label: 'Calandra mural estándar', kgph: 60 },
      { label: 'Calandra mural grande',   kgph: 80 }
    ]
  },
  towelFolder: { // plegador de toallas
    piecesPerHour: 400 // uds/h
  },
  tonnageWarningKgPerDay: 5000 // >5t/día: sugerir túnel
};

// ---- Utilidades DOM ----
function $$qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function $$qs(sel, root = document)  { return root.querySelector(sel); }
function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// Dado un data-key, intenta obtener kg actuales de esa fila.
// Si no hay kg, estima usando unidades*ppu (o REF_WEIGHTS).
function getKgForKey(key) {
  const row = $$qs(`.cfg-grid[data-key="${key}"]`);
  if (!row) return 0;

  const kgEl = row.querySelector('[data-field="kg"]');
  const unEl = row.querySelector('[data-field="units"]');
  const puEl = row.querySelector('[data-field="ppu"]');

  // 1) Prioriza kg si hay
  const k = num(kgEl?.value);
  if (k > 0) return k;

  // 2) Si no, intenta unidades*ppu visible
  const u = num(unEl?.value);
  let w = num(puEl?.value);
  if (!(w > 0)) w = REF_WEIGHTS[key] ?? 0;

  return u > 0 && w > 0 ? u * w : 0;
}

// Intenta obtener unidades (para plegador de toallas).
function getUnitsForKey(key) {
  const row = $$qs(`.cfg-grid[data-key="${key}"]`);
  if (!row) return 0;
  const unEl = row.querySelector('[data-field="units"]');
  const puEl = row.querySelector('[data-field="ppu"]');
  const kgEl = row.querySelector('[data-field="kg"]');

  let u = num(unEl?.value);
  if (u > 0) return u;

  // Si no hay unidades, estima a partir de kg/w
  const k = num(kgEl?.value);
  let w = num(puEl?.value);
  if (!(w > 0)) w = REF_WEIGHTS[key] ?? 0;
  return k > 0 && w > 0 ? Math.round(k / w) : 0;
}

// Suma kg de un grupo de claves
function sumKg(keys) { return keys.reduce((acc, k) => acc + getKgForKey(k), 0); }
// Suma unidades de un grupo de claves
function sumUnits(keys) { return keys.reduce((acc, k) => acc + getUnitsForKey(k), 0); }

// ---- Cálculos de dimensionamiento ----
function requiredPerHour(totalKgPerDay, hoursPerDay) {
  const h = Math.max(1, Math.min(24, Math.round(hoursPerDay || 8)));
  return totalKgPerDay / h;
}

function pickWasherConfig(kgPerHour) {
  const { capacities, cyclesPerHour, loadFactor } = PRODUCTIVITY.washer;
  const options = capacities.map(cap => {
    const eff = cap * cyclesPerHour * loadFactor; // kg/h por máquina
    return { cap, effKgPh: eff, qty: eff > 0 ? Math.ceil(kgPerHour / eff) : 0 };
  });
  // Escoge la que dé menos máquinas; si empata, la de menor capacidad
  options.sort((a,b) => a.qty - b.qty || a.cap - b.cap);
  return options[0];
}

function pickDryerConfig(rizoKgPerHour) {
  const { capacities, cyclesPerHour, loadFactor } = PRODUCTIVITY.dryer;
  const options = capacities.map(cap => {
    const eff = cap * cyclesPerHour * loadFactor;
    return { cap, effKgPh: eff, qty: eff > 0 ? Math.ceil(rizoKgPerHour / eff) : 0 };
  });
  options.sort((a,b) => a.qty - b.qty || a.cap - b.cap);
  return options[0];
}

function pickIronerConfig(planKgPerHour) {
  // planKgPerHour = ropa plana (cama + mantelería) a procesar/hora
  const opts = PRODUCTIVITY.ironer.optionsKgPerHour
    .map(o => ({ ...o, qty: o.kgph > 0 ? Math.ceil(planKgPerHour / o.kgph) : 0 }));
  opts.sort((a,b) => a.qty - b.qty || a.kgph - b.kgph);
  return opts[0];
}

function requiredTowelFolders(totalTowelPiecesPerHour) {
  const tph = PRODUCTIVITY.towelFolder.piecesPerHour;
  return tph > 0 ? Math.ceil(totalTowelPiecesPerHour / tph) : 0;
}

// ---- Render ----
function renderMachinery() {
  const host = $$qs('#mach-results');
  if (!host) return;

  // Kg por categoría
  const kgCama = sumKg(MACH_CATEGORIES.cama);
  const kgRizo = sumKg(MACH_CATEGORIES.rizo);
  const kgMant = sumKg(MACH_CATEGORIES.mant);
  const kgTotal = kgCama + kgRizo + kgMant;

  const hours = num($$qs('#mach-hours')?.value) || 8;

  const kgPerHourTotal = requiredPerHour(kgTotal, hours);
  const kgPerHourRizo  = requiredPerHour(kgRizo, hours);
  const kgPerHourPlano = requiredPerHour(kgCama + kgMant, hours);

  // Lavadoras (toda la colada)
  const wPick = pickWasherConfig(kgPerHourTotal);

  // Secadoras (solo rizo)
  const dPick = pickDryerConfig(kgPerHourRizo);

  // Calandra(s) (plano: cama + mantelería)
  const iPick = pickIronerConfig(kgPerHourPlano);

  // Plegador toallas (estimación piezas/h)
  const towelUnitsPerDay =
    sumUnits(['toalla_manos','toalla_bano','toalla_piscina']); // alfombrín no se pliega en carpeta normalmente
  const towelUnitsPerHour = towelUnitsPerDay / Math.max(1, Math.min(24, Math.round(hours || 8)));
  const foldQty = requiredTowelFolders(towelUnitsPerHour);

  // Aviso tonelaje alto
  const tonnageNote = kgTotal >= PRODUCTIVITY.tonnageWarningKgPerDay
    ? `<p class="cfg-note" style="margin-top:8px">
         Volumen alto (&ge; 5.000 kg/día). Recomendable estudiar túneles de lavado, prensas, enfriadores y líneas de calandra completas.
       </p>`
    : '';

  // Render tabla simple
  host.innerHTML = `
    <div class="cfg-grid header" style="grid-template-columns: 2fr 1fr 1fr;">
      <div>Equipo</div><div>Cantidad</div><div>Notas</div>
    </div>

    <div class="cfg-grid" style="grid-template-columns: 2fr 1fr 1fr; margin-top:8px;">
      <div>Lavadora(s) (${wPick.cap} kg)</div>
      <div>${wPick.qty}</div>
      <div>≈ ${wPick.effKgPh.toFixed(0)} kg/h por máquina</div>
    </div>

    <div class="cfg-grid" style="grid-template-columns: 2fr 1fr 1fr;">
      <div>Secadora(s) (${dPick.cap} kg) — solo rizo</div>
      <div>${dPick.qty}</div>
      <div>≈ ${dPick.effKgPh.toFixed(0)} kg/h por máquina</div>
    </div>

    <div class="cfg-grid" style="grid-template-columns: 2fr 1fr 1fr;">
      <div>${iPick.label}</div>
      <div>${iPick.qty}</div>
      <div>${(iPick.kgph)} kg/h por máquina (plano)</div>
    </div>

    <div class="cfg-grid" style="grid-template-columns: 2fr 1fr 1fr;">
      <div>Plegador de toallas</div>
      <div>${foldQty}</div>
      <div>≈ ${PRODUCTIVITY.towelFolder.piecesPerHour} uds/h por máquina</div>
    </div>

    <div style="margin-top:10px; font-size:12px; opacity:.7">
      Carga horaria: ${Math.max(1, Math.min(24, Math.round(hours)))} h/día ·
      Total: ${kgTotal.toFixed(0)} kg/día &mdash; Plano: ${(kgCama+kgMant).toFixed(0)} kg/día · Rizo: ${kgRizo.toFixed(0)} kg/día
    </div>
    ${tonnageNote}
  `;
}

// ---- Eventos / Bootstrap ----
function hookGlobalInputs() {
  // Recalcular al escribir en cualquier input del configurador
  $$qsa('.cfg-input').forEach(inp => {
    inp.addEventListener('input', renderMachinery);
    inp.addEventListener('change', renderMachinery);
  });
  const hoursEl = $$qs('#mach-hours');
  if (hoursEl) {
    hoursEl.addEventListener('input', renderMachinery);
    hoursEl.addEventListener('change', renderMachinery);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  hookGlobalInputs();
  // primera pasada
  renderMachinery();
});
