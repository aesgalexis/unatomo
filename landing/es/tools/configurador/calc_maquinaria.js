// ===== calc_maquinaria.js =====
// Calcula mix de Lavadoras / Secadoras / Calandras / Plegadores en función de tus kg y horas.
// Se actualiza dinámicamente al cambiar cualquier input relevante.

// ---- Claves por categoría (coinciden con tus data-key) ----
const MACH_KEYS = {
  cama: ['sabanas_s','sabanas_m','sabanas_l','nordico_s','nordico_m','nordico_l','fundas_std'],
  rizo: ['toalla_alfombrin','toalla_manos','toalla_bano','toalla_piscina','albornoz'],
  mant: ['mantel','servilleta']
};

// Pesos de referencia por si falta ppu visible
const REF_WEIGHTS_MACH = {
  sabanas_s: 0.50, sabanas_m: 0.70, sabanas_l: 0.90,
  nordico_s: 1.50, nordico_m: 2.00, nordico_l: 2.50,
  fundas_std: 0.20,
  toalla_alfombrin: 0.60, toalla_manos: 0.25, toalla_bano: 0.50, toalla_piscina: 0.70,
  albornoz: 1.20,
  mantel: 0.40, servilleta: 0.05
};

// ---- Helpers DOM/num ----
function m_qs(sel, root=document) { return root.querySelector(sel); }
function m_qsa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function m_num(v){ const n=parseFloat(String(v??'').replace(',','.')); return Number.isFinite(n)?n:0; }

// ---- Lectura de kg/unidades desde tu configurador ----
function getKgForKey(key) {
  const row = m_qs(`.cfg-grid[data-key="${key}"]`);
  if (!row) return 0;
  const kgEl = row.querySelector('[data-field="kg"]');
  const unEl = row.querySelector('[data-field="units"]');
  const puEl = row.querySelector('[data-field="ppu"]');

  const k = m_num(kgEl?.value);
  if (k > 0) return k;

  const u = m_num(unEl?.value);
  let w = m_num(puEl?.value);
  if (!(w>0)) w = REF_WEIGHTS_MACH[key] ?? 0;

  return (u>0 && w>0) ? u*w : 0;
}
function getUnitsForKeys(keys){
  let total = 0;
  keys.forEach(key=>{
    const row = m_qs(`.cfg-grid[data-key="${key}"]`);
    if (!row) return;
    const unEl = row.querySelector('[data-field="units"]');
    const kgEl = row.querySelector('[data-field="kg"]');
    const puEl = row.querySelector('[data-field="ppu"]');
    let u = m_num(unEl?.value);
    if (u>0) { total += u; return; }
    const k = m_num(kgEl?.value); let w = m_num(puEl?.value);
    if (!(w>0)) w = REF_WEIGHTS_MACH[key] ?? 0;
    if (k>0 && w>0) total += Math.round(k/w);
  });
  return total;
}

// ---- Demanda por hora ----
function kgPerHour(kgPerDay, hours){
  const h = Math.max(1, Math.min(24, Math.round(hours||8)));
  return kgPerDay / h;
}

// ---- Catálogo activo (checkboxes) ----
function getActiveModels() {
  const washers = m_qsa('.mach-model[data-type="washer"]:checked')
    .map(el => m_num(el.getAttribute('data-cap')) ).filter(Boolean).sort((a,b)=>b-a);
  const dryers = m_qsa('.mach-model[data-type="dryer"]:checked')
    .map(el => m_num(el.getAttribute('data-cap')) ).filter(Boolean).sort((a,b)=>b-a);
  const ironers = m_qsa('.mach-model[data-type="ironer"]:checked')
    .map(el => m_num(el.getAttribute('data-kgph')) ).filter(Boolean).sort((a,b)=>b-a);
  return { washers, dryers, ironers };
}

// ---- Capacidad efectiva por máquina ----
function washerEffKgPh(cap, fill, washMin){
  const cyclesPerHour = 60 / Math.max(10, washMin||48);
  return cap * (fill||0.9) * cyclesPerHour; // kg/h máquina
}
function dryerEffKgPh(cap, fill, dryMin, handleMin){
  const totalMin = Math.max(5, (dryMin||35) + (handleMin||5));
  const cyclesPerHour = 60 / totalMin;
  return cap * (fill||0.85) * cyclesPerHour; // kg/h máquina
}
function ironerEffKgPh(kgph){ return Math.max(1, kgph||60); } // ya viene en kg/h

// ---- Greedy: compone mix mínimo de máquinas para cubrir demanda kg/h ----
function composeMix(requiredKgPh, capacitiesEffDesc) {
  // capacitiesEffDesc: array de capacidades efectivas (kg/h por modelo) ordenado desc
  const result = []; // [{eff:xx, qty:n}]
  let remaining = Math.max(0, requiredKgPh);

  if (!capacitiesEffDesc.length || remaining<=0) return result;

  for (let i=0;i<capacitiesEffDesc.length && remaining>0;i++){
    const eff = capacitiesEffDesc[i];
    if (eff <= 0) continue;
    // tomar tantas como haga falta de este modelo
    const qty = Math.floor(remaining / eff);
    if (qty > 0) {
      result.push({ eff, qty });
      remaining -= qty * eff;
    }
    // si aún sobra y es la última opción, redondea al alza 1 más
    const last = (i === capacitiesEffDesc.length - 1);
    if (remaining > 0 && last) {
      result.push({ eff, qty: 1 });
      remaining = 0;
    }
  }
  return result;
}

