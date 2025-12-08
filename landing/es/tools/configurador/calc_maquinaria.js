// calc_maquinaria.js
// Recomendación de lavadoras a partir de los kg totales, jornada,
// capacidades y ciclos individuales por lavadora.

(function () {
  // Capacidades disponibles (kg)
  const WASH_CAPACITIES = [8, 13, 18, 22, 24, 30, 40, 55, 110];

  // Jornada y ciclos por defecto
  const DEFAULT_HOURS = 8;

  // Tiempos de ciclo (solo lavado). A esto SIEMPRE se le suma +5 min carga/descarga.
  const MIN_WASH_MIN = 30;
  const MAX_WASH_MIN = 90;
  const STEP_WASH_MIN = 5;
  const EXTRA_LOAD_UNLOAD = 5; // fijo
  const DEFAULT_WASH_MIN = 55; // por defecto: 55 + 5 = 60 min totales

  let machineSeq = 0;
  let currentMachines = []; // { id, cap, washMin, name }

  // ====== Utils ======
  function toNumber(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function getTotalKgPerDay() {
    const el = document.getElementById('total-kg');
    return el ? toNumber(el.value) : 0;
  }

  function getHours() {
    const el = document.getElementById('mach-hours');
    let h = el ? toNumber(el.value) : DEFAULT_HOURS;
    if (!h) h = DEFAULT_HOURS;
    h = Math.min(24, Math.max(1, h));
    if (el) el.value = String(h);
    return h;
  }

  // Capacidad/día de una lavadora concreta en función de su ciclo
  function capacityPerMachinePerDay(machine, hours) {
    const washMin = machine.washMin || DEFAULT_WASH_MIN;
    const totalCycleMin = washMin + EXTRA_LOAD_UNLOAD; // siempre +5
    const cyclesPerDay = (hours * 60) / totalCycleMin;
    return machine.cap * cyclesPerDay;
  }

  // ====== Cálculo de composición base (asumiendo ciclo de 60 min) ======
  function computeAutoComposition(kgPerDay, hours) {
    if (kgPerDay <= 0 || hours <= 0) return [];

    const sortedDesc = [...WASH_CAPACITIES].sort((a, b) => b - a);
    const sortedAsc = [...WASH_CAPACITIES].sort((a, b) => a - b);

    const capPerDay = cap => cap * hours; // asumiendo 1 ciclo/hora
    let remaining = kgPerDay;

    const comp = [];
    const totalsByCap = new Map();

    // Greedy con máquinas grandes
    for (const cap of sortedDesc) {
      if (remaining <= 0) break;
      const perMachine = capPerDay(cap);
      const needed = Math.floor(remaining / perMachine);
      if (needed > 0) {
        totalsByCap.set(cap, (totalsByCap.get(cap) || 0) + needed);
        remaining -= needed * perMachine;
      }
    }

    // Si queda resto, añadimos 1 máquina que lo cubra
    if (remaining > 0) {
      let chosen = sortedAsc[sortedAsc.length - 1]; // por defecto la más grande
      for (const cap of sortedAsc) {
        if (capPerDay(cap) >= remaining) {
          chosen = cap;
          break;
        }
      }
      totalsByCap.set(chosen, (totalsByCap.get(chosen) || 0) + 1);
    }

    totalsByCap.forEach((n, cap) => {
      comp.push({ cap, n });
    });

    comp.sort((a, b) => b.cap - a.cap);
    return comp;
  }

  function computeFixedComposition(kgPerDay, hours, cap) {
    if (kgPerDay <= 0 || hours <= 0 || cap <= 0) return [];
    const perMachine = cap * hours; // 1 ciclo/hora (60 min)
    const n = Math.max(1, Math.ceil(kgPerDay / perMachine));
    return [{ cap, n }];
  }

  // ====== Gestión de "objetos lavadora" ======
  function rebuildMachinesFromComposition(comp) {
    currentMachines = [];
    comp.forEach(item => {
      for (let i = 0; i < item.n; i++) {
        currentMachines.push({
          id: ++machineSeq,
          cap: item.cap,
          washMin: DEFAULT_WASH_MIN,
          name: ''
        });
      }
    });
  }

  // ====== Render de la lista de lavadoras ======
  function renderMachineList() {
    const listEl = document.getElementById('mach-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!currentMachines.length) {
      const p = document.createElement('p');
      p.className = 'mach-empty';
      p.textContent = 'Sin lavadoras calculadas. Introduce kilos y jornada para ver una propuesta.';
      listEl.appendChild(p);
      return;
    }

    const hours = getHours();

    currentMachines.forEach((m, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mach-item';

      const defaultName = `Lavadora ${idx + 1}`;
      // Si el nombre era uno automático tipo "Lavadora X" o está vacío, lo renumeramos
      if (!m.name || /^Lavadora\s+\d+$/i.test(m.name.trim())) {
        m.name = defaultName;
      }

      wrapper.innerHTML = `
        <div class="mach-item-header">
          <label>
            <span class="mach-label-small">Equipo</span>
            <input
              class="cfg-input mach-name-input"
              type="text"
              data-id="${m.id}"
              value="${m.name}"
            >
          </label>
        </div>
        <div class="mach-item-fields">
          <label>
            Capacidad
            <select class="cfg-input mach-cap-select" data-id="${m.id}"></select>
          </label>
          <label>
            Duración de lavado
            <select class="cfg-input mach-cycle-select" data-id="${m.id}"></select>
          </label>
          <div class="mach-item-info cfg-note">
            ≈ <span data-role="perday">0</span> kg/día
            · ciclo total: <span data-role="cyctime">0</span> min
          </div>
          <button type="button" class="mach-remove-btn" data-id="${m.id}">
            Quitar equipo
          </button>
        </div>
      `;

      const nameInput   = wrapper.querySelector('.mach-name-input');
      const selectCap   = wrapper.querySelector('.mach-cap-select');
      const selectCycle = wrapper.querySelector('.mach-cycle-select');
      const perDaySpan  = wrapper.querySelector('[data-role="perday"]');
      const cycSpan     = wrapper.querySelector('[data-role="cyctime"]');
      const removeBtn   = wrapper.querySelector('.mach-remove-btn');

      // Nombre editable
      if (nameInput) {
        nameInput.addEventListener('input', () => {
          const val = nameInput.value.trim();
          m.name = val || defaultName;
        });
      }

      // Opciones de capacidad
      WASH_CAPACITIES.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = String(cap);
        opt.textContent = `${cap} kg`;
        if (cap === m.cap) opt.selected = true;
        selectCap.appendChild(opt);
      });

      // Opciones de duración de lavado (30–90, paso 5) + 5 min fijos
      for (let t = MIN_WASH_MIN; t <= MAX_WASH_MIN; t += STEP_WASH_MIN) {
        const opt = document.createElement('option');
        opt.value = String(t);
        const total = t + EXTRA_LOAD_UNLOAD;
        opt.textContent = `${t} + 5 min (total ${total})`;
        if (t === (m.washMin || DEFAULT_WASH_MIN)) opt.selected = true;
        selectCycle.appendChild(opt);
      }

      function refreshMachineInfo() {
        const capDay = capacityPerMachinePerDay(m, hours);
        if (perDaySpan) perDaySpan.textContent = capDay.toFixed(1).replace('.', ',');
        const totalCycle = (m.washMin || DEFAULT_WASH_MIN) + EXTRA_LOAD_UNLOAD;
        if (cycSpan) cycSpan.textContent = totalCycle;
      }

      // Cambio de capacidad individual
      selectCap.addEventListener('change', () => {
        const cap = toNumber(selectCap.value);
        if (cap > 0) {
          m.cap = cap;
          refreshMachineInfo();
          updateMachinerySummary();
        }
      });

      // Cambio de ciclo individual
      selectCycle.addEventListener('change', () => {
        const val = toNumber(selectCycle.value);
        let wash = val || DEFAULT_WASH_MIN;
        if (wash < MIN_WASH_MIN) wash = MIN_WASH_MIN;
        if (wash > MAX_WASH_MIN) wash = MAX_WASH_MIN;
        m.washMin = wash;
        refreshMachineInfo();
        updateMachinerySummary();
      });

      // Quitar equipo
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          currentMachines = currentMachines.filter(x => x.id !== m.id);
          renderMachineList();
          updateMachinerySummary();
        });
      }

      refreshMachineInfo();
      listEl.appendChild(wrapper);
    });
  }

  // ====== Resumen total (kg, cobertura, etc.) ======
  function updateMachinerySummary() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();

    const kgOut  = document.getElementById('mach-kg-total');
    const machOut = document.getElementById('mach-machines-total');
    const capOut = document.getElementById('mach-cap-total');
    const covOut = document.getElementById('mach-cover-total');
    const legend = document.getElementById('mach-legend');

    let installedKgPerDay = 0;
    const grouped = new Map(); // cap -> count

    currentMachines.forEach(m => {
      installedKgPerDay += capacityPerMachinePerDay(m, hours);
      grouped.set(m.cap, (grouped.get(m.cap) || 0) + 1);
    });

    const totalMachines = currentMachines.length;
    const coverage = totalKg > 0 ? installedKgPerDay / totalKg : 0;
    const pct = totalKg > 0 ? Math.round(coverage * 100) : 0;

    if (kgOut)   kgOut.textContent = totalKg.toFixed(1).replace('.', ',');
    if (machOut) machOut.textContent = totalMachines;
    if (capOut)  capOut.textContent = installedKgPerDay.toFixed(1).replace('.', ',');

    if (covOut) {
      covOut.textContent = pct + '%';
      covOut.classList.toggle('is-under', pct < 100 && totalKg > 0);
      covOut.classList.toggle('is-over',  pct >= 100 && totalKg > 0);
    }

    // Breakdown tipo "2×30kg + 1×24kg"
    let breakdown = '—';
    if (grouped.size) {
      breakdown = Array.from(grouped.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([cap, n]) => `${n}×${cap}kg`)
        .join(' + ');
    }

    if (legend) {
      if (!totalKg || !totalMachines) {
        legend.textContent = 'Introduce kilos para ver la maquinaria recomendada.';
      } else {
        const modeSel = document.getElementById('mach-mode');
        const capSel  = document.getElementById('mach-fixed-cap');
        const mode = modeSel ? modeSel.value : 'auto';

        const modeLabel =
          mode === 'fixed'
            ? `lavadoras de ${toNumber(capSel && capSel.value)} kg (base)`
            : 'combinación automática de capacidades (base)';

        const coberturaTexto =
          pct < 100
            ? 'Estás por debajo del 100% (no cubierto). Usa “Ajustar cobertura” o “Añadir lavadora”.'
            : (pct > 100
               ? 'Tienes margen por encima del 100%.'
               : 'Quedas exactamente al 100%.');

        legend.textContent =
          `Composición: ${breakdown}. Con ${hours} h de jornada, ` +
          `${totalMachines} lavadora${totalMachines !== 1 ? 's' : ''} y los ciclos/capacidades definidos, ` +
          `tienes un ${pct}% de cobertura sobre tus kilos diarios. ` +
          coberturaTexto;
      }
    }
  }

  // ====== Recalcular composición completa (base) ======
  function recomputeCompositionAndRender() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();

    const modeSel = document.getElementById('mach-mode');
    const capSel  = document.getElementById('mach-fixed-cap');
    const fixedWrapper = document.getElementById('mach-fixed-wrapper');

    if (!modeSel || !capSel || !fixedWrapper) return;

    const mode = modeSel.value || 'auto';
    fixedWrapper.style.display = mode === 'fixed' ? '' : 'none';

    let comp = [];
    if (totalKg > 0 && hours > 0) {
      if (mode === 'fixed') {
        const cap = toNumber(capSel.value) || 30;
        comp = computeFixedComposition(totalKg, hours, cap);
      } else {
        comp = computeAutoComposition(totalKg, hours);
      }
    }

    rebuildMachinesFromComposition(comp);
    renderMachineList();
    updateMachinerySummary();
  }

  // ====== Botón "Ajustar cobertura" ======
  function adjustCoverage() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();
    if (totalKg <= 0 || hours <= 0) {
      updateMachinerySummary();
      return;
    }

    let installed = currentMachines.reduce(
      (acc, m) => acc + capacityPerMachinePerDay(m, hours),
      0
    );

    if (installed >= totalKg) {
      updateMachinerySummary();
      return;
    }

    const remaining = totalKg - installed;

    const modeSel = document.getElementById('mach-mode');
    const capSel  = document.getElementById('mach-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    let addComp = [];
    if (mode === 'fixed') {
      const cap = toNumber(capSel && capSel.value) || 30;
      addComp = computeFixedComposition(remaining, hours, cap);
    } else {
      addComp = computeAutoComposition(remaining, hours);
    }

    addComp.forEach(item => {
      for (let i = 0; i < item.n; i++) {
        currentMachines.push({
          id: ++machineSeq,
          cap: item.cap,
          washMin: DEFAULT_WASH_MIN,
          name: ''
        });
      }
    });

    renderMachineList();
    updateMachinerySummary();
  }

  // ====== Botón "Añadir lavadora" manual (hasta 150%) ======
  function addMachineManual() {
    const totalKg = getTotalKgPerDay();
    const hours   = getHours();

    if (totalKg > 0 && hours > 0) {
      const installed = currentMachines.reduce(
        (acc, m) => acc + capacityPerMachinePerDay(m, hours),
        0
      );
      const coverage = installed / totalKg;
      if (coverage >= 1.5) {
        // Límite 150% de cobertura
        updateMachinerySummary();
        return;
      }
    }

    const modeSel = document.getElementById('mach-mode');
    const capSel  = document.getElementById('mach-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    let cap;
    if (mode === 'fixed') {
      cap = toNumber(capSel && capSel.value) || 30;
    } else {
      cap = 30; // valor neutro por defecto
    }

    currentMachines.push({
      id: ++machineSeq,
      cap,
      washMin: DEFAULT_WASH_MIN,
      name: ''
    });

    renderMachineList();
    updateMachinerySummary();
  }

  // ====== Botón "Calcular" (refresh base) ======
  function recalcBase() {
    recomputeCompositionAndRender();
  }

  // ====== Enganches a cambios de datos de ropa ======
  function hookDataChanges() {
    const inputs = document.querySelectorAll(
      '.cfg-grid[data-key] [data-field="units"], ' +
      '.cfg-grid[data-key] [data-field="kg"]'
    );
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        recomputeCompositionAndRender();
      });
    });

    const btnApply = document.getElementById('est-apply');
    const btnClear = document.getElementById('est-clear');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        setTimeout(recomputeCompositionAndRender, 0);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        setTimeout(recomputeCompositionAndRender, 0);
      });
    }
  }

  // ====== Boot ======
  window.addEventListener('DOMContentLoaded', () => {
    const hoursSel  = document.getElementById('mach-hours');
    const capSel    = document.getElementById('mach-fixed-cap');
    const modeSel   = document.getElementById('mach-mode');
    const adjustBtn = document.getElementById('mach-adjust');
    const addBtn    = document.getElementById('mach-add');
    const recalcBtn = document.getElementById('mach-recalc');

    // Horas (1..24)
    if (hoursSel && !hoursSel.options.length) {
      for (let h = 1; h <= 24; h++) {
        const opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = `${h} h`;
        if (h === DEFAULT_HOURS) opt.selected = true;
        hoursSel.appendChild(opt);
      }
    }

    // Capacidades base
    if (capSel && !capSel.options.length) {
      WASH_CAPACITIES.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = String(cap);
        opt.textContent = `${cap} kg`;
        if (cap === 30) opt.selected = true; // base 30 kg
        capSel.appendChild(opt);
      });
    }

    // Listeners de controles generales
    if (hoursSel)  hoursSel.addEventListener('change',  recomputeCompositionAndRender);
    if (capSel)    capSel.addEventListener('change',    recomputeCompositionAndRender);
    if (modeSel)   modeSel.addEventListener('change',   recomputeCompositionAndRender);
    if (adjustBtn) adjustBtn.addEventListener('click',  adjustCoverage);
    if (addBtn)    addBtn.addEventListener('click',     addMachineManual);
    if (recalcBtn) recalcBtn.addEventListener('click',  recalcBase);

    hookDataChanges();

    // Primer cálculo
    recomputeCompositionAndRender();
  });
})();
