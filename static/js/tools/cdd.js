/* Conversor de dureza — UNATOMO
   Convierte entre ppm (mg/L como CaCO3), °f (franceses) y °dH (alemanes).
   Uso: 
     - Añade <div id="tool-cdd"></div> en la sección "Herramientas".
     - Incluye tool_CDD.css y tool_CDD.js en tu HTML.
     - Opcional: se auto-monta si existe #tool-cdd. O llama: ToolCDD.render(el)
*/
(function () {
  'use strict';

  // Factores de conversión respecto a mg/L (ppm) como CaCO3
  // 1 °f = 10 ppm; 1 °dH = 17.848 ppm
  const FACTOR = {
    ppm: 1,
    degf: 10,
    degh: 17.848
  };

  const fmt = (n, p) => {
    if (!isFinite(n)) return '—';
    const num = Number(n);
    const s = (p >= 0) ? num.toFixed(p) : String(num);
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };

  function convert(fromUnit, value) {
    const val = Number(value);
    if (!isFinite(val)) return null;
    // Paso 1: a ppm
    const ppm = fromUnit === 'ppm'
      ? val
      : (fromUnit === 'degf' ? val * FACTOR.degf
        : val * FACTOR.degh); // degh

    return {
      ppm,
      degf: ppm / FACTOR.degf,
      degh: ppm / FACTOR.degh
    };
  }

  function template() {
    return `
    <div class="tool-cdd">
      <header class="toolcdd-head">
        <h3>Conversor de dureza</h3>
        <p class="muted">Convierte entre <strong>ppm</strong>, <strong>°f</strong> y <strong>°dH</strong>.</p>
      </header>

      <form class="toolcdd-form" autocomplete="off">
        <div class="row input-row">
          <label class="sr-only" for="cdd-value">Valor</label>
          <input id="cdd-value" class="cdd-input" type="number" inputmode="decimal" step="any" placeholder="Introduce un valor" />

          <label class="sr-only" for="cdd-unit">Unidad</label>
          <select id="cdd-unit" class="cdd-select" aria-label="Unidad de entrada">
            <option value="ppm">ppm (mg/L CaCO₃)</option>
            <option value="degf">°f (franceses)</option>
            <option value="degh">°dH (alemanes)</option>
          </select>

          <label class="sr-only" for="cdd-prec">Decimales</label>
          <select id="cdd-prec" class="cdd-select" aria-label="Número de decimales">
            <option value="0">0 dec.</option>
            <option value="1">1 dec.</option>
            <option value="2" selected>2 dec.</option>
            <option value="3">3 dec.</option>
          </select>
        </div>

        <div class="row results-row" aria-live="polite" aria-atomic="true">
          <div class="card">
            <div class="label">ppm (mg/L CaCO₃)</div>
            <div class="value" data-out="ppm">—</div>
            <button class="copy-btn" type="button" data-copy="ppm" title="Copiar ppm">Copiar</button>
          </div>

          <div class="card">
            <div class="label">°f (franceses)</div>
            <div class="value" data-out="degf">—</div>
            <button class="copy-btn" type="button" data-copy="degf" title="Copiar °f">Copiar</button>
          </div>

          <div class="card">
            <div class="label">°dH (alemanes)</div>
            <div class="value" data-out="degh">—</div>
            <button class="copy-btn" type="button" data-copy="degh" title="Copiar °dH">Copiar</button>
          </div>
        </div>

        <div class="row actions-row">
          <button class="btn-reset" type="button" id="cdd-clear">Limpiar</button>
          <button class="btn-copy-all" type="button" id="cdd-copy-all">Copiar todo</button>
        </div>
      </form>

      <footer class="toolcdd-foot">
        <small class="muted">Equivalencias: 1&nbsp;°f = 10&nbsp;ppm · 1&nbsp;°dH = 17.848&nbsp;ppm</small>
      </footer>
    </div>`;
  }

  function attachLogic(root) {
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => [...root.querySelectorAll(sel)];

    const input = $('#cdd-value');
    const unit  = $('#cdd-unit');
    const prec  = $('#cdd-prec');

    const outs = {
      ppm: $('[data-out="ppm"]'),
      degf: $('[data-out="degf"]'),
      degh: $('[data-out="degh"]')
    };

    function update() {
      const v = input.value.trim();
      if (v === '') {
        Object.values(outs).forEach(el => el.textContent = '—');
        return;
      }
      const res = convert(unit.value, v);
      if (!res) {
        Object.values(outs).forEach(el => el.textContent = '—');
        return;
      }
      const p = parseInt(prec.value, 10);
      outs.ppm.textContent  = fmt(res.ppm,  p);
      outs.degf.textContent = fmt(res.degf, p);
      outs.degh.textContent = fmt(res.degh, p);
    }

    // Eventos
    input.addEventListener('input', update);
    unit.addEventListener('change', update);
    prec.addEventListener('change', update);

    // Copiar individual
    $$('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.getAttribute('data-copy');
        const val = outs[key]?.textContent?.trim() || '';
        if (!val || val === '—') return;
        try {
          await navigator.clipboard.writeText(val);
          flash(btn);
        } catch {}
      });
    });

    // Copiar todo
    $('#cdd-copy-all').addEventListener('click', async () => {
      const row = [
        `ppm=${outs.ppm.textContent}`,
        `°f=${outs.degf.textContent}`,
        `°dH=${outs.degh.textContent}`
      ].join(' | ');
      if (row.includes('—')) return;
      try {
        await navigator.clipboard.writeText(row);
        flash('#cdd-copy-all');
      } catch {}
    });

    // Limpiar
    $('#cdd-clear').addEventListener('click', () => {
      input.value = '';
      update();
      input.focus();
    });

    // Efecto visual al copiar
    function flash(elOrSel) {
      const el = (typeof elOrSel === 'string') ? root.querySelector(elOrSel) : elOrSel;
      if (!el) return;
      el.classList.add('is-copied');
      setTimeout(() => el.classList.remove('is-copied'), 800);
    }

    // Primera pinta
    update();
  }

  function render(el) {
    if (!el) return;
    el.innerHTML = template();
    attachLogic(el);
  }

  // Exponer módulo
  window.ToolCDD = { render };

  // Auto-montaje si existe #tool-cdd en el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const mount = document.getElementById('tool-cdd');
      if (mount) render(mount);
    });
  } else {
    const mount = document.getElementById('tool-cdd');
    if (mount) render(mount);
  }
})();

