const COIN_BOX_PRICE = 900;
const MACHINE_DISCOUNT = 0.10;

const i18n = {
  es: {
    eyebrow: "Simulador en tiempo real",
    title: "Lavandería autoservicio",
    intro: "Ajusta local, máquinas, horarios, precios y costes para estimar inversión, facturación, beneficio mensual y retorno.",
    scenarioLabel: "Escenario",
    investment: "Inversión inicial",
    monthlyRevenue: "Facturación mensual",
    monthlyProfit: "Beneficio mensual",
    payback: "Retorno estimado",
    projectControls: "Proyecto",
    costSettings: "Gastos",
    reset: "Reiniciar",
    presetSmall: "Pequeño",
    presetBalanced: "Medio",
    presetHigh: "Alto tráfico",
    storeSize: "Tamaño del local",
    openHours: "Horas abierto al día",
    openDays: "Días abierto al mes",
    washDemand: "Clientes que lavan",
    dryDemand: "Clientes que secan",
    electricity: "Electricidad EUR/kWh",
    gas: "Gas EUR/kWh",
    water: "Agua EUR/m3",
    chemical: "Químico EUR/lavado",
    rent: "Alquiler mensual",
    fixedCosts: "Otros gastos fijos",
    fitout: "Adecuación EUR/m2",
    machines: "Máquinas",
    results: "Resultados",
    washerRevenue: "Ingresos lavado",
    dryerRevenue: "Ingresos secado",
    variableCosts: "Costes variables",
    monthlyFixedCosts: "Costes fijos",
    netProfit: "Resultado mensual",
    revenue: "Ingresos",
    costs: "Costes",
    washOccupancy: "Ocupación lavado",
    dryOccupancy: "Ocupación secado",
    dailyWashes: "Coladas/día",
    dailyDries: "Secados/día",
    washCapacity: "Capacidad lavado/día",
    dryCapacity: "Capacidad secado/día",
    breakEven: "Punto de equilibrio",
    averageTicket: "Ticket medio estimado",
    spaceUse: "Espacio estimado",
    units: "Unidades",
    price: "Precio ciclo",
    minutes: "Min/ciclo",
    balanced: "Equilibrado",
    saturated: "Saturado",
    overbuilt: "Sobredimensionado",
    losing: "En pérdidas",
    tightSpace: "Local justo",
    balancedNote: "Capacidad suficiente para la demanda actual.",
    saturatedNote: "La demanda supera la capacidad diaria calculada por máquinas, horas abiertas y duración de ciclo.",
    overbuiltNote: "Hay mucha capacidad libre. Revisa inversión o demanda.",
    losingNote: "El beneficio mensual es negativo con estos valores.",
    tightSpaceNote: "La configuración supera el tamaño del local. Sube m2 o reduce máquinas.",
    months: "meses",
    noPayback: "Sin retorno",
    clientsDay: "clientes/día",
    washerSmall: "Lavadora 10 kg",
    washerMedium: "Lavadora 14 kg",
    washerLarge: "Lavadora 20 kg",
    dryer: "Secadora 18 kg",
    washType: "lavado",
    dryType: "secado",
    extraType: "extra",
    spaceLimitTooltip: "No cabe en el local actual. Aumenta los m2 o reduce otras máquinas."
  },
  en: {
    eyebrow: "Real-time simulator",
    title: "Self-service laundry",
    intro: "Adjust store size, machines, opening hours, prices and costs to estimate investment, revenue, monthly profit and payback.",
    scenarioLabel: "Scenario",
    investment: "Initial investment",
    monthlyRevenue: "Monthly revenue",
    monthlyProfit: "Monthly profit",
    payback: "Estimated payback",
    projectControls: "Project",
    costSettings: "Costs",
    reset: "Reset",
    presetSmall: "Small",
    presetBalanced: "Medium",
    presetHigh: "High traffic",
    storeSize: "Store size",
    openHours: "Open hours per day",
    openDays: "Open days per month",
    washDemand: "Customers washing",
    dryDemand: "Customers drying",
    electricity: "Electricity EUR/kWh",
    gas: "Gas EUR/kWh",
    water: "Water EUR/m3",
    chemical: "Chemical EUR/wash",
    rent: "Monthly rent",
    fixedCosts: "Other fixed costs",
    fitout: "Fit-out EUR/m2",
    machines: "Machines",
    results: "Results",
    washerRevenue: "Washer revenue",
    dryerRevenue: "Dryer revenue",
    variableCosts: "Variable costs",
    monthlyFixedCosts: "Fixed costs",
    netProfit: "Monthly result",
    revenue: "Revenue",
    costs: "Costs",
    washOccupancy: "Wash occupancy",
    dryOccupancy: "Dry occupancy",
    dailyWashes: "Washes/day",
    dailyDries: "Dry cycles/day",
    washCapacity: "Wash capacity/day",
    dryCapacity: "Dry capacity/day",
    breakEven: "Break-even",
    averageTicket: "Estimated average ticket",
    spaceUse: "Estimated space",
    units: "Units",
    price: "Cycle price",
    minutes: "Min/cycle",
    balanced: "Balanced",
    saturated: "Saturated",
    overbuilt: "Overbuilt",
    losing: "Losing money",
    tightSpace: "Tight space",
    balancedNote: "Current capacity can handle the estimated demand.",
    saturatedNote: "Demand exceeds daily capacity calculated from machines, opening hours and cycle duration.",
    overbuiltNote: "There is too much idle capacity. Review investment or demand.",
    losingNote: "Monthly profit is negative with these values.",
    tightSpaceNote: "The setup exceeds the store size. Increase m2 or reduce machines.",
    months: "months",
    noPayback: "No payback",
    clientsDay: "customers/day",
    washerSmall: "Washer 10 kg",
    washerMedium: "Washer 14 kg",
    washerLarge: "Washer 20 kg",
    dryer: "Dryer 18 kg",
    washType: "wash",
    dryType: "dry",
    extraType: "extra",
    spaceLimitTooltip: "It does not fit in the current store. Increase m2 or remove other machines."
  }
};

