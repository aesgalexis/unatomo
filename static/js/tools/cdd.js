// /static/js/tools/cdd.js
(() => {
  'use strict';

  const MOUNT_ID = 'tool-cdd';

  // Factores de conversión: base = mmol/L (milimoles CaCO3/L)
  // Unidades típicas: dH (alemana), °fH (francesa), ppm (mg/L CaCO3), mmol/L
  const factorsFromBase = {
    'mmol/L': 1,              // base
    'ppm': 100.09,            // 1 mmol/L CaCO3 = 100.09 mg/L (ppm)
    'dH': 5.607,              // 1 mmol/L = 5.607 °dH
    '°fH': 10.009             // 1 mmol/L = 10.009 °fH
  };
  const factorsToBase = {
    'mmol/L': 1,
    'ppm': 1 / 100.09,
    'dH': 1 / 5.607,
    '°fH': 1 / 10.009
  };

  function round(x) {
    return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0;
  }

  function buildSelect(options, value) {
    const sel = document.createElement('select');
    sel.className = 'cdd-input';
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if (o === value) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  function build() {
    const root = document.getElementById(MOUNT_ID);
    if (!root) return;

    root.className = 'tool-cdd';

    // --- TOP: Valor + Unidad + Botones (Calcular / Reset) ---
    const rowTop = document.createElement('div');
    rowTop.className = 'cdd-row cdd-row--top';

    const fieldValue = document.createElement('div');
    fieldValue.className = 'cdd-field';
    const inputValue = document.createElement('input');
    inputValue.type = 'number';
    inputValue.inputMode = 'decimal';
    inputValue.step = 'any';
    inputValue.min = '0';
    inputValue.value = '0';             // empieza en 0 (como pediste)
    inputValue.className = 'cdd-input';
    fieldValue.appendChild(inputValue);

    const fieldUnit = document.createElement('div');
    fieldUnit.className = 'cdd-field';
    const selectUnit = buildSelect(['dH','°fH','ppm','mmol/L'], 'dH');
    fieldUnit.appendChild(selectUnit);

    const btnCalc = document.createElement('button');
    btnCalc.type = 'button';
    btnCalc.className = 'cdd-btn cdd-btn--primary';
    btnCalc.textContent = 'Calcular';

    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'cdd-btn cdd-btn--ghost';
    btnReset.textContent = 'Reset';
    btnReset.disabled = true; // ← comienza inhabilitado

    rowTop.append(fieldValue, fieldUnit, btnCalc, btnReset);

    // --- BOTTOM: 4 resultados (solo lectura) ---
    const rowBottom = document.createElement('div');
    rowBottom.className = 'cdd-row cdd-row--bottom';

    function resultBox(label) {
      const wrap = document.createElement('div');
      wrap.className = 'cdd-field';

      const out = document.createElement('input');
      out.type = 'text';
      out.className = 'cdd-output';
      out.readOnly = true;
      out.value = '0';
      out.setAttribute('aria-label', label);

      const tag = document.createElement('span');
      tag.className = 'cdd-unit-tag';
      tag.textContent = label;

      wrap.append(out, tag);
      return { wrap, out };
    }

    const r_dH = resultBox('dH');
    const r_fH = resultBox('°fH');
    const r_ppm = resultBox('ppm');
    const r_mmol = resultBox('mmol/L');

    rowBottom.append(r_dH.wrap, r_fH.wrap, r_ppm.wrap, r_mmol.wrap);

    root.innerHTML = '';
    root.append(rowTop, rowBottom);

    // --- Estado inicial para controlar el botón Reset ---
    const initial = {
      value: inputValue.value, // "0"
      unit: selectUnit.value   // "dH"
    };

    function setResetEnabled(enabled) {
      btnReset.disabled = !enabled;
    }

    function checkDirty() {
      const dirty = (inputValue.value !== initial.value) || (selectUnit.value !== initial.unit);
      setResetEnabled(dirty);
    }

    // --- Conversión ---
    function convertAll() {
      const val = parseFloat(inputValue.value);
      if (!Number.isFinite(val)) return;

      // a base (mmol/L)
      const mmol = val * (factorsToBase[selectUnit.value] || 1);

      r_mmol.out.value = String(round(mmol));
      r_ppm.out.value  = String(round(mmol * factorsFromBase['ppm']));
      r_dH.out.value   = String(round(mmol * factorsFromBase['dH']));
      r_fH.out.value   = String(round(mmol * factorsFromBase['°fH']));
    }

    // --- Eventos ---
    // Cálculo automático al cambiar valor/unidad + habilitar Reset si hay cambios
    inputValue.addEventListener('input', () => { convertAll(); checkDirty(); });
    selectUnit.addEventListener('change', () => { convertAll(); checkDirty(); });

    // Botón Calcular (recalcula a demanda)
    btnCalc.addEventListener('click', () => {
      convertAll();
      checkDirty(); // por si algo quedó fuera de sync
    });

    // Botón Reset (restaura y deshabilita)
    btnReset.addEventListener('click', () => {
      inputValue.value = initial.value;
      selectUnit.value = initial.unit;
      convertAll();
      setResetEnabled(false);
    });

    // Primer cálculo
    convertAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
