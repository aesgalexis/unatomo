// ====== Conversor bidireccional (kg <-> unidades) ======
// Claves coinciden con data-key de cada fila.
const DEFAULT_WEIGHTS = {
  // Sábanas (kg/ud)
  sabanas_s: 0.50,   // individual
  sabanas_m: 0.70,   // doble/queen
  sabanas_l: 0.90,   // king
  // Nórdicos
  nordico_s: 1.50,
  nordico_m: 2.00,
  nordico_l: 2.50,
  // Fundas almohada
  fundas_std: 0.20,
  // Toallas
  toalla_alfombrin: 0.60,
  toalla_manos: 0.25,
  toalla_bano: 0.50,
  toalla_piscina: 0.70,
  // Albornoces
  albornoz: 1.20,
  // Mantelería
  mantel: 0.40,
  servilleta: 0.05
};

const state = {
  weights: { ...DEFAULT_WEIGHTS },
  rows: {}
};

function qsa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

// Inicializa filas: engancha eventos y pone pesos por defecto
function initRows() {
  qsa('.cfg-grid[data-key]').forEach(row => {
    const key = row.getAttribute('data-key');
    const units = row.querySelector('[data-field="units"]');
    const kg    = row.querySelector('[data-field="kg"]');
    const ppu   = row.querySelector('[data-field="ppu"]');

    // Peso por unidad inicial
    if (ppu) ppu.value = (state.weights[key] ?? 0).toFixed(2);

    // Guardamos referencias
    state.rows[key] = { row, units, kg, ppu };

    // Listeners de entrada
    if (units) units.addEventListener('input', () => onUnitsChange(key));
    if (kg)    kg.addEventListener('input',    () => onKgChange(key));
    if (ppu)   ppu.addEventListener('input',   () => onPpuChange(key));
  });
}

function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function onUnitsChange(key) {
  const { units, kg, ppu } = state.rows[key];
  const w = parseNum(ppu?.value) || state.weights[key] || 0; // kg/ud
  const u = parseNum(units?.value);
  const k = w * u;
  if (kg) kg.value = k ? k.toFixed(2) : '';
  updateTotals();
}

function onKgChange(key) {
  const { units, kg, ppu } = state.rows[key];
  const w = parseNum(ppu?.value) || state.weights[key] || 0; // kg/ud
  const k = parseNum(kg?.value);
  const u = w ? (k / w) : 0;
  if (units) units.value = u ? Math.round(u) : '';
  updateTotals();
}

function onPpuChange(key) {
  const { units, kg, ppu } = state.rows[key];
  const newW = parseNum(ppu?.value);
  if (newW > 0) state.weights[key] = newW;
  // Recalcula fila según último input no vacío (prioriza kg si hay)
  const k = parseNum(kg?.value);
  const u = parseNum(units?.value);
  if (k) onKgChange(key); else if (u) onUnitsChange(key);
  buildWeightsPanel();
}

function updateTotals() {
  let totalKg = 0, totalUnits = 0;
  Object.keys(state.rows).forEach(key => {
    const { units, kg } = state.rows[key];
    totalUnits += parseNum(units?.value);
    totalKg    += parseNum(kg?.value);
  });
  const tU = document.getElementById('total-units');
  const tK = document.getElementById('total-kg');
  tU.value = totalUnits ? Math.round(totalUnits) : '';
  tK.value = totalKg ? totalKg.toFixed(2) : '';
}

// Panel de ajuste de pesos (muestra pares clave→input)
function buildWeightsPanel() {
  const host = document.getElementById('weights-grid');
  if (!host) return;
  host.innerHTML = '';
  Object.entries(state.weights).forEach(([key, val]) => {
    const label = key.replace(/_/g,' · ')
      .replace('sabanas','sábanas').replace('nordico','nórdico')
      .replace('toalla','toalla').replace('fundas','funda')
      .replace('servilleta','servilleta').replace('mantel','mantel')
      .replace('albornoz','albornoz')
      .replace('s','individual').replace('m','doble/queen').replace('l','king');
    const row = document.createElement('div');
    row.className = 'weights-row';
    const name = document.createElement('div');
    name.textContent = label;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = '0.01'; inp.min = '0';
    inp.className = 'cfg-input'; inp.value = Number(val).toFixed(2);
    inp.addEventListener('input', () => {
      const v = parseNum(inp.value);
      if (v > 0) {
        state.weights[key] = v;
        // Sincroniza también el PPU visible de cada fila
        const rowRef = state.rows[key];
        if (rowRef?.ppu) rowRef.ppu.value = v.toFixed(2);
        // Recomputa totales acorde a lo que esté relleno
        const k = parseNum(rowRef?.kg?.value);
        const u = parseNum(rowRef?.units?.value);
        if (k) onKgChange(key); else if (u) onUnitsChange(key); else updateTotals();
      }
    });
    row.appendChild(name); row.appendChild(inp); host.appendChild(row);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initRows();
  buildWeightsPanel();
});
