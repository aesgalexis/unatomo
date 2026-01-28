const machines = [
  {
    id: "mx-101",
    nombre: "Máquina MX-101",
    modelo: "LX-900",
    serie: "A1-2024-9981",
    ubicacion: "Planta 1 · Línea A",
    estado: "ok",
    ultimaIntervencion: "2025-12-14"
  },
  {
    id: "mx-202",
    nombre: "Equipo PR-22",
    modelo: "DR-450",
    serie: "B3-2023-4412",
    ubicacion: "Planta 1 · Línea B",
    estado: "parada",
    ultimaIntervencion: "2026-01-08"
  },
  {
    id: "mx-303",
    nombre: "Unidad ZR-07",
    modelo: "LX-700",
    serie: "C7-2022-3320",
    ubicacion: "Planta 2 · Línea C",
    estado: "ok",
    ultimaIntervencion: "2025-11-30"
  }
];

const roles = ["admin", "tecnico", "cliente", "invitado"];

const getRole = () => {
  const stored = window.localStorage.getItem("role");
  if (roles.includes(stored)) return stored;

  const isAuthed = document.documentElement.dataset.auth === "user";
  return isAuthed ? "cliente" : "invitado";
};

const getMachineById = (id) => machines.find((item) => item.id === id) || null;

export { machines, getMachineById, getRole };
