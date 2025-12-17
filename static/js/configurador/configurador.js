(function () {
  const DEFAULT_WEIGHTS = {
    sabanas_s: 0.50,
    sabanas_m: 0.70,
    sabanas_l: 0.90,
    nordico_s: 1.50,
    nordico_m: 2.00,
    nordico_l: 2.50,
    fundas_std: 0.20,
    toalla_alfombrin: 0.60,
    toalla_manos: 0.25,
    toalla_bano: 0.50,
    toalla_piscina: 0.70,
    albornoz: 1.20,
    mantel: 0.40,
    servilleta: 0.05
  };

  const CATEGORIES = {
    cama: ["sabanas_s", "sabanas_m", "sabanas_l", "nordico_s", "nordico_m", "nordico_l", "fundas_std"],
    rizo: ["toalla_alfombrin", "toalla_manos", "toalla_bano", "toalla_piscina", "albornoz"],
    mant: ["mantel", "servilleta"]
  };

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

  const state = {
    weights: { ...DEFAULT_WEIGHTS },
    rows: {},
    customSeq: 0
  };

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function parseNum(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function markInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle("is-invalid", !!invalid);
  }

  function initRows() {
    qsa(".cfg-grid[data-key]").forEach((row) => {
      const key = row.getAttribute("data-key");
      const units = row.querySelector('[data-field="units"]');
      const kg = row.querySelector('[data-field="kg"]');
      const ppu = row.querySelector('[data-field="ppu"]');

      if (ppu) ppu.value = (state.weights[key] ?? 0).toFixed(2);

      state.rows[key] = { row, units, kg, ppu };

      if (units) units.value = "";
      if (kg) kg.value = "";

      if (units) units.addEventListener("input", () => onUnitsChange(key));
      if (kg) kg.addEventListener("input", () => onKgChange(key));
      if (ppu) ppu.addEventListener("input", () => onPpuChange(key));
    });

    updateTotals();
  }

  function onUnitsChange(key) {
    const { units, kg, ppu } = state.rows[key];
    const w = parseNum(ppu?.value) || state.weights[key] || 0;
    const u = parseNum(units?.value);

    if (ppu && ppu.closest("#fam-otros") && !(w > 0)) {
      markInvalid(ppu, true);
      if (kg) kg.value = "";
      updateTotals();
      return;
    } else if (ppu && ppu.closest("#fam-otros")) {
      markInvalid(ppu, false);
    }

    const k = w * u;

    if (kg) {
      if (u > 0) kg.value = k.toFixed(2);
      else kg.value = "";
    }
    updateTotals();
  }

  function onKgChange(key) {
    const { units, kg, ppu } = state.rows[key];
    const w = parseNum(ppu?.value) || state.weights[key] || 0;
    const k = parseNum(kg?.value);

    if (ppu && ppu.closest("#fam-otros") && !(w > 0)) {
      markInvalid(ppu, true);
      if (units) units.value = "";
      updateTotals();
      return;
    } else if (ppu && ppu.closest("#fam-otros")) {
      markInvalid(ppu, false);
    }

    const u = w ? k / w : 0;

    if (units) {
      if (k > 0 && w > 0) units.value = Math.round(u);
      else units.value = "";
    }
    updateTotals();
  }

  function onPpuChange(key) {
    const { units, kg, ppu } = state.rows[key];
    const newW = parseNum(ppu?.value);

    if (newW > 0) state.weights[key] = newW;

    if (ppu && ppu.closest("#fam-otros")) {
      markInvalid(ppu, !(newW > 0));
    }

    const k = parseNum(kg?.value);
    const u = parseNum(units?.value);
    if (k) onKgChange(key);
    else if (u) onUnitsChange(key);
    else updateTotals();
  }

  function updateTotals() {
    let totalKg = 0;
    let totalUnits = 0;

    Object.keys(state.rows).forEach((key) => {
      const { units, kg } = state.rows[key];
      totalUnits += parseNum(units?.value);
      totalKg += parseNum(kg?.value);
    });

    const tU = document.getElementById("total-units");
    const tK = document.getElementById("total-kg");
    if (tU) tU.value = Math.round(totalUnits).toString();
    if (tK) tK.value = totalKg.toFixed(2);

    const sumKg = (keys) => keys.reduce((acc, k) => acc + parseNum(state.rows[k]?.kg?.value), 0);
    const kgCama = sumKg(CATEGORIES.cama);
    const kgRizo = sumKg(CATEGORIES.rizo);
    const kgMant = sumKg(CATEGORIES.mant);

    const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0) + "%";
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText("pct-cama-kg", pct(kgCama, totalKg));
    setText("pct-rizo-kg", pct(kgRizo, totalKg));
    setText("pct-mant-kg", pct(kgMant, totalKg));
  }

  function setUnitsForKey(key, units) {
    const row = state.rows[key];
    if (!row) return;
    if (row.units) {
      if (units > 0) row.units.value = Math.round(units);
      else row.units.value = "";
    }
    onUnitsChange(key);
  }

  function clearAllRows() {
    Object.values(state.rows).forEach(({ units, kg, ppu }) => {
      if (units) units.value = "";
      if (kg) kg.value = "";
      if (ppu && ppu.closest("#fam-otros")) markInvalid(ppu, false);
    });

    ["est-simples", "est-dobles", "est-suites", "est-cubiertos"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    ["est-factor-s", "est-factor-d", "est-factor-u", "est-factor-cub"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "1";
    });

    updateTotals();
  }

  function getFactor(id) {
    const v = parseNum(document.getElementById(id)?.value);
    return Math.max(0, v || 1);
  }

  function applyEstimator() {
    const s = parseNum(document.getElementById("est-simples")?.value);
    const d = parseNum(document.getElementById("est-dobles")?.value);
    const u = parseNum(document.getElementById("est-suites")?.value);
    const cubiertos = parseNum(document.getElementById("est-cubiertos")?.value);

    const fS = getFactor("est-factor-s");
    const fD = getFactor("est-factor-d");
    const fU = getFactor("est-factor-u");
    const fC = getFactor("est-factor-cub");

    const totalsByKey = {};
    Object.keys(state.rows).forEach((k) => (totalsByKey[k] = 0));

    const addForRooms = (count, roomDef, factor) => {
      if (count <= 0 || factor <= 0) return;
      Object.entries(roomDef).forEach(([key, perRoom]) => {
        if (totalsByKey[key] !== undefined) totalsByKey[key] += perRoom * count * factor;
      });
    };

    addForRooms(s, ROOM_MATRIX.simple, fS);
    addForRooms(d, ROOM_MATRIX.doble, fD);
    addForRooms(u, ROOM_MATRIX.suite, fU);

    if (cubiertos > 0 && fC > 0) {
      totalsByKey.servilleta += cubiertos * fC;
      totalsByKey.mantel += Math.ceil(cubiertos / 4) * fC;
    }

    Object.entries(totalsByKey).forEach(([key, units]) => setUnitsForKey(key, units));
    updateTotals();
  }

  function addCustomItem(prefillName = "", prefillPPU = 0) {
    const host = document.getElementById("otros-rows");
    if (!host) return;

    const key = "custom_" + ++state.customSeq;

    const row = document.createElement("div");
    row.className = "cfg-grid";
    row.setAttribute("data-key", key);
    row.style.cssText =
      "display:grid; grid-template-columns: 2.2fr .9fr .9fr .9fr; gap:10px; align-items:center; margin-top:8px;";

    row.innerHTML = `
      <div class="item-name">
        <input class="field" type="text" data-field="name" placeholder="Nombre del artículo" value="${prefillName}">
      </div>
      <input class="field col-un" type="number" min="0" step="1" inputmode="numeric" placeholder="0" data-field="units">
      <input class="field" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" data-field="kg">
      <input class="field" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" data-field="ppu">
    `;

    host.appendChild(row);

    const units = row.querySelector('[data-field="units"]');
    const kg = row.querySelector('[data-field="kg"]');
    const ppu = row.querySelector('[data-field="ppu"]');
    const name = row.querySelector('[data-field="name"]');

    ppu.value = prefillPPU > 0 ? Number(prefillPPU).toFixed(2) : "";
    markInvalid(ppu, !(parseNum(ppu.value) > 0));

    if (name) markInvalid(name, name.value.trim() === "");

    state.rows[key] = { row, units, kg, ppu, name };

    if (name) {
      const validateName = () => markInvalid(name, name.value.trim() === "");
      name.addEventListener("input", validateName);
      name.addEventListener("blur", validateName);
    }

    if (ppu) {
      ppu.addEventListener("input", () => {
        const v = parseNum(ppu.value);
        markInvalid(ppu, !(v > 0));
        const k = parseNum(kg?.value);
        const u = parseNum(units?.value);
        if (k) onKgChange(key);
        else if (u) onUnitsChange(key);
        else updateTotals();
      });
    }

    if (units) units.addEventListener("input", () => onUnitsChange(key));
    if (kg) kg.addEventListener("input", () => onKgChange(key));

    updateTotals();
  }

  window.addEventListener("DOMContentLoaded", () => {
    initRows();

    const btnApply = document.getElementById("est-apply");
    const btnClear = document.getElementById("est-clear");
    const btnAddOther = document.getElementById("otros-add");

    if (btnApply) btnApply.addEventListener("click", applyEstimator);
    if (btnClear) btnClear.addEventListener("click", clearAllRows);
    if (btnAddOther) btnAddOther.addEventListener("click", () => addCustomItem());
  });
})();