const presets = {
  small: {
    storeSize: 25,
    openHours: 14,
    openDays: 30,
    washDemand: 24,
    dryDemand: 17,
    electricityPrice: 0.22,
    gasPrice: 0.08,
    waterPrice: 2.15,
    chemicalPrice: 0.32,
    rent: 750,
    fixedCosts: 550,
    fitoutCost: 420,
    machines: [0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0]
  },
  balanced: {
    storeSize: 45,
    openHours: 15,
    openDays: 30,
    washDemand: 42,
    dryDemand: 30,
    electricityPrice: 0.22,
    gasPrice: 0.08,
    waterPrice: 2.15,
    chemicalPrice: 0.32,
    rent: 1250,
    fixedCosts: 850,
    fitoutCost: 450,
    machines: [0, 1, 1, 0, 1, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0]
  },
  highTraffic: {
    storeSize: 80,
    openHours: 17,
    openDays: 31,
    washDemand: 92,
    dryDemand: 70,
    electricityPrice: 0.22,
    gasPrice: 0.08,
    waterPrice: 2.15,
    chemicalPrice: 0.32,
    rent: 2200,
    fixedCosts: 1450,
    fitoutCost: 500,
    machines: [0, 1, 1, 1, 2, 1, 0, 0, 0, 2, 2, 1, 0, 0, 0]
  }
};

function netMachinePrice(basePrice, packagingPrice = 0) {
  return Math.round((basePrice + COIN_BOX_PRICE + packagingPrice) * (1 - MACHINE_DISCOUNT));
}

