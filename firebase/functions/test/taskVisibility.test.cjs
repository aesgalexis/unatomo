const assert = require("node:assert/strict");
const {
  canMachineUserSeeTask,
  filterTaskDataForUser,
} = require("../lib/machines/taskVisibility.js");

const maria = {id: "u_maria", username: "María"};
const pablo = {id: "u_pablo", username: "Pablo"};
const assignedTask = {
  id: "task-private",
  title: "Revisar filtro",
  assignedTo: {
    userId: maria.id,
    username: maria.username,
    role: "operator",
  },
};
const sharedTask = {
  id: "task-shared",
  title: "Limpiar zona",
  assignedTo: null,
};
const logs = [
  {
    type: "task_created",
    taskId: assignedTask.id,
    assignedTo: assignedTask.assignedTo,
  },
  {
    type: "task_created",
    taskId: sharedTask.id,
    assignedTo: null,
  },
];

assert.equal(canMachineUserSeeTask(assignedTask, maria), true);
assert.equal(canMachineUserSeeTask(assignedTask, pablo), false);
assert.equal(canMachineUserSeeTask(assignedTask, null), false);
assert.equal(canMachineUserSeeTask(sharedTask, pablo), true);

const mariaProjection = filterTaskDataForUser(
  [assignedTask, sharedTask],
  logs,
  maria,
);
assert.deepEqual(
  mariaProjection.tasks.map((task) => task.id),
  [assignedTask.id, sharedTask.id],
);
assert.equal(mariaProjection.logs.length, 2);

const pabloProjection = filterTaskDataForUser(
  [assignedTask, sharedTask],
  logs,
  pablo,
);
assert.deepEqual(
  pabloProjection.tasks.map((task) => task.id),
  [sharedTask.id],
);
assert.equal(pabloProjection.logs.length, 1);
assert.equal(pabloProjection.logs[0].taskId, sharedTask.id);

console.log("OK: assigned tasks and their history are assignee-only.");
