(function () {
  const WASH_CAPACITIES = [8, 13, 18, 22, 24, 30, 40, 55, 110];
  const DRY_CAPACITIES = [...WASH_CAPACITIES];
  const DEFAULT_HOURS = 8;

  const MIN_WASH_MIN = 30;
  const MAX_WASH_MIN = 90;
  const STEP_WASH_MIN = 5;
  const EXTRA_LOAD_UNLOAD = 5;
  const DEFAULT_WASH_MIN = 55;

  const MIN_DRY_MIN = 20;
  const MAX_DRY_MIN = 70;
  const STEP_DRY_MIN = 5;
  const DEFAULT_DRY_MIN = 45;

  let machineSeq = 0;
  let currentMachines = [];
  let drySeq = 0;
  let currentDryers = [];

  function toNumber(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function getTotalKgPerDay() {
    const el = document.getElementById('total-kg');
    return el ? toNumber(el.value) : 0;
  }

  function getDryKgPerDay() {
    const el = document.getElementById('total-kg-rizo');
    return el ? toNumber(el.value) : 0;
  }

  function getHours() {
    const el = document.getElementById('work-hours');
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

  function capacityPerDryerPerDay(machine, hours) {
    const dryMin = machine.dryMin || DEFAULT_DRY_MIN;
    const totalCycleMin = dryMin + EXTRA_LOAD_UNLOAD;
    const cyclesPerDay = (hours * 60) / totalCycleMin;
    return machine.cap * cyclesPerDay;
  }

  function computeAutoComposition(kgPerDay, hours, capacities) {
    if (kgPerDay <= 0 || hours <= 0) return [];

    const sortedDesc = [...capacities].sort((a, b) => b - a);
    const sortedAsc = [...capacities].sort((a, b) => a - b);

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

  function rebuildDryersFromComposition(comp) {
    currentDryers = [];
    comp.forEach(item => {
      for (let i = 0; i < item.n; i++) {
        currentDryers.push({
          id: ++drySeq,
          cap: item.cap,
          dryMin: DEFAULT_DRY_MIN,
          name: ''
        });
      }
    });
  }

  function renderDryerList() {
  const listEl = document.getElementById('dry-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!currentDryers.length) {
    const p = document.createElement('p');
    p.className = 'mach-empty';
    p.textContent = 'Sin secadoras calculadas. Introduce kilos y jornada para ver una propuesta.';
    listEl.appendChild(p);
    return;
  }

  const hours = getHours();

  currentDryers.forEach((m, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mach-item';
    wrapper.style.cssText = 'margin-top:14px; padding-top:14px; border-top:1px solid rgba(127,127,127,.25);';

    const defaultName = `Secadora ${idx + 1}`;
    if (!m.name || /^Secadora\\s+\\d+$/i.test(m.name.trim())) {
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
      Duración de secado
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

    DRY_CAPACITIES.forEach(cap => {
      const opt = document.createElement('option');
      opt.value = String(cap);
      opt.textContent = `${cap} kg`;
      if (cap === m.cap) opt.selected = true;
      selectCap.appendChild(opt);
    });

    for (let t = MIN_DRY_MIN; t <= MAX_DRY_MIN; t += STEP_DRY_MIN) {
      const opt = document.createElement('option');
      opt.value = String(t);
      const total = t + EXTRA_LOAD_UNLOAD;
      opt.textContent = `${t} + 5 min (total ${total})`;
      if (t === (m.dryMin || DEFAULT_DRY_MIN)) opt.selected = true;
      selectCycle.appendChild(opt);
    }

    function refreshMachineInfo() {
      const capDay = capacityPerDryerPerDay(m, hours);
      if (perDaySpan) perDaySpan.textContent = capDay.toFixed(1).replace('.', ',');
      const totalCycle = (m.dryMin || DEFAULT_DRY_MIN) + EXTRA_LOAD_UNLOAD;
      if (cycSpan) cycSpan.textContent = totalCycle;
    }

    selectCap.addEventListener('change', () => {
      const cap = toNumber(selectCap.value);
      if (cap > 0) {
        m.cap = cap;
        refreshMachineInfo();
        updateDrySummary();
      }
    });

    selectCycle.addEventListener('change', () => {
      const val = toNumber(selectCycle.value);
      let dry = val || DEFAULT_DRY_MIN;
      if (dry < MIN_DRY_MIN) dry = MIN_DRY_MIN;
      if (dry > MAX_DRY_MIN) dry = MAX_DRY_MIN;
      m.dryMin = dry;
      refreshMachineInfo();
      updateDrySummary();
    });

    if (removeLink) {
      removeLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentDryers = currentDryers.filter(x => x.id !== m.id);
        renderDryerList();
        updateDrySummary();
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
            ? 'Estás por debajo del 100%. Usa “Actualizar” o “Añadir lavadora”.'
            : (pct > 100 ? 'Tienes margen por encima del 100%.' : 'Quedas exactamente al 100%.');

        legend.textContent =
          `Composición: ${breakdown}. Con ${hours} h de jornada, ` +
          `${totalMachines} lavadora${totalMachines !== 1 ? 's' : ''}, ` +
          `tienes un ${pct}% de cobertura sobre tus kilos diarios. ` +
          coberturaTexto;
      }
    }
  }

  function updateDrySummary() {
    const totalKg = getDryKgPerDay();
    const hours = getHours();

    const kgOut = document.getElementById('dry-kg-total');
    const machOut = document.getElementById('dry-machines-total');
    const capOut = document.getElementById('dry-cap-total');
    const covOut = document.getElementById('dry-cover-total');
    const legend = document.getElementById('dry-legend');

    let installedKgPerDay = 0;
    const grouped = new Map();

    currentDryers.forEach(m => {
      installedKgPerDay += capacityPerDryerPerDay(m, hours);
      grouped.set(m.cap, (grouped.get(m.cap) || 0) + 1);
    });

    const totalMachines = currentDryers.length;
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

    let breakdown = '-';
    if (grouped.size) {
      breakdown = Array.from(grouped.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([cap, n]) => `${n}x${cap}kg`)
        .join(' + ');
    }

    if (legend) {
      if (!totalKg || !totalMachines) {
        legend.textContent = 'Introduce kilos de rizo para ver la maquinaria recomendada.';
      } else {
        const coberturaTexto =
          pct < 100
            ? 'Estás por debajo del 100%. Usa “Actualizar” o “Añadir secadora”.'
            : (pct > 100 ? 'Tienes margen por encima del 100%.' : 'Quedas exactamente al 100%.');

        legend.textContent =
          `Composición: ${breakdown}. Con ${hours} h de jornada, ` +
          `${totalMachines} secadora${totalMachines !== 1 ? 's' : ''}, ` +
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
        comp = computeAutoComposition(totalKg, hours, WASH_CAPACITIES);
      }
    }

    rebuildMachinesFromComposition(comp);
    renderMachineList();
    updateMachinerySummary();
  }

  function recomputeDryCompositionAndRender() {
    const totalKg = getDryKgPerDay();
    const hours = getHours();

    const modeSel = document.getElementById('dry-mode');
    const capSel = document.getElementById('dry-fixed-cap');
    const fixedWrapper = document.getElementById('dry-fixed-wrapper');

    if (!modeSel || !capSel || !fixedWrapper) return;

    const mode = modeSel.value || 'auto';
    fixedWrapper.style.display = mode === 'fixed' ? '' : 'none';

    let comp = [];
    if (totalKg > 0 && hours > 0) {
      if (mode === 'fixed') {
        const cap = toNumber(capSel.value) || 30;
        comp = computeFixedComposition(totalKg, hours, cap);
      } else {
        comp = computeAutoComposition(totalKg, hours, DRY_CAPACITIES);
      }
    }

    rebuildDryersFromComposition(comp);
    renderDryerList();
    updateDrySummary();
  }

  function recomputeAll() {
    recomputeCompositionAndRender();
    recomputeDryCompositionAndRender();
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
        addComp = computeAutoComposition(remaining, hours, WASH_CAPACITIES);
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

  function adjustDryCoverage() {
    const totalKg = getDryKgPerDay();
    const hours = getHours();
    if (totalKg <= 0 || hours <= 0) {
      updateDrySummary();
      return;
    }

    const machineCaps = currentDryers.map(m => ({
      id: m.id,
      ref: m,
      capDay: capacityPerDryerPerDay(m, hours)
    }));

    let installed = machineCaps.reduce((acc, x) => acc + x.capDay, 0);

    const modeSel = document.getElementById('dry-mode');
    const capSel = document.getElementById('dry-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    if (installed < totalKg) {
      const remaining = totalKg - installed;

      let addComp = [];
      if (mode === 'fixed') {
        const cap = toNumber(capSel && capSel.value) || 30;
        addComp = computeFixedComposition(remaining, hours, cap);
      } else {
        addComp = computeAutoComposition(remaining, hours, DRY_CAPACITIES);
      }

      addComp.forEach(item => {
        for (let i = 0; i < item.n; i++) {
          currentDryers.push({
            id: ++drySeq,
            cap: item.cap,
            dryMin: DEFAULT_DRY_MIN,
            name: ''
          });
        }
      });

      renderDryerList();
      updateDrySummary();
      return;
    }

    if (installed > totalKg && currentDryers.length > 0) {
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
        currentDryers = currentDryers.filter(m => !toRemove.has(m.id));
      }
    }

    renderDryerList();
    updateDrySummary();
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

  function addDryerManual() {
    const totalKg = getDryKgPerDay();
    const hours = getHours();

    if (totalKg > 0 && hours > 0) {
      const installed = currentDryers.reduce(
        (acc, m) => acc + capacityPerDryerPerDay(m, hours),
        0
      );
      const coverage = installed / totalKg;
      if (coverage >= 1.5) {
        updateDrySummary();
        return;
      }
    }

    const modeSel = document.getElementById('dry-mode');
    const capSel = document.getElementById('dry-fixed-cap');
    const mode = modeSel ? modeSel.value : 'auto';

    let cap;
    if (mode === 'fixed') cap = toNumber(capSel && capSel.value) || 30;
    else cap = 30;

    currentDryers.push({
      id: ++drySeq,
      cap,
      dryMin: DEFAULT_DRY_MIN,
      name: ''
    });

    renderDryerList();
    updateDrySummary();
  }

  function hookDataChanges() {
    const inputs = document.querySelectorAll(
      '.cfg-grid[data-key] [data-field="units"], ' +
      '.cfg-grid[data-key] [data-field="kg"]'
    );
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        recomputeAll();
      });
    });

    const btnApply = document.getElementById('est-apply');
    const btnClear = document.getElementById('est-clear');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        setTimeout(recomputeAll, 0);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        setTimeout(recomputeAll, 0);
      });
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const hoursSel = document.getElementById('work-hours');
    const capSel = document.getElementById('mach-fixed-cap');
    const modeSel = document.getElementById('mach-mode');
    const adjustBtn = document.getElementById('mach-adjust');
    const addBtn = document.getElementById('mach-add');
    const dryCapSel = document.getElementById('dry-fixed-cap');
    const dryModeSel = document.getElementById('dry-mode');
    const dryAdjustBtn = document.getElementById('dry-adjust');
    const dryAddBtn = document.getElementById('dry-add');

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

    if (dryCapSel && !dryCapSel.options.length) {
      DRY_CAPACITIES.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = String(cap);
        opt.textContent = `${cap} kg`;
        if (cap === 30) opt.selected = true;
        dryCapSel.appendChild(opt);
      });
    }

    if (hoursSel) hoursSel.addEventListener('change', recomputeAll);
    if (capSel) capSel.addEventListener('change', recomputeAll);
    if (modeSel) modeSel.addEventListener('change', recomputeAll);
    if (dryCapSel) dryCapSel.addEventListener('change', recomputeAll);
    if (dryModeSel) dryModeSel.addEventListener('change', recomputeAll);
    if (adjustBtn) adjustBtn.addEventListener('click', adjustCoverage);
    if (addBtn) addBtn.addEventListener('click', addMachineManual);
    if (dryAdjustBtn) dryAdjustBtn.addEventListener('click', adjustDryCoverage);
    if (dryAddBtn) dryAddBtn.addEventListener('click', addDryerManual);

    hookDataChanges();
    recomputeAll();
  });
})();
