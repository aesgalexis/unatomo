// /static/js/tools/cdd.js  (ajusta el path según tu estructura)
(() => {
  'use strict';

  const ROOT_ID = 'tool-cdd';
  const root = document.getElementById(ROOT_ID);
  if (!root) {
    console.warn(`[CDD] Punto de montaje #${ROOT_ID} no encontrado.`);
    return;
  }

  // Unidades soportadas
  const UNITS = [
    { key: 'fh',  label: '°fH (Franceses)' },      // 1 °fH = 10 mg/L CaCO3
    { key: 'dh',  label: '°dH (Alemanes)' },       // 1 °dH = 17.848 mg/L CaCO3
    { key: 'mmol',label: 'mmol/L (CaCO₃)' },       // 1 mmol/L = 100.09 mg/L CaCO3
    { key: 'ppm', label: 'ppm (mg/L CaCO₃)' }
  ];

  // Conversión: todo pivota a ppm (mg/L CaCO3)
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

  function fmt(n) {
    if (!isFinite(n)) return '';
    // 0–999 con 2 decimales si hace falta; >1000 con 1 decimal
    if (Math.abs(n) >= 1000) return n.toFixed(1);
    const s = n.toFixed(2);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  // UI
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
          <select id="cdd-unit" class="cdd-select">
            ${UNITS.map(u => `<option value="${u.key}">${u.label}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="cdd-results" id="cdd-results" aria-live="polite"></div>
    </div>
  `;

  const $value = root.querySelector('#cdd-value');
  const $unit  = root.querySelector('#cdd-unit');
  const $out   = root.querySelector('#cdd-results');

  function render(ppm) {
    const rows = UNITS.map(u => {
      const v = fromPPM[u.key](ppm);
      return `
        <div class="cdd-result">
          <div class="cdd-result-label">${u.label}</div>
          <div class="cdd-result-value">${fmt(v)}</div>
        </div>
      `;
    }).join('');
    $out.innerHTML = rows;
  }

  function recalc() {
    const raw = parseFloat(($value.value || '').replace(',', '.'));
    if (!isFinite(raw) || raw < 0) {
      $out.innerHTML = '';
      return;
    }
    const unit = $unit.value;
    const ppm = toPPM[unit](raw);
    render(ppm);
  }

  $value.addEventListener('input', recalc);
  $unit.addEventListener('change', recalc);

  // Valores por defecto de cortesía
  $unit.value = 'ppm';
  $value.value = '100';
  recalc();

  // Señal visible en consola para comprobar que ha cargado
  window.__CDD_OK__ = true;
  console.info('[CDD] Conversor listo.');
})();