const machineCatalog = [
  { id: "wrx8", label: "Lavadora WRX 8", type: "wash", capacityKg: 8, price: 4.8, minutes: 30, kwh: 0.9, waterLiters: 60, chemical: 1, areaM2: 2.0, purchasePrice: netMachinePrice(4900, 0) },
  { id: "hs9eco", label: "Lavadora HS 9 ECO", type: "wash", capacityKg: 9, price: 5.2, minutes: 30, kwh: 1.0, waterLiters: 68, chemical: 1, areaM2: 2.1, purchasePrice: netMachinePrice(11150, 280) },
  { id: "hs11eco", label: "Lavadora HS 11 ECO", type: "wash", capacityKg: 11, price: 6.2, minutes: 30, kwh: 1.2, waterLiters: 82, chemical: 1, areaM2: 2.3, purchasePrice: netMachinePrice(12680, 280) },
  { id: "hs13eco", label: "Lavadora HS 13 ECO", type: "wash", capacityKg: 13, price: 7.0, minutes: 30, kwh: 1.4, waterLiters: 96, chemical: 1, areaM2: 2.5, purchasePrice: netMachinePrice(13440, 327) },
  { id: "hs18eco", label: "Lavadora HS 18 ECO", type: "wash", capacityKg: 17, price: 8.5, minutes: 30, kwh: 1.8, waterLiters: 125, chemical: 1, areaM2: 3.0, purchasePrice: netMachinePrice(17250, 350) },
  { id: "hs24eco", label: "Lavadora HS 24 ECO", type: "wash", capacityKg: 23, price: 10.5, minutes: 30, kwh: 2.4, waterLiters: 165, chemical: 1, areaM2: 3.5, purchasePrice: netMachinePrice(18475, 360) },
  { id: "hs18oceano", label: "Lavadora HS 18 Océano", type: "wash", capacityKg: 18, price: 9.0, minutes: 30, kwh: 1.9, waterLiters: 130, chemical: 1, areaM2: 3.1, purchasePrice: netMachinePrice(22350, 630) },
  { id: "hs24oceano", label: "Lavadora HS 24 Océano", type: "wash", capacityKg: 24, price: 11.0, minutes: 30, kwh: 2.5, waterLiters: 170, chemical: 1, areaM2: 3.6, purchasePrice: netMachinePrice(23580, 660) },
  { id: "erx20", label: "Secadora ERX 20 eléctrica", type: "dry", capacityKg: 8, price: 3.8, minutes: 30, kwh: 3.2, gasKwh: 0, waterLiters: 0, chemical: 0, areaM2: 1.8, purchasePrice: netMachinePrice(4790, 0) },
  { id: "r25plusGas", label: "Secadora R25 PLUS gas", type: "dry", capacityKg: 10, price: 4.2, minutes: 30, kwh: 0.6, gasKwh: 4.2, waterLiters: 0, chemical: 0, areaM2: 2.0, purchasePrice: netMachinePrice(7615, 340) },
  { id: "r40plusGas", label: "Secadora R40 PLUS gas", type: "dry", capacityKg: 16, price: 5.0, minutes: 30, kwh: 0.8, gasKwh: 6.4, waterLiters: 0, chemical: 0, areaM2: 2.4, purchasePrice: netMachinePrice(8148, 420) },
  { id: "r55plusGas", label: "Secadora R55 PLUS gas", type: "dry", capacityKg: 25, price: 6.5, minutes: 30, kwh: 1.0, gasKwh: 9.5, waterLiters: 0, chemical: 0, areaM2: 3.1, purchasePrice: netMachinePrice(9415, 485) },
  { id: "r25plusElec", label: "Secadora R25 PLUS eléctrica", type: "dry", capacityKg: 10, price: 4.2, minutes: 30, kwh: 4.0, gasKwh: 0, waterLiters: 0, chemical: 0, areaM2: 2.0, purchasePrice: netMachinePrice(7117, 340) },
  { id: "rz40plus", label: "Secadora RZ40 PLUS eléctrica", type: "dry", capacityKg: 16, price: 5.2, minutes: 30, kwh: 5.6, gasKwh: 0, waterLiters: 0, chemical: 0, areaM2: 2.4, purchasePrice: netMachinePrice(16335, 460) },
  { id: "rz55plus", label: "Secadora RZ55 PLUS eléctrica", type: "dry", capacityKg: 25, price: 6.8, minutes: 30, kwh: 8.0, gasKwh: 0, waterLiters: 0, chemical: 0, areaM2: 3.1, purchasePrice: netMachinePrice(17080, 525) }
];

