import { db, functions } from "/static/js/firebase/firebaseApp.js";
import {
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  writeBatch,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  normalizeDashboardTitle,
  normalizeGroupPresentationMode,
  normalizeIsoString,
  normalizeMachineSortMode,
  normalizeMachineViewMode,
  normalizeTabOrder
} from "./layout/dashboardLayoutModel.mjs";

const machinesCollection = collection(db, "machines");
const usernamesDoc = (ownerUid, normalized) =>
  doc(db, "usernames", `${ownerUid}_${normalized}`);
const dashboardLayoutDoc = (uid) => doc(db, "dashboard_layout", uid);
const saveDashboardGroupLayoutCallable = httpsCallable(
  functions,
  "saveDashboardGroupLayout"
);
const deleteMachineCallable = httpsCallable(functions, "deleteMachine");

export const fetchMachines = async (uid) => {
  const q = query(machinesCollection, where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const fetchDashboardLayout = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(dashboardLayoutDoc(uid));
  if (!snap.exists()) return null;
  return snap.data() || null;
};

export const upsertDashboardLayout = async (uid, layout) => {
  if (!uid) return;
  const hasGroups = Object.prototype.hasOwnProperty.call(layout || {}, "groups");
  const hasPlacements = Object.prototype.hasOwnProperty.call(layout || {}, "placements");
  const hasTabOrder = Object.prototype.hasOwnProperty.call(layout || {}, "tabOrder");
  const hasTitle = Object.prototype.hasOwnProperty.call(layout || {}, "dashboardTitle");
  const hasRegistrySeenAt = Object.prototype.hasOwnProperty.call(layout || {}, "registrySeenAt");
  const hasSuggestionsSeenAt = Object.prototype.hasOwnProperty.call(layout || {}, "suggestionsSeenAt");
  const hasMachineViewMode = Object.prototype.hasOwnProperty.call(layout || {}, "machineViewMode");
  const hasGroupPresentationMode = Object.prototype.hasOwnProperty.call(
    layout || {},
    "groupPresentationMode"
  );
  const hasMachineSortMode = Object.prototype.hasOwnProperty.call(layout || {}, "machineSortMode");
  const dashboardTitle = normalizeDashboardTitle(layout?.dashboardTitle);
  const payload = {
    updatedAt: serverTimestamp(),
    updatedBy: uid
  };
  if (hasGroups) {
    if (!hasPlacements) throw new Error("placements-required-with-groups");
  }
  if (hasPlacements) {
    if (!hasGroups) throw new Error("groups-required-with-placements");
  }
  if (hasTabOrder) payload.tabOrder = normalizeTabOrder(layout?.tabOrder);
  if (hasTitle) payload.dashboardTitle = dashboardTitle;
  if (hasRegistrySeenAt) {
    payload.registrySeenAt = normalizeIsoString(layout?.registrySeenAt);
  }
  if (hasSuggestionsSeenAt) {
    payload.suggestionsSeenAt = normalizeIsoString(layout?.suggestionsSeenAt);
  }
  if (hasMachineViewMode) {
    payload.machineViewMode = normalizeMachineViewMode(layout?.machineViewMode);
  }
  if (hasGroupPresentationMode) {
    payload.groupPresentationMode = normalizeGroupPresentationMode(
      layout?.groupPresentationMode
    );
  }
  if (hasMachineSortMode) {
    payload.machineSortMode = normalizeMachineSortMode(layout?.machineSortMode);
  }
  if (hasGroups && hasPlacements) {
    await saveDashboardGroupLayoutCallable({
      groups: Array.isArray(layout?.groups) ? layout.groups : [],
      placements:
        layout?.placements &&
        typeof layout.placements === "object" &&
        !Array.isArray(layout.placements) ?
          layout.placements :
          {}
    });
  }
  await setDoc(
    dashboardLayoutDoc(uid),
    payload,
    { merge: true }
  );
};

export const fetchLegacyMachines = async (uid) => {
  if (!uid) return [];
  const legacyCol = collection(db, "tenants", uid, "machines");
  const snap = await getDocs(legacyCol);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const migrateLegacyMachines = async (uid, legacyMachines = []) => {
  if (!uid || !legacyMachines.length) return;
  const batch = writeBatch(db);
  const now = serverTimestamp();
  legacyMachines.forEach((machine) => {
    const ref = doc(machinesCollection, machine.id);
    batch.set(
      ref,
      {
        ...machine,
        ownerUid: uid,
        tenantId: uid,
        updatedAt: now,
        updatedBy: uid
      },
      { merge: true }
    );
  });
  await batch.commit();
};

export const fetchMachine = async (uid, machineId) => {
  const ref = doc(db, "machines", machineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (uid && data.ownerUid && data.ownerUid !== uid) return null;
  return { id: snap.id, ...data };
};

export const commitChanges = async (uid, { creates, updates, deletes }) => {
  const batch = writeBatch(db);
  const col = machinesCollection;
  const now = serverTimestamp();

  creates.forEach((machine) => {
    const ref = doc(col, machine.id);
    batch.set(ref, {
      ...machine,
      ownerUid: machine.tenantId || machine.ownerUid || uid,
      createdAt: now,
      updatedAt: now,
      updatedBy: uid
    });
  });

  updates.forEach((machine) => {
    const ref = doc(col, machine.id);
    batch.set(
      ref,
      {
        ...machine,
        ownerUid: machine.tenantId || machine.ownerUid || uid,
        updatedAt: now,
        updatedBy: uid
      },
      { merge: true }
    );
  });

  deletes.forEach((id) => {
    const ref = doc(col, id);
    batch.delete(ref);
  });

  await batch.commit();
};

export const upsertMachine = async (uid, machine) => {
  const ref = doc(db, "machines", machine.id);
  const ownerUid = machine.tenantId || machine.ownerUid || uid;
  const payload = {
    ownerUid,
    tenantId: ownerUid,
    title: machine.title,
    brand: machine.brand,
    model: machine.model,
    serial: machine.serial || "",
    year: machine.year ?? null,
    location: machine.location || "",
    status: machine.status,
    tagId: machine.tagId ?? null,
    tagUrl: machine.tagUrl || "",
    tagQrUrl: machine.tagQrUrl || "",
    tagQrPath: machine.tagQrPath || "",
    tagQrSize: Number(machine.tagQrSize || 0),
    documents:
      machine.documents && typeof machine.documents === "object" && !Array.isArray(machine.documents)
        ? machine.documents
        : {},
    logs: machine.logs || [],
    tasks: machine.tasks || [],
    order: typeof machine.order === "number" ? machine.order : 0,
    users: machine.users || [],
    accessRolePermissions:
      machine.accessRolePermissions && typeof machine.accessRolePermissions === "object"
        ? machine.accessRolePermissions
        : {},
    adminEmail: machine.adminEmail || "",
    adminName: machine.adminName || "",
    adminStatus: machine.adminStatus || "",
    ownershipTransferEmail: machine.ownershipTransferEmail || "",
    ownershipTransferStatus: machine.ownershipTransferStatus || "",
    activeStatusCycleId: machine.activeStatusCycleId || "",
    notifications: machine.notifications || null,
    updatedAt: serverTimestamp(),
    updatedBy: uid
  };
  if (machine.isNew) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
};

export const deleteMachine = async (uid, machineId) => {
  void uid;
  await deleteMachineCallable({ machineId });
};

export const addUserWithRegistry = async (uid, machineId, user, options = {}) => {
  const { normalizeName, allowExisting = false } = options;
  const machineRef = doc(db, "machines", machineId);
  const normalized = normalizeName
    ? normalizeName(user.username)
    : (user.username || "").trim().toLowerCase();
  const userRef = usernamesDoc(uid, normalized);

  return runTransaction(db, async (tx) => {
    const [machineSnap, userSnap] = await Promise.all([
      tx.get(machineRef),
      tx.get(userRef)
    ]);
    if (!machineSnap.exists()) throw new Error("machine-missing");
    const machineData = machineSnap.data() || {};
    if (machineData.ownerUid && machineData.ownerUid !== uid) {
      throw new Error("not-owner");
    }
    const users = Array.isArray(machineData.users) ? [...machineData.users] : [];
    const existsInMachine = users.some((u) => {
      const uname = normalizeName
        ? normalizeName(u.username)
        : (u.username || "").trim().toLowerCase();
      return uname === normalized;
    });
    if (existsInMachine) throw new Error("duplicate-user");

    if (userSnap.exists()) {
      if (!allowExisting) throw new Error("duplicate-user");
      const data = userSnap.data() || {};
      user.saltBase64 = data.saltBase64 || user.saltBase64 || "";
      user.passwordHashBase64 = data.passwordHashBase64 || user.passwordHashBase64 || "";
      user.username = data.username || user.username;
      if (!user.saltBase64 || !user.passwordHashBase64) {
        throw new Error("missing-credentials");
      }
    } else {
      if (!user.saltBase64 || !user.passwordHashBase64) {
        throw new Error("missing-credentials");
      }
      tx.set(userRef, {
        username: user.username,
        saltBase64: user.saltBase64,
        passwordHashBase64: user.passwordHashBase64,
        ownerUid: uid,
        machineId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid
      });
    }

    users.push(user);
    tx.set(
      machineRef,
      { users, updatedAt: serverTimestamp(), updatedBy: uid },
      { merge: true }
    );
    return users;
  });
};

export const deleteUserRegistry = async (uid, normalized) => {
  if (!normalized) return;
  const ref = usernamesDoc(uid, normalized);
  await deleteDoc(ref);
};

export const saveGlobalLocalUser = async ({
  ownerUid,
  actorUid,
  machines,
  assignedMachineIds,
  user
}) => {
  const normalized = (user?.username || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!ownerUid || !actorUid || !normalized || !user?.saltBase64 || !user?.passwordHashBase64) {
    throw new Error("invalid-global-user");
  }
  if (actorUid === ownerUid && user.isNew) {
    const existingRegistry = await getDoc(usernamesDoc(ownerUid, normalized));
    if (existingRegistry.exists()) throw new Error("duplicate-user");
  }
  const visibleMachines = (machines || []).filter(
    (machine) => machine?.id && (machine.ownerUid || machine.tenantId) === ownerUid
  );
  if (!visibleMachines.length || visibleMachines.length > 450) {
    throw new Error("invalid-machine-scope");
  }
  const assigned = new Set(assignedMachineIds || []);
  const accessScope = assigned.size === visibleMachines.length ? "all" : "selected";
  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  visibleMachines.forEach((machine) => {
    const currentUsers = Array.isArray(machine.users) ? machine.users : [];
    const withoutUser = currentUsers.filter(
      (item) => (item?.username || "").trim().replace(/\s+/g, " ").toLowerCase() !== normalized
    );
    const users = assigned.has(machine.id)
      ? [...withoutUser, {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          saltBase64: user.saltBase64,
          passwordHashBase64: user.passwordHashBase64,
          accessScope
        }]
      : withoutUser;
    batch.set(
      doc(db, "machines", machine.id),
      { users, updatedAt: timestamp, updatedBy: actorUid },
      { merge: true }
    );
  });
  const referenceMachine = visibleMachines.find((machine) => assigned.has(machine.id)) ||
    visibleMachines[0];
  if (actorUid === ownerUid) {
    batch.set(
      usernamesDoc(ownerUid, normalized),
      {
        username: user.username,
        saltBase64: user.saltBase64,
        passwordHashBase64: user.passwordHashBase64,
        role: user.role,
        ownerUid,
        machineId: referenceMachine.id,
        scope: accessScope,
        machineIds: visibleMachines
          .filter((machine) => assigned.has(machine.id))
          .map((machine) => machine.id),
        updatedAt: timestamp,
        updatedBy: actorUid
      },
      { merge: true }
    );
  }
  await batch.commit();
};

export const saveMachineAccessRolePermissions = async (
  actorUid,
  machines,
  accessRolePermissions
) => {
  const targets = (machines || []).filter((machine) => machine?.id);
  if (!actorUid || !targets.length || targets.length > 450) {
    throw new Error("invalid-role-policy-scope");
  }
  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  targets.forEach((machine) => {
    batch.set(
      doc(db, "machines", machine.id),
      { accessRolePermissions, updatedAt: timestamp, updatedBy: actorUid },
      { merge: true }
    );
  });
  await batch.commit();
};

export const deleteGlobalLocalUser = async ({
  ownerUid,
  actorUid,
  machines,
  username
}) => {
  const normalized = (username || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!ownerUid || actorUid !== ownerUid || !normalized) {
    throw new Error("global-user-delete-not-allowed");
  }
  const ownerMachines = (machines || []).filter(
    (machine) => machine?.id && (machine.ownerUid || machine.tenantId) === ownerUid
  );
  if (!ownerMachines.length || ownerMachines.length > 450) {
    throw new Error("invalid-machine-scope");
  }
  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  ownerMachines.forEach((machine) => {
    const users = (Array.isArray(machine.users) ? machine.users : []).filter(
      (item) =>
        (item?.username || "").trim().replace(/\s+/g, " ").toLowerCase() !== normalized
    );
    batch.set(
      doc(db, "machines", machine.id),
      { users, updatedAt: timestamp, updatedBy: actorUid },
      { merge: true }
    );
  });
  batch.delete(usernamesDoc(ownerUid, normalized));
  await batch.commit();
};
