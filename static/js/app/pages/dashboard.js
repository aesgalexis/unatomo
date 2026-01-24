import { machines } from "../state.js";

const renderCard = (machine) => {
  const card = document.createElement("a");
  card.className = "machine-card";
  card.href = `#/m/${machine.id}`;

  const title = document.createElement("h3");
  title.textContent = machine.nombre;

  const meta = document.createElement("p");
  meta.className = "machine-meta";
  meta.textContent = `${machine.modelo} · ${machine.serie}`;

  const location = document.createElement("p");
  location.className = "machine-meta";
  location.textContent = machine.ubicacion;

  const status = document.createElement("span");
  status.className = `machine-status ${machine.estado === "ok" ? "is-ok" : "is-stop"}`;
  status.textContent = machine.estado === "ok" ? "Operativa" : "Parada";

  const last = document.createElement("p");
  last.className = "machine-meta";
  last.textContent = `Última intervención: ${machine.ultimaIntervencion}`;

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(location);
  card.appendChild(status);
  card.appendChild(last);

  return card;
};

export const renderDashboard = (mount) => {
  const header = document.createElement("div");
  header.className = "dashboard-header";

  const title = document.createElement("h1");
  title.textContent = "Dashboard de maquinaria";

  const subtitle = document.createElement("p");
  subtitle.className = "dashboard-subtitle";
  subtitle.textContent = "Estado general y acceso rápido a cada equipo.";

  header.appendChild(title);
  header.appendChild(subtitle);

  const grid = document.createElement("div");
  grid.className = "machine-grid";

  machines.forEach((machine) => {
    grid.appendChild(renderCard(machine));
  });

  mount.appendChild(header);
  mount.appendChild(grid);
};