let lang = "es";
let state = structuredClone(presets.balanced);
let activePreset = "balanced";
let machineOverrides = machineCatalog.map((machine) => ({
  price: machine.price,
  minutes: machine.minutes
}));

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const preciseMoney = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const els = {
  storeSize: document.querySelector("#store-size"),
  openHours: document.querySelector("#open-hours"),
  openDays: document.querySelector("#open-days"),
  washDemand: document.querySelector("#wash-demand"),
  dryDemand: document.querySelector("#dry-demand"),
  electricityPrice: document.querySelector("#electricity-price"),
  gasPrice: document.querySelector("#gas-price"),
  waterPrice: document.querySelector("#water-price"),
  chemicalPrice: document.querySelector("#chemical-price"),
  rent: document.querySelector("#rent"),
  fixedCosts: document.querySelector("#fixed-costs"),
  fitoutCost: document.querySelector("#fitout-cost"),
  machineList: document.querySelector("#machine-list")
};

function formatMoney(value, precise = false) {
  return (precise ? preciseMoney : money).format(Number.isFinite(value) ? value : 0);
}

function getText(key) {
  return i18n[lang][key] || i18n.es[key] || key;
}

function cyclesPerDay(machine, count, openHours) {
  if (!count || machine.minutes <= 0) return 0;
  return count * openHours * 60 / machine.minutes;
}

function distributeDemand(totalCycles, machines) {
  const totalWeight = machines.reduce((sum, item) => sum + item.capacityPerDay, 0);
  if (!totalWeight || totalCycles <= 0) return machines.map(() => 0);

  return machines.map((item) => {
    const requested = totalCycles * (item.capacityPerDay / totalWeight);
    return Math.min(requested, item.capacityPerDay);
  });
}

function calculateRequiredArea(machineCounts) {
  return 12 + machineCatalog.reduce((sum, machine, index) => {
    return sum + Number(machineCounts[index] || 0) * machine.areaM2;
  }, 0);
}

function calculateDemandLimits(nextState) {
  return machineCatalog.reduce((limits, machine, index) => {
    if (machine.type !== "wash" && machine.type !== "dry") return limits;

    const count = Number(nextState.machines[index] || 0);
    const minutes = Number(machineOverrides[index].minutes || machine.minutes);
    const dailyCapacity = cyclesPerDay({ ...machine, minutes }, count, nextState.openHours);
    if (machine.type === "wash") limits.wash += dailyCapacity;
    if (machine.type === "dry") limits.dry += dailyCapacity;
    return limits;
  }, { wash: 0, dry: 0 });
}

