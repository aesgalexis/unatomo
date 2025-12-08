// calc_maquinaria.js
// Recomendación de lavadoras a partir de los kg totales y la jornada.

(function () {
  // Capacidades disponibles (kg)
  const WASH_CAPACITIES = [8, 13, 18, 22, 24, 30, 40, 55, 110];

  // Jornada por defecto
  const DEFAULT_HOURS = 8;

  // Conversor numérico seguro (coma o punto)
  function toNumber(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  // Kg totales/día (ya calculados por configurador.js)
  function getTotalKgPerDay() {
    const el = document.getElementById('total-kg');
    return el ? toNumber(el.value) : 0;
  }

  // Cálculo AUTO: mínimo nº de lavadoras usando combinación de capacidades,
  // priorizando máquinas grandes (greedy).
  function computeAutoMachines(kgPerDay, hours) {
    if (kgPerDay <= 0 || hours <= 0) {
      return {
        totalMachines: 0,
        installedKgPerDay: 0,
        coverage: 0,
        breakdown: '—'
      };
    }

    const sortedDesc = [...WASH_CAPACITIES].sort((a, b) => b - a);
    const sortedAsc  = [...WASH_CAPACITIES].sort((a, b) => a - b);

    let remaining = kgPerDay;
    const machines = [];

    const capPerDay = cap => cap * hours; // 1 ciclo/hora, carga al 100%

    // Greedy: primero las grandes
    for (const cap of sortedDesc) {
      if (remaining <= 0) break;
      const perMachine = capPerDay(cap);
      const needed = Math.floor(remaining / perMachine);
      if (needed > 0) {
        machines.push({ cap, n: needed });
        remaining -= needed * perMachine;
      }
    }

    // Si aún queda algo, añadimos una máquina adicional (la más pequeña que cubra lo que falta)
    if (remaining > 0) {
      let chosen = sortedAsc[sortedAsc.length - 1]; // por defecto la más grande
      for (const cap of sortedAsc) {
        if (capPerDay(cap) >= remaining) {
          chosen = cap;
          break;
        }
      }
      machines.push({ cap: chosen, n: 1 });
      remaining = 0;
    }

    const totalMachines = machines.reduce((acc, m) => acc + m.n, 0);
    const installedKgPerDay = machines.reduce(
      (acc, m) => acc + m.n * capPerDay(m.cap),
      0
    );
    const coverage = kgPerDay > 0 ? installedKgPerDay / kgPerDay : 0;

    const breakdown = machines.length
      ? machines.map(m => `${m.n}×${m.cap}kg`).join(' + ')
      : '—';

    return {
      totalMachines,
      installedKgPerDay,
      coverage,
      breakdown
    };
  }

  // Cálculo FIXED: todas las lavadoras de la misma capacidad
  function computeFixedMachines(kgPerDay, hours, cap) {
    if (kgPerDay <= 0 || hours <= 0 || cap <= 0) {
      return {
        totalMachines: 0,
        installedKgPerDay: 0,
        coverage: 0,
        breakdown: '—'
      };
    }

    const perMachine = cap * hours; // kg/día por máquina
    const totalMachines = Math.ceil(kgPerDay / perMachine);
    const installedKgPerDay = totalMachines * perMachine;
    const coverage = kgPerDay > 0 ? installedKgPerDay / kgPerDay : 0;

    const breakdown = totalMachines
      ? `${totalMachines}×${cap}kg`
      : '—';

    return {
      totalMachines,
      installedKgPerDay,
      coverage,
      breakdown
    };
  }

  // Refresca el bloque de maquinaria
  function recomputeMachinery() {
    const totalKg = getTotalKgPerDay();

    const hoursSel = document.getElementById('mach-hours');
    const modeSel  = document.getElementById('mach-mode');
    const capSel   = document.getElementById('mach-fixed-cap');
    const fixedWrapper = document.getElementById('mach-fixed-wrapper');

    if (!hoursSel || !modeSel || !capSel || !fixedWrapper) return;

    // Horas dentro de [1,24]
    let hours = toNumber(hoursSel.value) || DEFAULT_HOURS;
    hours = Math.min(24, Math.max(1, hours));
    hoursSel.value = String(hours);

    const mode = modeSel.value || 'auto';

    // Mostrar/ocultar selector de capacidad fija
    fixedWrapper.style.display = mode === 'fixed' ? '' : 'none';

    let result;
    if (mode === 'fixed') {
      const cap = toNumber(capSel.value) || WASH_CAPACITIES[WASH_CAPACITIES.length - 1];
      result = computeFixedMachines(totalKg, hours, cap);
    } else {
      result = computeAutoMachines(totalKg, hours);
    }

    // Salidas
    const kgOut   = document.getElementById('mach-kg-total');
    const machOut = document.getElementById('mach-machines-total');
    const capOut  = document.getElementById('mach-cap-total');
    const covOut  = document.getElementById('mach-cover-total');
    const legend  = document.getElementById('mach-legend');

    if (kgOut)   kgOut.textContent   = totalKg.toFixed(1).replace('.', ',');
    if (machOut) machOut.textContent = result.totalMachines;
    if (capOut)  capOut.textContent  = result.installedKgPerDay.toFixed(1).replace('.', ',');

    if (covOut) {
      const pct = totalKg > 0 ? Math.round(result.coverage * 100) : 0;
      covOut.textContent = pct + '%';

      covOut.classList.toggle('is-under', pct < 100 && totalKg > 0);
      covOut.classList.toggle('is-over',  pct >= 100 && totalKg > 0);
    }

    if (legend) {
      if (!totalKg || !result.totalMachines) {
        legend.textContent = 'Introduce kilos para ver la maquinaria recomendada.';
      } else {
        const pct  = totalKg > 0 ? Math.round(result.coverage * 100) : 0;
        const modeLabel =
          mode === 'fixed'
            ? `lavadoras de ${toNumber(capSel.value)} kg`
            : `combinación automática de capacidades (mínimo nº de lavadoras)`;

        const coberturaTexto =
          pct < 100
            ? 'Estás por debajo del 100% (no cubierto).'
            : (pct > 100
               ? 'Tienes margen por encima del 100%.'
               : 'Quedas exactamente al 100%.');

        legend.textContent =
          `Con ${hours} h de jornada y ${modeLabel} ` +
          `necesitas ${result.totalMachines} lavadora` +
          (result.totalMachines !== 1 ? 's' : '') +
          ` y quedas al ${pct}% de cobertura sobre tus kilos diarios. ` +
          coberturaTexto;
      }
    }
  }

  // Enganchar cambios en los datos de ropa (inputs y estimador)
  function hookDataChanges() {
    // Cualquier cambio manual en unidades o kg dispara recálculo
    const inputs = document.querySelectorAll(
      '.cfg-grid[data-key] [data-field="units"], ' +
      '.cfg-grid[data-key] [data-field="kg"]'
    );
    inputs.forEach(input => {
      input.addEventListener('input', recomputeMachinery);
    });

    // Cuando se aplica o limpia el estimador, recalculamos después
    const btnApply = document.getElementById('est-apply');
    const btnClear = document.getElementById('est-clear');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        // Espera a que configurador.js actualice los valores
        setTimeout(recomputeMachinery, 0);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        setTimeout(recomputeMachinery, 0);
      });
    }
  }

  // Inicialización
  window.addEventListener('DOMContentLoaded', () => {
    const hoursSel = document.getElementById('mach-hours');
    const capSel   = document.getElementById('mach-fixed-cap');
    const modeSel  = document.getElementById('mach-mode');

    // Rellenar selector de horas (1..24)
    if (hoursSel && !hoursSel.options.length) {
      for (let h = 1; h <= 24; h++) {
        const opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = `${h} h`;
        if (h === DEFAULT_HOURS) opt.selected = true;
        hoursSel.appendChild(opt);
      }
    }

    // Rellenar capacidades disponibles
    if (capSel && !capSel.options.length) {
      WASH_CAPACITIES.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = String(cap);
        opt.textContent = `${cap} kg`;
        if (cap === 30) opt.selected = true; // por defecto 30 kg
        capSel.appendChild(opt);
      });
    }

    // Listeners de controles
    if (hoursSel) hoursSel.addEventListener('change', recomputeMachinery);
    if (capSel)   capSel.addEventListener('change',  recomputeMachinery);
    if (modeSel)  modeSel.addEventListener('change', recomputeMachinery);

    // Enganchar cambios en la tabla de ropa
    hookDataChanges();

    // Primer cálculo
    recomputeMachinery();
  });
})();

