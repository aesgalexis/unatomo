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

// ====== Categorías para breakdown porcentual (solo kg) ======
const CATEGORIES = {
  cama: ['sabanas_s','sabanas_m','sabanas_l','nordico_s','nordico_m','nordico_l','fundas_std'],
  rizo: ['toalla_alfombrin','toalla_manos','toalla_bano','toalla_piscina','albornoz'],
  mant: ['mantel','servilleta']
};

// ====== Estimador por habitaciones (matriz de consumo) ======
const ROOM_MATRIX = {
  simple: {
    sabanas_s: 2,
    fundas_std: 1,
    nordico_s: 1,
    toalla_manos: 1,
    toalla_bano: 1,
    toalla_alfombrin: 1
  },
  doble: {
    sabanas_m: 2,
    fundas_std: 2,
    nordico_m: 1,
    toalla_manos: 2,
    toalla_bano: 2,
    toalla_alfombrin: 1
  },
  suite: {
    sabanas_l: 2,
    fundas_std: 4,
    nordico_l: 1,
    toalla_manos: 2,
    toalla_bano: 2,
    toalla_alfombrin: 1
  }
};

// ====== Estado ======
const state = {
  weights: { ...DEFAULT_WEIGHTS },
  rows: {},
  customSeq: 0
};

// ====== Utils ======
function qsa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
// marcar/desmarcar inválido (usa clase CSS is-invalid)
function markInvalid(el, invalid) {
  if (!el) return;
  el.classList.toggle('is-invalid', !!invalid);
}

// ====== Init filas ======
function initRows() {
  qsa('.cfg-grid[data-key]').forEach(row => {
    const key   = row.getAttribute('data-key');
    const units = row.querySelector('[data-field="units"]');
    const kg    = row.querySelector('[data-field="kg"]');
    const ppu   = row.querySelector('[data-field="ppu"]');

    // Peso por unidad inicial
    if (ppu) ppu.value = (state.weights[key] ?? 0).toFixed(2);

    // Guardamos referencias
    state.rows[key] = { row, units, kg, ppu };

    // Placeholders grises (no valores reales)
    if (units) {
      if (!units.placeholder) units.placeholder = '0';
      units.value = '';
    }
    if (kg) {
      if (!kg.placeholder) kg.placeholder = '0.00';
      kg.value = '';
    }

    // Listeners
    if (units) units.addEventListener('input', () => onUnitsChange(key));
    if (kg)    kg.addEventListener('input',    () => onKgChange(key));
    if (ppu)   ppu.addEventListener('input',   () => onPpuChange(key));
  });

  updateTotals();
}

// ====== Handlers fila ======
function onUnitsChange(key) {
  const { units, kg, ppu, name } = state.rows[key];
  const w = parseNum(ppu?.value) || state.weights[key] || 0; // kg/ud
  const u = parseNum(units?.value);

  // Si es una fila custom con ppu vacío/0, marcar rojo y no calcular
  if (ppu && ppu.closest('#fam-otros') && !(w > 0)) {
    markInvalid(ppu, true);
    if (kg) kg.value = '';
    updateTotals();
    return;
  } else if (ppu && ppu.closest('#fam-otros')) {
    markInvalid(ppu, false);
  }

  const k = w * u;

  if (kg) {
    if (u > 0) kg.value = k.toFixed(2);
    else kg.value = ''; // vuelve al placeholder 0.00
  }
  updateTotals();
}

function onKgChange(key) {
  const { units, kg, ppu } = state.rows[key];
  const w = parseNum(ppu?.value) || state.weights[key] || 0;
  const k = parseNum(kg?.value);

  // Si es una fila custom con ppu vacío/0, marcar rojo y no calcular
  if (ppu && ppu.closest('#fam-otros') && !(w > 0)) {
    markInvalid(ppu, true);
    if (units) units.value = '';
    updateTotals();
    return;
  } else if (ppu && ppu.closest('#fam-otros')) {
    markInvalid(ppu, false);
  }

  const u = w ? (k / w) : 0;

  if (units) {
    if (k > 0 && w > 0) units.value = Math.round(u);
    else units.value = ''; // vuelve al placeholder 0
  }
  updateTotals();
}