function calculate(nextState) {
  const machineRows = machineCatalog.map((base, index) => {
    const count = Number(nextState.machines[index] || 0);
    const machine = {
      ...base,
      price: Number(machineOverrides[index].price),
      minutes: Number(machineOverrides[index].minutes)
    };
    const capacityPerDay = cyclesPerDay(machine, count, nextState.openHours);
    return { machine, count, capacityPerDay };
  });

  const washRows = machineRows.filter((row) => row.machine.type === "wash");
  const dryRows = machineRows.filter((row) => row.machine.type === "dry");
  const extraRows = machineRows.filter((row) => row.machine.type === "extra");

  const requestedWashCycles = nextState.washDemand;
  const requestedDryCycles = nextState.dryDemand;
  const requestedExtraSales = nextState.washDemand * 0.35;

  const washCycles = distributeDemand(requestedWashCycles, washRows);
  const dryCycles = distributeDemand(requestedDryCycles, dryRows);
  const extraSales = distributeDemand(requestedExtraSales, extraRows);

  const revenueFrom = (rows, cycles) => rows.reduce((sum, row, index) => {
    return sum + cycles[index] * row.machine.price * nextState.openDays;
  }, 0);

  const variableCostFrom = (rows, cycles) => rows.reduce((sum, row, index) => {
    const cycleCount = cycles[index] * nextState.openDays;
    const electricity = row.machine.kwh * nextState.electricityPrice;
    const gas = (row.machine.gasKwh || 0) * nextState.gasPrice;
    const water = (row.machine.waterLiters / 1000) * nextState.waterPrice;
    const chemical = row.machine.chemical ? nextState.chemicalPrice : 0;
    return sum + cycleCount * (electricity + gas + water + chemical);
  }, 0);

  const washerRevenue = revenueFrom(washRows, washCycles);
  const dryerRevenue = revenueFrom(dryRows, dryCycles);
  const extraRevenue = revenueFrom(extraRows, extraSales);
  const variableCosts = variableCostFrom(washRows, washCycles) + variableCostFrom(dryRows, dryCycles) + variableCostFrom(extraRows, extraSales);
  const fixedCosts = nextState.rent + nextState.fixedCosts;
  const monthlyRevenue = washerRevenue + dryerRevenue + extraRevenue;
  const monthlyProfit = monthlyRevenue - variableCosts - fixedCosts;

  const machineInvestment = machineRows.reduce((sum, row) => {
    return sum + row.count * row.machine.purchasePrice;
  }, 0);
  const fitoutInvestment = nextState.storeSize * nextState.fitoutCost;
  const initialInvestment = machineInvestment + fitoutInvestment;
  const paybackMonths = monthlyProfit > 0 ? initialInvestment / monthlyProfit : Infinity;

  const washCapacity = washRows.reduce((sum, row) => sum + row.capacityPerDay, 0);
  const dryCapacity = dryRows.reduce((sum, row) => sum + row.capacityPerDay, 0);
  const actualWashCycles = washCycles.reduce((sum, value) => sum + value, 0);
  const actualDryCycles = dryCycles.reduce((sum, value) => sum + value, 0);
  const washOccupancy = washCapacity ? actualWashCycles / washCapacity : 0;
  const dryOccupancy = dryCapacity ? actualDryCycles / dryCapacity : 0;
  const margin = monthlyRevenue ? monthlyProfit / monthlyRevenue : 0;
  const dailyCustomerBase = Math.max(1, Math.max(nextState.washDemand, nextState.dryDemand));
  const averageRevenuePerCustomer = monthlyRevenue / Math.max(1, dailyCustomerBase * nextState.openDays);
  const averageVariablePerCustomer = variableCosts / Math.max(1, dailyCustomerBase * nextState.openDays);
  const contribution = Math.max(0.01, averageRevenuePerCustomer - averageVariablePerCustomer);
  const breakEvenClients = fixedCosts / nextState.openDays / contribution;
  const requiredArea = calculateRequiredArea(nextState.machines);

  return {
    washerRevenue,
    dryerRevenue,
    extraRevenue,
    variableCosts,
    fixedCosts,
    monthlyRevenue,
    monthlyProfit,
    initialInvestment,
    paybackMonths,
    washOccupancy,
    dryOccupancy,
    requestedWashCycles,
    requestedDryCycles,
    actualWashCycles,
    actualDryCycles,
    washCapacity,
    dryCapacity,
    margin,
    breakEvenClients,
    averageRevenuePerCustomer,
    requiredArea,
    totalCapacity: machineRows.reduce((sum, row) => sum + row.count * row.machine.capacityKg, 0),
    totalCosts: variableCosts + fixedCosts
  };
}

function syncControls() {
  const demandLimits = calculateDemandLimits(state);
  const maxWashDemand = Math.floor(demandLimits.wash);
  state.washDemand = Math.min(state.washDemand, maxWashDemand);
  const maxDryDemand = Math.min(Math.floor(demandLimits.dry), state.washDemand);
  state.dryDemand = Math.min(state.dryDemand, maxDryDemand);

  Object.entries(els).forEach(([key, element]) => {
    if (!element || key === "machineList") return;
    element.value = state[key];
  });
  document.querySelector("#store-size-output").textContent = `${state.storeSize} m2`;
  document.querySelector("#open-hours-output").textContent = `${state.openHours} h`;
  document.querySelector("#open-days-output").textContent = state.openDays;
  els.washDemand.max = maxWashDemand;
  els.dryDemand.max = maxDryDemand;
  els.washDemand.value = state.washDemand;
  els.dryDemand.value = state.dryDemand;
  document.querySelector("#wash-demand-output").textContent = state.washDemand;
  document.querySelector("#dry-demand-output").textContent = state.dryDemand;
}

