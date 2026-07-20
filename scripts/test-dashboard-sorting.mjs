import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sortingPath = new URL(
  "../static/js/dashboard/runtime/dashboardSorting.js",
  import.meta.url,
);
const sortingSource = readFileSync(sortingPath, "utf8").replace(
  'import { getTaskTiming } from "/static/js/dashboard/tabs/tasks/tasksTime.js";',
  "const getTaskTiming = (task) => ({pending: task?.pending === true});",
);
const {sortFlatMachines} = await import(
  `data:text/javascript;base64,${Buffer.from(sortingSource).toString("base64")}`
);

const machines = [
  {id: "charlie", title: "Charlie", order: 1, status: "operativa", tasks: []},
  {
    id: "bravo",
    title: "Bravo",
    order: 2,
    status: "fuera_de_servicio",
    tasks: [],
  },
  {
    id: "alpha",
    title: "Alpha",
    order: 3,
    status: "operativa",
    tasks: [{pending: true}, {pending: true}],
  },
  {
    id: "delta",
    title: "Delta",
    order: 4,
    status: "desconectada",
    tasks: [{pending: true}, {pending: true}, {pending: true}],
  },
];

assert.deepEqual(
  sortFlatMachines(machines, "manual").map((machine) => machine.id),
  ["charlie", "bravo", "alpha", "delta"],
);
assert.deepEqual(
  sortFlatMachines(machines, "name").map((machine) => machine.id),
  ["alpha", "bravo", "charlie", "delta"],
);
assert.deepEqual(
  sortFlatMachines(machines, "incidents").map((machine) => machine.id),
  ["bravo", "alpha", "charlie", "delta"],
);
assert.deepEqual(
  machines.map((machine) => machine.id),
  ["charlie", "bravo", "alpha", "delta"],
  "sorting must not mutate dashboard machine state",
);

console.log("OK: dashboard card sorting is stable and presentation-only.");
