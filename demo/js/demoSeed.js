import { buildMachineTagUrl } from "/static/js/dashboard/tags/tagUrl.js";

const now = new Date();
const isoDaysAgo = (days, hour = 9) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

export const createDemoMachines = () => [
  {
    id: "demo-washer-01",
    title: "Lavadora 26 kg",
    brand: "Domus",
    model: "DHS-26",
    serial: "DM26-8421",
    year: 2021,
    status: "operativa",
    location: "Lavanderia principal",
    tagId: "G-DEMO-26KG",
    tagUrl: buildMachineTagUrl("G-DEMO-26KG"),
    tagQrUrl: "demo",
    ownerEmail: "demo@unatomo.com",
    users: [
      { id: "u-lucia", username: "Lucia", role: "tecnico" },
      { id: "u-turno", username: "Turno", role: "usuario" }
    ],
    tasks: [
      {
        id: "task-filter-26",
        title: "Limpiar filtro",
        description: "Revisar pelusa y aclarar el filtro",
        frequency: "semanal",
        createdAt: isoDaysAgo(5),
        lastCompletedAt: null,
        createdBy: "Demo"
      },
      {
        id: "task-level-26",
        title: "Comprobar nivelacion",
        description: "Verificar vibraciones en centrifugado",
        frequency: "mensual",
        createdAt: isoDaysAgo(18),
        lastCompletedAt: isoDaysAgo(2),
        createdBy: "Demo"
      }
    ],
    logs: [
      { ts: isoDaysAgo(12), type: "status", value: "operativa", user: "Demo" },
      {
        ts: isoDaysAgo(8),
        type: "task_created",
        taskId: "task-filter-26",
        title: "Limpiar filtro",
        description: "Revisar pelusa y aclarar el filtro",
        user: "Demo"
      },
      {
        ts: isoDaysAgo(2),
        type: "task",
        taskId: "task-level-26",
        title: "Comprobar nivelacion",
        user: "Lucia",
        punctual: false
      }
    ],
    documents: {
      plate: {
        id: "plate-26",
        name: "placa-lavadora-26.jpg",
        url: "/static/img/favicon/favicon.svg",
        contentType: "image/svg+xml",
        size: 1024
      },
      other: [
        {
          id: "doc-26-maint",
          name: "mantenimiento-preventivo.pdf",
          displayName: "Checklist preventivo",
          url: "/nfc/es/privacidad.html",
          contentType: "application/pdf",
          size: 2048
        }
      ]
    }
  },
  {
    id: "demo-dryer-01",
    title: "Secadora 35 kg",
    brand: "Primer",
    model: "DS-35",
    serial: "PR35-1187",
    year: 2020,
    status: "fuera_de_servicio",
    location: "Zona secado",
    tagId: "G-DEMO-DRY35",
    tagUrl: buildMachineTagUrl("G-DEMO-DRY35"),
    tagQrUrl: "demo",
    ownerEmail: "demo@unatomo.com",
    activeStatusCycleId: "cycle-dryer-bearing",
    users: [
      { id: "u-lucia", username: "Lucia", role: "tecnico" },
      { id: "u-mario", username: "Mario", role: "externo" }
    ],
    tasks: [
      {
        id: "task-restore-dryer",
        title: "Volver a poner la maquina en operatividad",
        description: "Ruido anormal en rodamiento trasero",
        frequency: "puntual",
        createdAt: isoDaysAgo(1, 11),
        lastCompletedAt: null,
        createdBy: "Demo",
        source: "status-out-of-service",
        automated: true,
        statusTarget: "operativa",
        statusCycleId: "cycle-dryer-bearing",
        notes: [
          {
            id: "note-bearing",
            text: "Pendiente revisar correa y rodamiento",
            createdAt: isoDaysAgo(1, 11),
            createdBy: "Demo"
          }
        ]
      }
    ],
    logs: [
      {
        ts: isoDaysAgo(1, 11),
        type: "status",
        value: "fuera_de_servicio",
        user: "Demo",
        source: "status-out-of-service",
        statusCycleId: "cycle-dryer-bearing"
      },
      {
        ts: isoDaysAgo(1, 11),
        type: "task_created",
        taskId: "task-restore-dryer",
        title: "Volver a poner la maquina en operatividad",
        description: "Ruido anormal en rodamiento trasero",
        user: "Demo",
        source: "status-out-of-service",
        statusCycleId: "cycle-dryer-bearing"
      },
      {
        ts: isoDaysAgo(1, 12),
        type: "task_note_added",
        taskId: "task-restore-dryer",
        title: "Volver a poner la maquina en operatividad",
        note: "Pendiente revisar correa y rodamiento",
        user: "Demo",
        source: "status-out-of-service",
        statusCycleId: "cycle-dryer-bearing"
      }
    ],
    documents: {}
  },
  {
    id: "demo-ironer-01",
    title: "Calandra 2 rodillos",
    brand: "Girbau",
    model: "PB-32",
    serial: "GB32-5540",
    year: 2019,
    status: "operativa",
    location: "Acabado",
    tagId: "",
    tagUrl: "",
    ownerEmail: "demo@unatomo.com",
    adminEmail: "mantenimiento@example.com",
    adminStatus: "Administrado",
    users: [{ id: "u-turno", username: "Turno", role: "usuario" }],
    tasks: [
      {
        id: "task-belts-ironer",
        title: "Revisar cintas",
        description: "Comprobar tension y desgaste",
        frequency: "mensual",
        createdAt: isoDaysAgo(22),
        lastCompletedAt: null,
        createdBy: "Demo"
      }
    ],
    logs: [
      {
        ts: isoDaysAgo(20),
        type: "task_created",
        taskId: "task-belts-ironer",
        title: "Revisar cintas",
        description: "Comprobar tension y desgaste",
        user: "Demo"
      },
      {
        ts: isoDaysAgo(4),
        type: "intervencion",
        message: "Se ajusta presion de entrada",
        user: "Mario"
      }
    ],
    documents: {}
  }
];

export const createDemoLayout = () => ({
  tabOrder: ["quehaceres", "historial", "general", "configuracion"],
  machineViewMode: "flat",
  machineSortMode: "manual"
});
