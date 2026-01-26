import { getMachineById, getRole } from "../state.js";

const tabs = [
  { id: "general", label: "General" },
  { id: "historial", label: "Historial" },
  { id: "config", label: "Config" },
  { id: "respaldo", label: "Respaldo" }
];

const renderTabs = (machineId, activeTab) => {
  const nav = document.createElement("div");
  nav.className = "machine-tabs";

  tabs.forEach((tab) => {
    const link = document.createElement("a");
    link.className = `machine-tab ${tab.id === activeTab ? "is-active" : ""}`;
    link.href = `#/m/${machineId}/${tab.id}`;
    link.textContent = tab.label;
    nav.appendChild(link);
  });

  return nav;
};

const renderActions = (machine) => {
  const role = getRole();
  const actions = document.createElement("div");
  actions.className = "machine-actions";

  if (role !== "invitado") {
    const assistance = document.createElement("button");
    assistance.type = "button";
    assistance.className = "btn-secondary";
    assistance.textContent = "Solicitar asistencia";
    assistance.addEventListener("click", () => {
      window.location.href =
        `mailto:soporte@unatomo.com?subject=Asistencia%20${encodeURIComponent(machine.nombre)}`;
    });
    actions.appendChild(assistance);
  }

  if (role === "admin" || role === "tecnico") {
    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "btn-primary";
    stop.textContent = "Notificar parada";
    stop.addEventListener("click", () => {
      window.alert("Contacto rápido: +34 900 000 000 · soporte@unatomo.com");
    });
    actions.appendChild(stop);
  }

  return actions;
};

const renderTabContent = (machine, activeTab) => {
  const panel = document.createElement("div");
  panel.className = "machine-panel";

  if (activeTab === "historial") {
    panel.textContent = "Historial de intervenciones pendiente de integración.";
    return panel;
  }

  if (activeTab === "config") {
    panel.textContent = "Configuración de máquina pendiente de integración.";
    return panel;
  }

  if (activeTab === "respaldo") {
    panel.textContent = "Respaldo y exportaciones pendientes de integración.";
    return panel;
  }

  const list = document.createElement("div");
  list.className = "machine-info";

  const rows = [
    ["Modelo", machine.modelo],
    ["Nº serie", machine.serie],
    ["Ubicación", machine.ubicacion],
    ["Estado", machine.estado === "ok" ? "Operativo" : "Parada"],
    ["Última intervención", machine.ultimaIntervencion]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "machine-info-row";

    const name = document.createElement("span");
    name.textContent = label;
    name.className = "machine-info-label";

    const val = document.createElement("span");
    val.textContent = value;
    val.className = "machine-info-value";

    row.appendChild(name);
    row.appendChild(val);
    list.appendChild(row);
  });

  panel.appendChild(list);
  return panel;
};

export const renderMachine = (mount, route) => {
  const machine = getMachineById(route.id);

  if (!machine) {
    const fallback = document.createElement("div");
    fallback.className = "machine-empty";
    fallback.textContent = "Máquina no encontrada.";
    mount.appendChild(fallback);
    return;
  }

  const header = document.createElement("div");
  header.className = "machine-header";

  const title = document.createElement("h1");
  title.textContent = machine.nombre;

  const sub = document.createElement("p");
  sub.className = "machine-subtitle";
  sub.textContent = `${machine.modelo} · ${machine.serie}`;

  header.appendChild(title);
  header.appendChild(sub);
  header.appendChild(renderActions(machine));

  mount.appendChild(header);
  mount.appendChild(renderTabs(machine.id, route.tab));
  mount.appendChild(renderTabContent(machine, route.tab));
};