function renderMachines() {
  els.machineList.innerHTML = machineCatalog.map((machine, index) => {
    const count = Number(state.machines[index] || 0);
    const nextCounts = [...state.machines];
    nextCounts[index] = count + 1;
    const canAdd = calculateRequiredArea(nextCounts) <= state.storeSize;
    const addTitle = canAdd ? "Sumar" : getText("spaceLimitTooltip");
    const investment = count * machine.purchasePrice;
    return `
      <article class="machine-row" data-machine-index="${index}">
        <div class="machine-name">
          <strong>${machine.label}</strong>
          <span>${machine.capacityKg ? `${machine.capacityKg} kg · ` : ""}${getText(`${machine.type}Type`)} · ${formatMoney(investment)}</span>
        </div>
        <div class="machine-field">
          <span>${getText("units")}</span>
          <div class="stepper">
            <button type="button" data-action="dec" aria-label="Restar">-</button>
            <output>${count}</output>
            <button type="button" data-action="inc" aria-label="${addTitle}" title="${canAdd ? "" : addTitle}" class="${canAdd ? "" : "is-disabled"}" aria-disabled="${canAdd ? "false" : "true"}">+</button>
          </div>
        </div>
        <label class="machine-field">
          <span>${getText("price")}</span>
          <input class="machine-input" data-field="price" type="number" min="0" step="0.1" value="${machineOverrides[index].price}">
        </label>
        <label class="machine-field">
          <span>${getText("minutes")}</span>
          <input class="machine-input" data-field="minutes" type="number" min="1" step="1" value="${machineOverrides[index].minutes}">
        </label>
      </article>
    `;
  }).join("");
}

function renderResults() {
  const result = calculate(state);
  const maxBar = Math.max(result.monthlyRevenue, result.totalCosts, 1);
  const payback = Number.isFinite(result.paybackMonths)
    ? `${Math.ceil(result.paybackMonths)} ${getText("months")}`
    : getText("noPayback");

  document.querySelector("#kpi-investment").textContent = formatMoney(result.initialInvestment);
  document.querySelector("#kpi-revenue").textContent = formatMoney(result.monthlyRevenue);
  document.querySelector("#kpi-profit").textContent = formatMoney(result.monthlyProfit);
  document.querySelector("#kpi-profit").classList.toggle("is-negative", result.monthlyProfit < 0);
  document.querySelector("#kpi-payback").textContent = payback;
  document.querySelector("#total-capacity").textContent = Math.round(result.totalCapacity);
  document.querySelector("#washer-revenue").textContent = formatMoney(result.washerRevenue);
  document.querySelector("#dryer-revenue").textContent = formatMoney(result.dryerRevenue + result.extraRevenue);
  document.querySelector("#variable-costs").textContent = formatMoney(result.variableCosts);
  document.querySelector("#monthly-fixed-costs").textContent = formatMoney(result.fixedCosts);
  document.querySelector("#net-profit").textContent = formatMoney(result.monthlyProfit);
  document.querySelector("#net-profit").classList.toggle("is-negative", result.monthlyProfit < 0);
  document.querySelector("#revenue-bar-value").textContent = formatMoney(result.monthlyRevenue);
  document.querySelector("#cost-bar-value").textContent = formatMoney(result.totalCosts);
  document.querySelector("#revenue-bar").style.width = `${Math.max(4, result.monthlyRevenue / maxBar * 100)}%`;
  document.querySelector("#cost-bar").style.width = `${Math.max(4, result.totalCosts / maxBar * 100)}%`;
  document.querySelector("#wash-occupancy").textContent = `${Math.round(result.washOccupancy * 100)}%`;
  document.querySelector("#dry-occupancy").textContent = `${Math.round(result.dryOccupancy * 100)}%`;
  document.querySelector("#daily-washes").textContent = `${Math.floor(result.actualWashCycles)} / ${Math.round(result.requestedWashCycles)}`;
  document.querySelector("#daily-dries").textContent = `${Math.floor(result.actualDryCycles)} / ${Math.round(result.requestedDryCycles)}`;
  document.querySelector("#wash-capacity").textContent = Math.floor(result.washCapacity);
  document.querySelector("#dry-capacity").textContent = Math.floor(result.dryCapacity);
  document.querySelector("#break-even").textContent = `${Math.ceil(result.breakEvenClients)} ${getText("clientsDay")}`;
  document.querySelector("#average-ticket").textContent = formatMoney(result.averageRevenuePerCustomer, true);
  document.querySelector("#space-use").textContent = `${Math.ceil(result.requiredArea)} / ${state.storeSize} m2`;
  document.querySelector("#margin-pill").textContent = `${Math.round(result.margin * 100)}%`;
  document.querySelector("#margin-pill").classList.toggle("is-negative", result.margin < 0);

  let health = "balanced";
  if (result.monthlyProfit < 0) health = "losing";
  else if (result.requiredArea > state.storeSize) health = "tightSpace";
  else if (result.requestedWashCycles > result.washCapacity || result.requestedDryCycles > result.dryCapacity) health = "saturated";
  else if (result.washOccupancy > 0.88 || result.dryOccupancy > 0.88) health = "saturated";
  else if (result.washOccupancy < 0.28 && result.dryOccupancy < 0.28) health = "overbuilt";

  document.querySelector("#scenario-health").textContent = getText(health);
  document.querySelector("#scenario-note").textContent = getText(`${health}Note`);
}