function onPpuChange(key) {
  const { units, kg, ppu } = state.rows[key];
  const newW = parseNum(ppu?.value);

  // Actualizar peso para filas estándar
  if (newW > 0) state.weights[key] = newW;

  // Validación visual solo para custom (familia "Otros")
  if (ppu && ppu.closest('#fam-otros')) {
    markInvalid(ppu, !(newW > 0));
  }

  // Recalcula según último input no vacío (prioriza kg si hay)
  const k = parseNum(kg?.value);
  const u = parseNum(units?.value);
  if (k) onKgChange(key);
  else if (u) onUnitsChange(key);
  else updateTotals();
}

// ====== Totales y breakdown ======
function updateTotals() {
  let totalKg = 0, totalUnits = 0;

  Object.keys(state.rows).forEach(key => {
    const { units, kg } = state.rows[key];
    totalUnits += parseNum(units?.value);
    totalKg    += parseNum(kg?.value);
  });

  const tU = document.getElementById('total-units');
  const tK = document.getElementById('total-kg');
  if (tU) tU.value = Math.round(totalUnits).toString();
  if (tK) tK.value = totalKg.toFixed(2);

  // Breakdown porcentual por categoría (solo kg)
  const sumKg = (keys) => keys.reduce((acc, k) => acc + parseNum(state.rows[k]?.kg?.value), 0);
  const kgCama = sumKg(CATEGORIES.cama);
  const kgRizo = sumKg(CATEGORIES.rizo);
  const kgMant = sumKg(CATEGORIES.mant);

  const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0) + '%';
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('pct-cama-kg', pct(kgCama, totalKg));
  setText('pct-rizo-kg', pct(kgRizo, totalKg));
  setText('pct-mant-kg', pct(kgMant, totalKg));
}

// ====== Estimador por habitaciones ======
function setUnitsForKey(key, units) {
  const row = state.rows[key];
  if (!row) return;
  if (row.units) {
    if (units > 0) row.units.value = Math.round(units);
    else row.units.value = ''; // placeholder 0
  }
  onUnitsChange(key);
}

function clearAllRows() {
  // Tabla principal
  Object.values(state.rows).forEach(({ units, kg, ppu }) => {
    if (units) units.value = '';
    if (kg)    kg.value    = '';
    // limpiar estados inválidos de posibles custom
    if (ppu && ppu.closest('#fam-otros')) markInvalid(ppu, false);
  });

  // Estimador: limpiar campos y resetear factores a 1
  const idsCounts = ['est-simples','est-dobles','est-suites','est-cubiertos'];
  idsCounts.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  const idsFactors = ['est-factor-s','est-factor-d','est-factor-u','est-factor-cub'];
  idsFactors.forEach(id => { const el = document.getElementById(id); if (el) el.value = '1'; });

  updateTotals();
}

// Factor por campo con fallback (si no hay input, usa 1; si existe #est-factor, lo toma como respaldo)
function getFactor(id) {
  const globalFallback = parseNum(document.getElementById('est-factor')?.value) || 1;
  const v = parseNum(document.getElementById(id)?.value);
  return Math.max(0, v || globalFallback || 1);
}

