(function () {
  const WASH_CAPACITIES = [8, 13, 18, 22, 24, 30, 40, 55, 110];
  const DEFAULT_HOURS = 8;

  const MIN_WASH_MIN = 30;
  const MAX_WASH_MIN = 90;
  const STEP_WASH_MIN = 5;
  const EXTRA_LOAD_UNLOAD = 5;
  const DEFAULT_WASH_MIN = 55;

  let machineSeq = 0;
  let currentMachines = [];

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

  function capacityPerMachinePerDay(machine, hours) {
    const washMin = machine.washMin || DEFAULT_WASH_MIN;
    const totalCycleMin = washMin + EXTRA_LOAD_UNLOAD;
    const cyclesPerDay = (hours * 60) / totalCycleMin;
    return machine.cap * cyclesPerDay;
  }

  function computeAutoComposition(kgPerDay, hours) {
    if (kgPerDay <= 0 || hours <= 0) return [];

    const sortedDesc = [...WASH_CAPACITIES].sort((a, b) => b - a);
    const sortedAsc = [...WASH_CAPACITIES].sort((a, b) => a - b);

    const capPerDay = cap => cap * hours;
    let remaining = kgPerDay;

    const comp = [];
    const totalsByCap = new Map();

    for (const cap of sortedDesc) {
      if (remaining <= 0) break;
      const perMachine = capPerDay(cap);
      const needed = Math.floor(remaining / perMachine);
      if (needed > 0) {
        totalsByCap.set(cap, (totalsByCap.get(cap) || 0) + needed);
        remaining -= needed * perMachine;
      }
    }

    if (remaining > 0) {
      let chosen = sortedAsc[sortedAsc.length - 1];
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
    const perMachine = cap * hours;
    const n = Math.max(1, Math.ceil(kgPerDay / perMachine));
    return [{ cap, n }];
  }

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
    wrapper.style.cssText = 'margin-top:14px; padding-top:14px; border-top:1px solid rgba(127,127,127,.25);';

    const defaultName = `Lavadora ${idx + 1}`;
    if (!m.name || /^Lavadora\s+\d+$/i.test(m.name.trim())) {
      m.name = defaultName;
    }

wrapper.innerHTML = `
  <div style="display:grid; grid-template-columns: 2.2fr 1fr 1.3fr; gap:10px; align-items:end;">
    <label>
      <span style="display:block; font-size:.9em; opacity:.8;">Equipo</span>
      <input class="field" type="text" data-id="${m.id}" value="${m.name}">
    </label>

    <label>
      Capacidad
      <select class="field" data-role="cap" data-id="${m.id}"></select>
    </label>

    <label>
      Duración de lavado
      <select class="field" data-role="cycle" data-id="${m.id}"></select>
    </label>

    <div style="grid-column:1 / -1; display:flex; align-items:center; gap:12px; margin-top:6px;">
      <div class="cfg-note">
        ≈ <span data-role="perday">0</span> kg/día · ciclo total: <span data-role="cyctime">0</span> min
      </div>

      <a href="#" data-role="remove" data-id="${m.id}" style="margin-left:auto; white-space:nowrap;">
        Quitar equipo
      </a>
    </div>
  </div>
`;


    const nameInput = wrapper.querySelector('input.field[data-id]');
    const selectCap = wrapper.querySelector('select[data-role="cap"]');
    const selectCycle = wrapper.querySelector('select[data-role="cycle"]');
    const perDaySpan = wrapper.querySelector('[data-role="perday"]');
    const cycSpan = wrapper.querySelector('[data-role="cyctime"]');
    const removeLink = wrapper.querySelector('a[data-role="remove"]');

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const val = nameInput.value.trim();
        m.name = val || defaultName;
      });
    }

    WASH_CAPACITIES.forEach(cap => {
      const opt = document.createElement('option');
      opt.value = String(cap);
      opt.textContent = `${cap} kg`;
      if (cap === m.cap) opt.selected = true;
      selectCap.appendChild(opt);
    });

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

    selectCap.addEventListener('change', () => {
      const cap = toNumber(selectCap.value);
      if (cap > 0) {
        m.cap = cap;
        refreshMachineInfo();
        updateMachinerySummary();
      }
    });

    selectCycle.addEventListener('change', () => {
      const val = toNumber(selectCycle.value);
      let wash = val || DEFAULT_WASH_MIN;
      if (wash < MIN_WASH_MIN) wash = MIN_WASH_MIN;
      if (wash > MAX_WASH_MIN) wash = MAX_WASH_MIN;
      m.washMin = wash;
      refreshMachineInfo();
      updateMachinerySummary();
    });

    if (removeLink) {
      removeLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentMachines = currentMachines.filter(x => x.id !== m.id);
        renderMachineList();
        updateMachinerySummary();
      });
    }

    refreshMachineInfo();
    listEl.appendChild(wrapper);
  });
}

  function updateMachinerySummary() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();

    const kgOut = document.getElementById('mach-kg-total');
    const machOut = document.getElementById('mach-machines-total');
    const capOut = document.getElementById('mach-cap-total');
    const covOut = document.getElementById('mach-cover-total');
    const legend = document.getElementById('mach-legend');

    let installedKgPerDay = 0;
    const grouped = new Map();

    currentMachines.forEach(m => {
      installedKgPerDay += capacityPerMachinePerDay(m, hours);
      grouped.set(m.cap, (grouped.get(m.cap) || 0) + 1);
    });

    const totalMachines = currentMachines.length;
    const coverage = totalKg > 0 ? installedKgPerDay / totalKg : 0;
    const pct = totalKg > 0 ? Math.round(coverage * 100) : 0;

    if (kgOut) kgOut.textContent = totalKg.toFixed(1).replace('.', ',');
    if (machOut) machOut.textContent = totalMachines;
    if (capOut) capOut.textContent = installedKgPerDay.toFixed(1).replace('.', ',');

    if (covOut) covOut.textContent = pct + '%';

    if (covOut) {
  covOut.classList.remove('is-under', 'is-over');
  if (totalKg > 0) covOut.classList.add(pct < 100 ? 'is-under' : 'is-over');
}
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
        const coberturaTexto =
          pct < 100
            ? 'Estás por debajo del 100%. Usa “Calcular” o “Añadir lavadora”.'
            : (pct > 100 ? 'Tienes margen por encima del 100%.' : 'Quedas exactamente al 100%.');

        legend.textContent =
          `Composición: ${breakdown}. Con ${hours} h de jornada, ` +
          `${totalMachines} lavadora${totalMachines !== 1 ? 's' : ''}, ` +
          `tienes un ${pct}% de cobertura sobre tus kilos diarios. ` +
          coberturaTexto;
      }
    }
  }

  function recomputeCompositionAndRender() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();

    const modeSel = document.getElementById('mach-mode');
    const capSel = document.getElementById('mach-fixed-cap');
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

  function adjustCoverage() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();
    if (totalKg <= 0 || hours <= 0) {
      updateMachinerySummary();
      return;
    }

    const machineCaps = currentMachines.map(m => ({
      id: m.id,
      ref: m,
      capDay: capacityPerMachinePerDay(m, hours)
    }));

    let installed = machineCaps.reduce((acc, x) => acc + x.capDay, 0);

    const modeSel = document.getElementById('mach-mode');
    const capSel = document.getElementById('mach-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    if (installed < totalKg) {
      const remaining = totalKg - installed;

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
      return;
    }

    if (installed > totalKg && currentMachines.length > 0) {
      machineCaps.sort((a, b) => a.capDay - b.capDay);

      const toRemove = new Set();

      for (const mc of machineCaps) {
        const newInstalled = installed - mc.capDay;
        if (newInstalled >= totalKg) {
          installed = newInstalled;
          toRemove.add(mc.id);
        }
      }

      if (toRemove.size > 0) {
        currentMachines = currentMachines.filter(m => !toRemove.has(m.id));
      }
    }

    renderMachineList();
    updateMachinerySummary();
  }

  function addMachineManual() {
    const totalKg = getTotalKgPerDay();
    const hours = getHours();

    if (totalKg > 0 && hours > 0) {
      const installed = currentMachines.reduce(
        (acc, m) => acc + capacityPerMachinePerDay(m, hours),
        0
      );
      const coverage = installed / totalKg;
      if (coverage >= 1.5) {
        updateMachinerySummary();
        return;
      }
    }

    const modeSel = document.getElementById('mach-mode');
    const capSel = document.getElementById('mach-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    let cap;
    if (mode === 'fixed') cap = toNumber(capSel && capSel.value) || 30;
    else cap = 30;

    currentMachines.push({
      id: ++machineSeq,
      cap,
      washMin: DEFAULT_WASH_MIN,
      name: ''
    });

    renderMachineList();
    updateMachinerySummary();
  }

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

  window.addEventListener('DOMContentLoaded', () => {
    const hoursSel = document.getElementById('mach-hours');
    const capSel = document.getElementById('mach-fixed-cap');
    const modeSel = document.getElementById('mach-mode');
    const adjustBtn = document.getElementById('mach-adjust');
    const addBtn = document.getElementById('mach-add');

    if (hoursSel && !hoursSel.options.length) {
      for (let h = 1; h <= 24; h++) {
        const opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = `${h} h`;
        if (h === DEFAULT_HOURS) opt.selected = true;
        hoursSel.appendChild(opt);
      }
    }

    if (capSel && !capSel.options.length) {
      WASH_CAPACITIES.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = String(cap);
        opt.textContent = `${cap} kg`;
        if (cap === 30) opt.selected = true;
        capSel.appendChild(opt);
      });
    }

    if (hoursSel) hoursSel.addEventListener('change', recomputeCompositionAndRender);
    if (capSel) capSel.addEventListener('change', recomputeCompositionAndRender);
    if (modeSel) modeSel.addEventListener('change', recomputeCompositionAndRender);
    if (adjustBtn) adjustBtn.addEventListener('click', adjustCoverage);
    if (addBtn) addBtn.addEventListener('click', addMachineManual);

    hookDataChanges();
    recomputeCompositionAndRender();
  });
})();
