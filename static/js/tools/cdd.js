// /static/js/tools/cdd.js
(() => {
  'use strict';

  const ROOT_ID = 'tool-cdd';
  const root = document.getElementById(ROOT_ID);
  if (!root) {
    console.warn(`[CDD] Punto de montaje #${ROOT_ID} no encontrado.`);
    return;
  }

  // Unidades soportadas (en el orden que mostraremos abajo)
  const UNITS = [
    { key: 'fh',  label: '°fH (Franceses)' },      // 1 °fH = 10 mg/L CaCO3
    { key: 'dh',  label: '°dH (Alemanes)' },       // 1 °dH = 17.848 mg/L CaCO3
    { key: 'mmol',label: 'mmol/L (CaCO₃)' },       // 1 mmol/L = 100.09 mg/L CaCO3
    { key: 'ppm', label: 'ppm (mg/L CaCO₃)' }
  ];

  // Conversión pivotando a ppm (mg/L CaCO3)
  const toPPM = {
    fh:   (v) => v * 10,
    dh:   (v) => v * 17.848,
    mmol: (v) => v * 100.09,
    ppm:  (v) => v
  };
  const fromPPM = {
    fh:   (ppm) => ppm / 10,
    dh:   (ppm) => ppm / 17.848,
    mmol: (ppm) => ppm / 100.09,
    ppm:  (ppm) => ppm
  };

  const fmt = (n) => {
    if (!isFinite(n)) return '';
    if (Math.abs(n) >= 1000) return n.toFixed(1);
    const s = n.toFixed(2);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  };

  // --- UI ---
  root.classList.add('cdd-wrap');
  root.innerHTML = `
    <div class="cdd-card">
      <h3 class="cdd-title">Conversor de dureza</h3>

      <div class="cdd-row">
        <label class="cdd-field">
          <span class="cdd-field-label">Valor</span>
          <input type="number" step="0.01" min="0" id="cdd-value" class="cdd-input" placeholder="0.00" inputmode="decimal" />
        </label>

        <label class="cdd-field">
          <span class="cdd-field-label">Unidad</span>
          <select id="cdd-unit" class="cdd-select" aria-label="Unidad de entrada">
            ${UNITS.map(u => `<option value="${u.key}">${u.label}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="cdd-results-grid" id="cdd-results-grid"></div>
    </div>
  `;

  const $value = root.querySelector('#cdd-value');
  const $unit  = root.querySelector('#cdd-unit');
  const $grid  = root.querySelector('#cdd-results-grid');

  // Construimos los 4 recuadros (readonly)
  function buildOutputs() {
    $grid.innerHTML = UNITS.map(u => `
      <label class="cdd-field cdd-ro">
        <span class="cdd-field-label">${u.label}</span>
        <input id="out-${u.key}" class="cdd-input cdd-readonly" type="text" value="0" readonly tabindex="-1" />
      </label>
    `).join('');
  }

  function recalc() {
    const raw = parseFloat(($value.value || '0').replace(',', '.'));
    const val = (isFinite(raw) && raw >= 0) ? raw : 0;
    const unit = $unit.value || 'ppm';
    const ppm = toPPM[unit](val);

    UNITS.forEach(u => {
      const el = document.getElementById(`out-${u.key}`);
      if (!el) return;
      el.value = fmt(fromPPM[u.key](ppm));
    });
  }

  // Eventos
  $value.addEventListener('input', recalc);
  $unit.addEventListener('change', recalc);

  // Estado inicial: 0 en ppm
  buildOutputs();
  $unit.value = 'ppm';
  $value.value = '0';
  recalc();

  // Bandera de diagnóstico
  window.__CDD_OK__ = true;
  console.info('[CDD] Conversor listo.');
})();