// ---- Render resumen (ej. "2×55 kg + 1×24 kg") ----
function summarizeWasherMix(washMix, modelCapsAscMap) {
  // modelCapsAscMap: { effKgPh -> capLabel } para mostrar "×cap kg"
  // Agrupa por capLabel equivalente (mismo eff no implica mismo cap; por eso pasamos un map)
  const groups = {};
  washMix.forEach(({eff, qty})=>{
    const label = modelCapsAscMap[eff] || `${eff.toFixed(0)} kg/h`;
    groups[label] = (groups[label]||0) + qty;
  });
  return Object.entries(groups)
    .map(([lab,qty]) => `${qty}×${lab}`)
    .join(' + ');
}

function renderMachinery() {
  const host = m_qs('#mach-results');
  if (!host) return;

  // Demanda diaria (kg)
  const kgCama = MACH_KEYS.cama.reduce((s,k)=>s+getKgForKey(k),0);
  const kgRizo = MACH_KEYS.rizo.reduce((s,k)=>s+getKgForKey(k),0);
  const kgMant = MACH_KEYS.mant.reduce((s,k)=>s+getKgForKey(k),0);
  const kgTotal = kgCama + kgRizo + kgMant;

  // Parámetros
  const hours = m_num(m_qs('#mach-hours')?.value) || 8;

  const washMin = m_num(m_qs('#mach-wash-min')?.value) || 48;
  const washFill = m_num(m_qs('#mach-wash-fill')?.value) || 0.9;

  const dryMin = m_num(m_qs('#mach-dry-min')?.value) || 35;
  const dryHandle = m_num(m_qs('#mach-dry-handle')?.value) || 5;
  const dryFill = m_num(m_qs('#mach-dry-fill')?.value) || 0.85;

  const { washers, dryers, ironers } = getActiveModels();

  // Demanda por hora
  const reqWashKgPh  = kgPerHour(kgTotal, hours);
  const reqDryKgPh   = kgPerHour(kgRizo,  hours);
  const reqIronKgPh  = kgPerHour(kgCama + kgMant, hours);

  // Capacidades efectivas por modelo (orden desc)
  // Mapeo eff -> etiqueta de “cap kg” para el resumen
  const washerEffsDesc = washers.map(cap => washerEffKgPh(cap, washFill, washMin)).sort((a,b)=>b-a);
  const washerEffToCapLabel = {};
  washers.forEach(cap => {
    const eff = washerEffKgPh(cap, washFill, washMin);
    washerEffToCapLabel[eff] = `${cap} kg`;
  });

  const dryerEffsDesc = dryers.map(cap => dryerEffKgPh(cap, dryFill, dryMin, dryHandle)).sort((a,b)=>b-a);
  const dryerEffToCapLabel = {};
  dryers.forEach(cap => {
    const eff = dryerEffKgPh(cap, dryFill, dryMin, dryHandle);
    dryerEffToCapLabel[eff] = `${cap} kg`;
  });

  const ironerEffsDesc = ironers.map(kgph => ironerEffKgPh(kgph)).sort((a,b)=>b-a);
  const ironEffToLabel = {};
  ironers.forEach(kgph => { ironEffToLabel[ironEffKgPh(kgph)] = `${kgph} kg/h`; });

  // Componer mixes
  const washMix = composeMix(reqWashKgPh, washerEffsDesc);
  const dryMix  = composeMix(reqDryKgPh,  dryerEffsDesc);
  const ironMix = composeMix(reqIronKgPh, ironerEffsDesc);

  // Resumen legible
  const washSummary = washMix.length
    ? summarizeWasherMix(washMix, washerEffToCapLabel)
    : '—';

  const drySummary = dryMix.length
    ? summarizeWasherMix(dryMix, dryerEffToCapLabel)
    : '—';

  const ironSummary = ironMix.length
    ? summarizeWasherMix(ironMix, ironEffToLabel)
    : '—';

  // Plegadores (toallas)
  const towelUnitsPerDay = getUnitsForKeys(['toalla_manos','toalla_bano','toalla_piscina']);
  const towelUnitsPerHour = towelUnitsPerDay / Math.max(1, Math.min(24, Math.round(hours||8)));
  const pph = Math.max(50, m_num(m_qs('#mach-fold-pph')?.value) || 400);
  const foldQty = Math.ceil(towelUnitsPerHour / pph);

  // HTML resultados
  const row = (name, qty, note) => `
    <div class="cfg-grid" style="grid-template-columns: 2fr 1fr 1fr; gap:10px;">
      <div>${name}</div>
      <div>${qty > 0 ? qty : '—'}</div>
      <div>${note || ''}</div>
    </div>`;

  host.innerHTML = [
    row('Lavadoras', washMix.reduce((s,r)=>s+r.qty,0), washSummary),
    row('Secadoras (rizo)', dryMix.reduce((s,r)=>s+r.qty,0), drySummary),
    row('Calandras (plano)', ironMix.reduce((s,r)=>s+r.qty,0), ironSummary),
    row('Plegadores de toallas', Math.max(0, foldQty), `${pph} uds/h`)
  ].join('');
}

// ---- Enlaces de eventos ----
function hookMachineryRecalc() {
  // cualquier input del bloque maquinaria
  m_qsa('#machinery-card .cfg-input').forEach(el=>{
    el.addEventListener('input', renderMachinery);
    el.addEventListener('change', renderMachinery);
  });
  // checkboxes de modelos
  m_qsa('#machinery-card .mach-model').forEach(el=>{
    el.addEventListener('change', renderMachinery);
  });
  // y además escuchar al resto del configurador (para que cambie con kg/unidades)
  m_qsa('.cfg-input').forEach(el=>{
    el.addEventListener('input', renderMachinery);
    el.addEventListener('change', renderMachinery);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  hookMachineryRecalc();
  renderMachinery();
});