function applyEstimator() {
  const s = parseNum(document.getElementById('est-simples')?.value);
  const d = parseNum(document.getElementById('est-dobles')?.value);
  const u = parseNum(document.getElementById('est-suites')?.value);
  const cubiertos = parseNum(document.getElementById('est-cubiertos')?.value);

  const fS = getFactor('est-factor-s');
  const fD = getFactor('est-factor-d');
  const fU = getFactor('est-factor-u');
  const fC = getFactor('est-factor-cub');

  const totalsByKey = {};
  Object.keys(state.rows).forEach(k => totalsByKey[k] = 0);

  const addForRooms = (count, roomDef, factor) => {
    if (count <= 0 || factor <= 0) return;
    Object.entries(roomDef).forEach(([key, perRoom]) => {
      if (totalsByKey[key] !== undefined) totalsByKey[key] += perRoom * count * factor;
    });
  };

  // Habitaciones
  addForRooms(s, ROOM_MATRIX.simple, fS);
  addForRooms(d, ROOM_MATRIX.doble,  fD);
  addForRooms(u, ROOM_MATRIX.suite,  fU);

  // Mantelería por "Cubiertos"
  if (cubiertos > 0 && fC > 0) {
    totalsByKey.servilleta += cubiertos * fC;
    totalsByKey.mantel     += Math.ceil(cubiertos / 4) * fC;
  }

  // Aplicar a la UI
  Object.entries(totalsByKey).forEach(([key, units]) => setUnitsForKey(key, units));
  updateTotals();
}

// ====== Boot ======
window.addEventListener('DOMContentLoaded', () => {
  initRows();

  // Estimador (si existe el bloque en el HTML)
  const btnApply = document.getElementById('est-apply');
  const btnClear = document.getElementById('est-clear');
  const btnAddOther = document.getElementById('otros-add');
  if (btnApply) btnApply.addEventListener('click', applyEstimator);
  if (btnClear) btnClear.addEventListener('click', clearAllRows);
  if (btnAddOther) btnAddOther.addEventListener('click', () => addCustomItem());
});

// ====== “Otros”: añadir fila libre ======
function addCustomItem(prefillName = '', prefillPPU = 0) {
  const host = document.getElementById('otros-rows');
  if (!host) return;

  const key = 'custom_' + (++state.customSeq);

  // Fila con mismos 4 campos: [Artículo] [Unidades] [Kilos] [Peso/ud]
  const row = document.createElement('div');
  row.className = 'cfg-grid';
  row.setAttribute('data-key', key);
  row.innerHTML = `
    <div class="item-name">
      <input class="cfg-input" type="text" data-field="name" placeholder="Nombre del artículo" value="${prefillName}">
    </div>
    <input class="cfg-input col-un" type="number" min="0" step="1" inputmode="numeric" placeholder="0" data-field="units">
    <input class="cfg-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" data-field="kg">
    <input class="cfg-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" data-field="ppu">
  `;

  host.appendChild(row);

  // Registrar en estado y enganchar eventos
  const units = row.querySelector('[data-field="units"]');
  const kg    = row.querySelector('[data-field="kg"]');
  const ppu   = row.querySelector('[data-field="ppu"]');
  const name  = row.querySelector('[data-field="name"]');

  // En custom: PPU empieza vacío y marcado como inválido (rojo) hasta que sea > 0
  ppu.value = prefillPPU > 0 ? Number(prefillPPU).toFixed(2) : '';
  markInvalid(ppu, !(parseNum(ppu.value) > 0));

  // (Opcional) nombre obligatorio → marcar si vacío
  if (name) markInvalid(name, name.value.trim() === '');

  state.rows[key] = { row, units, kg, ppu, name };

  // Listeners
  if (name) {
    const validateName = () => markInvalid(name, name.value.trim() === '');
    name.addEventListener('input', validateName);
    name.addEventListener('blur',  validateName);
  }

  if (ppu) {
    ppu.addEventListener('input', () => {
      const v = parseNum(ppu.value);
      markInvalid(ppu, !(v > 0));
      // Si ya hay algo en unidades o kg, recalculo con el nuevo ppu
      const k = parseNum(kg?.value);
      const u = parseNum(units?.value);
      if (k) onKgChange(key);
      else if (u) onUnitsChange(key);
      else updateTotals();
    });
  }

  if (units) units.addEventListener('input', () => onUnitsChange(key));
  if (kg)    kg.addEventListener('input',    () => onKgChange(key));

  updateTotals();
}
