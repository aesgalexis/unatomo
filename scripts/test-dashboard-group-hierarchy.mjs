import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  MAX_DASHBOARD_GROUP_DEPTH,
  getDashboardGroupDepth,
  normalizeDashboardLayout,
} from "../static/js/dashboard/layout/dashboardLayoutModel.mjs";
const actionsPath = new URL(
  "../static/js/dashboard/layout/dashboardLayoutActions.js",
  import.meta.url,
);
const modelUrl = new URL(
  "../static/js/dashboard/layout/dashboardLayoutModel.mjs",
  import.meta.url,
).href;
const actionsSource = readFileSync(actionsPath, "utf8").replace(
  "./dashboardLayoutModel.mjs",
  modelUrl,
);
const actionsModule = await import(
  `data:text/javascript;base64,${Buffer.from(actionsSource).toString("base64")}`
);
const {
  canMoveGroupIntoGroup,
  canWrapGroupWithParent,
  createChildGroup,
  createGroupFromMachineDrop,
  createParentGroup,
  deleteGroup,
  moveGroupToGroup,
  reorderMixedItems,
} = actionsModule;

const group = (id, parentGroupId = "", order = 0) => ({
  id,
  title: id,
  parentGroupId,
  order,
  collapsed: false,
});

const hierarchy = normalizeDashboardLayout({
  groups: [group("root"), group("client", "root"), group("area", "client")],
});
assert.equal(MAX_DASHBOARD_GROUP_DEPTH, 2);
assert.equal(getDashboardGroupDepth(hierarchy.groups, "area"), 2);
assert.equal(
  hierarchy.groups.find((entry) => entry.id === "area")?.parentGroupId,
  "client",
);
const flatHierarchy = normalizeDashboardLayout({
  ...hierarchy,
  machineViewMode: "flat",
  machineSortMode: "name",
});
assert.equal(flatHierarchy.machineViewMode, "flat");
assert.equal(flatHierarchy.machineSortMode, "name");
assert.equal(
  flatHierarchy.groups.find((entry) => entry.id === "area")?.parentGroupId,
  "client",
);

const tooDeep = normalizeDashboardLayout({
  groups: [
    group("root"),
    group("client", "root"),
    group("area", "client"),
    group("extra", "area"),
  ],
});
assert.equal(
  tooDeep.groups.find((entry) => entry.id === "extra")?.parentGroupId,
  "",
);

const cycle = normalizeDashboardLayout({
  groups: [group("one", "two"), group("two", "one")],
});
assert.ok(
  cycle.groups.every(
    (entry) => getDashboardGroupDepth(cycle.groups, entry.id) <= 1,
  ),
);

const movable = {
  groups: [
    group("laundries"),
    group("client"),
    group("area", "client"),
  ],
  placements: {},
};
assert.equal(canWrapGroupWithParent(movable, "client"), true);
const wrapped = createParentGroup(
  movable,
  "client",
  group("laundry-root"),
).layout;
assert.equal(
  wrapped.groups.find((entry) => entry.id === "client")?.parentGroupId,
  "laundry-root",
);
assert.equal(getDashboardGroupDepth(wrapped.groups, "area"), 2);
assert.equal(canMoveGroupIntoGroup(movable, "client", "laundries"), true);
const nested = moveGroupToGroup(movable, "client", "laundries").layout;
assert.equal(getDashboardGroupDepth(nested.groups, "area"), 2);
assert.equal(
  nested.groups.find((entry) => entry.id === "area")?.parentGroupId,
  "client",
);

const invalidTarget = {
  groups: [
    group("root"),
    group("target", "root"),
    group("client"),
    group("area", "client"),
  ],
  placements: {},
};
assert.equal(canMoveGroupIntoGroup(invalidTarget, "client", "target"), false);
const unchanged = moveGroupToGroup(
  invalidTarget,
  "client",
  "target",
).layout;
assert.equal(
  unchanged.groups.find((entry) => entry.id === "client")?.parentGroupId,
  "",
);

const childCreated = createChildGroup(nested, "client", group("new-area"));
assert.equal(
  childCreated.layout.groups.find((entry) => entry.id === "new-area")
    ?.parentGroupId,
  "client",
);
const grandchildRejected = createChildGroup(
  childCreated.layout,
  "area",
  group("too-far"),
);
assert.equal(
  grandchildRejected.layout.groups.some((entry) => entry.id === "too-far"),
  false,
);

const machines = [{id: "one", order: 0}, {id: "two", order: 1}];
const depthLimitLayout = {
  ...nested,
  placements: {
    one: {groupId: "area", order: 0},
    two: {groupId: "area", order: 1},
  },
};
const machineGroupRejected = createGroupFromMachineDrop(
  depthLimitLayout,
  machines,
  {
    draggedId: "one",
    targetId: "two",
    groupId: "too-deep",
    title: "Too deep",
    parentGroupId: "area",
  },
);
assert.equal(machineGroupRejected.layout.groups.length, nested.groups.length);
const reorderedAtDepth = reorderMixedItems(
  depthLimitLayout,
  machines,
  "area",
  [{type: "machine", id: "two"}, {type: "machine", id: "one"}],
);
assert.equal(reorderedAtDepth.layout.placements.two.order, 0);
assert.equal(reorderedAtDepth.layout.placements.one.order, 1);
assert.equal(
  reorderedAtDepth.layout.groups.find((entry) => entry.id === "area")
    ?.parentGroupId,
  "client",
);

const deleted = deleteGroup(nested, "client").layout;
assert.equal(
  deleted.groups.find((entry) => entry.id === "area")?.parentGroupId,
  "laundries",
);

console.log("OK: dashboard group hierarchy supports depths 0-2.");