function renderText() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = getText(node.dataset.i18n);
  });
  document.querySelectorAll(".lang-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === lang);
  });
}

function render() {
  syncControls();
  renderText();
  renderMachines();
  renderResults();
  document.querySelectorAll(".preset-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === activePreset);
  });
}

function updateState(key, value) {
  state[key] = Number(value);
  if (key === "washDemand" && state.dryDemand > state.washDemand) {
    state.dryDemand = state.washDemand;
  }
  if (key === "dryDemand") {
    state.dryDemand = Math.min(state.dryDemand, state.washDemand);
  }
  activePreset = "";
  render();
}

document.querySelectorAll("input[type='range'], .field-grid input").forEach((input) => {
  input.addEventListener("input", () => updateState(input.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), input.value));
});

document.querySelectorAll(".preset-button").forEach((button) => {
  button.addEventListener("click", () => {
    activePreset = button.dataset.preset;
    state = structuredClone(presets[activePreset]);
    render();
  });
});

document.querySelector("#reset-button").addEventListener("click", () => {
  activePreset = "balanced";
  state = structuredClone(presets.balanced);
  machineOverrides = machineCatalog.map((machine) => ({
    price: machine.price,
    minutes: machine.minutes
  }));
  render();
});

document.querySelectorAll(".lang-button").forEach((button) => {
  button.addEventListener("click", () => {
    lang = button.dataset.lang;
    render();
  });
});

els.machineList.addEventListener("input", (event) => {
  const input = event.target.closest("[data-field]");
  if (!input) return;
  const row = event.target.closest("[data-machine-index]");
  const index = Number(row.dataset.machineIndex);
  machineOverrides[index][input.dataset.field] = Number(input.value);
  activePreset = "";
  if (input.dataset.field === "minutes") {
    render();
    return;
  }
  renderResults();
});

els.machineList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = event.target.closest("[data-machine-index]");
  const index = Number(row.dataset.machineIndex);
  const delta = button.dataset.action === "inc" ? 1 : -1;
  const nextCounts = [...state.machines];
  nextCounts[index] = Math.max(0, Number(nextCounts[index] || 0) + delta);
  if (delta > 0 && calculateRequiredArea(nextCounts) > state.storeSize) return;
  state.machines[index] = Math.max(0, Number(state.machines[index] || 0) + delta);
  activePreset = "";
  render();
});

render();
