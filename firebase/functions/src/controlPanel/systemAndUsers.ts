import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  getAccountHandleValidationError,
  normalizeAccountHandle,
} from "../core/accountHandles";
import {assertControlPanelAccess, normalizeEmail} from "../core/auth";
import {
  accountDirectoryCol,
  accountHandlesCol,
  dashboardSuggestionsCol,
  dashboardTodosCol,
  db,
  invitesCol,
  linksCol,
  machineAccessCol,
  machinesCol,
  tagsCol,
  transferInvitesCol,
} from "../core/firebase";

type ControlPanelIntegrityIssue = {
  code: string;
  count: number;
  samples: string[];
};

export const getControlPanelSystemStatus = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const queryLimit = 2000;
  const listAuthUsers = async () => {
    const users: admin.auth.UserRecord[] = [];
    let pageToken: string | undefined;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      users.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);
    return users;
  };

  const [
    machinesSnap,
    tagsSnap,
    accessSnap,
    linksSnap,
    invitesSnap,
    transfersSnap,
    todosSnap,
    suggestionsSnap,
    usersSnap,
    accountHandlesSnap,
    authUsers,
  ] = await Promise.all([
    machinesCol().limit(queryLimit).get(),
    tagsCol().limit(queryLimit).get(),
    machineAccessCol().limit(queryLimit).get(),
    linksCol().limit(queryLimit).get(),
    invitesCol().limit(queryLimit).get(),
    transferInvitesCol().limit(queryLimit).get(),
    dashboardTodosCol().limit(queryLimit).get(),
    dashboardSuggestionsCol().limit(queryLimit).get(),
    db.collection("users").limit(queryLimit).get(),
    accountHandlesCol().limit(queryLimit).get(),
    listAuthUsers(),
  ]);

  const machineById = new Map<string, FirebaseFirestore.DocumentData>();
  machinesSnap.forEach((docSnap) => {
    machineById.set(docSnap.id, docSnap.data() || {});
  });
  const tagById = new Map<string, FirebaseFirestore.DocumentData>();
  tagsSnap.forEach((docSnap) => {
    tagById.set(docSnap.id, docSnap.data() || {});
  });
  const accessByTagId = new Map<string, FirebaseFirestore.DocumentData>();
  accessSnap.forEach((docSnap) => {
    accessByTagId.set(docSnap.id, docSnap.data() || {});
  });
  const authUids = new Set(authUsers.map((user) => user.uid));
  const machineLabel = (id: string) => {
    const machine = machineById.get(id) || {};
    return (machine.title || id).toString().trim() || id;
  };
  const issues: ControlPanelIntegrityIssue[] = [];
  const addIssue = (code: string, matches: string[]) => {
    if (!matches.length) return;
    issues.push({
      code,
      count: matches.length,
      samples: matches.slice(0, 5),
    });
  };

  const missingMachineOwner: string[] = [];
  const unknownMachineOwner: string[] = [];
  const machineMissingTag: string[] = [];
  const machineMissingAccess: string[] = [];
  const machineTagOwners = new Map<string, string[]>();
  let operationalMachines = 0;
  let outOfServiceMachines = 0;
  let pendingTasks = 0;
  machinesSnap.forEach((docSnap) => {
    const machine = docSnap.data() || {};
    const id = docSnap.id;
    const ownerUid = (machine.ownerUid || "").toString().trim();
    const tagId = (machine.tagId || "").toString().trim();
    const status = (machine.status || "").toString().trim();
    if (!ownerUid) missingMachineOwner.push(machineLabel(id));
    else if (!authUids.has(ownerUid)) {
      unknownMachineOwner.push(machineLabel(id));
    }
    if (tagId) {
      if (!tagById.has(tagId)) machineMissingTag.push(machineLabel(id));
      if (!accessByTagId.has(tagId)) {
        machineMissingAccess.push(machineLabel(id));
      }
      const owners = machineTagOwners.get(tagId) || [];
      owners.push(machineLabel(id));
      machineTagOwners.set(tagId, owners);
    }
    if (status === "fuera_de_servicio") outOfServiceMachines += 1;
    else operationalMachines += 1;
    const tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
    pendingTasks += tasks.filter((task) => task?.completed !== true).length;
  });

  const duplicateMachineTags = Array.from(machineTagOwners.entries())
    .filter(([, owners]) => owners.length > 1)
    .map(([tagId, owners]) => `${tagId}: ${owners.join(", ")}`);
  const tagMissingMachine: string[] = [];
  const tagMachineMissing: string[] = [];
  const tagMachineMismatch: string[] = [];
  const tagOwnerMismatch: string[] = [];
  const tagMissingAccess: string[] = [];
  tagsSnap.forEach((docSnap) => {
    const tag = docSnap.data() || {};
    const tagId = docSnap.id;
    const machineId = (tag.machineId || "").toString().trim();
    if (!machineId) {
      if ((tag.state || "").toString().trim() === "assigned") {
        tagMissingMachine.push(tagId);
      }
      return;
    }
    const machine = machineById.get(machineId);
    if (!machine) {
      tagMachineMissing.push(tagId);
      return;
    }
    if ((machine.tagId || "").toString().trim() !== tagId) {
      tagMachineMismatch.push(`${tagId}: ${machineLabel(machineId)}`);
    }
    const tagOwner = (tag.ownerUid || tag.tenantId || "").toString().trim();
    const machineOwner = (machine.ownerUid || "").toString().trim();
    if (tagOwner && machineOwner && tagOwner !== machineOwner) {
      tagOwnerMismatch.push(`${tagId}: ${machineLabel(machineId)}`);
    }
    if (!accessByTagId.has(tagId)) tagMissingAccess.push(tagId);
  });

  const accessMissingTag: string[] = [];
  const accessMissingMachine: string[] = [];
  accessSnap.forEach((docSnap) => {
    const access = docSnap.data() || {};
    const tagId = docSnap.id;
    const machineId = (access.machineId || "").toString().trim();
    if (!tagById.has(tagId)) accessMissingTag.push(tagId);
    if (!machineId || !machineById.has(machineId)) {
      accessMissingMachine.push(tagId);
    }
  });

  const linkMachineMissing = linksSnap.docs
    .filter((docSnap) => {
      const machineId = (docSnap.data()?.machineId || "").toString().trim();
      return !machineId || !machineById.has(machineId);
    })
    .map((docSnap) => docSnap.id);
  const pendingInviteMachineMissing = invitesSnap.docs
    .filter((docSnap) => {
      const data = docSnap.data() || {};
      const machineId = (data.machineId || "").toString().trim();
      return data.status === "pending" &&
        (!machineId || !machineById.has(machineId));
    })
    .map((docSnap) => docSnap.id);
  const pendingTransferMachineMissing = transfersSnap.docs
    .filter((docSnap) => {
      const data = docSnap.data() || {};
      const machineId = (data.machineId || "").toString().trim();
      return data.status === "pending" &&
        (!machineId || !machineById.has(machineId));
    })
    .map((docSnap) => docSnap.id);

  addIssue("machine-missing-owner", missingMachineOwner);
  addIssue("machine-owner-not-in-auth", unknownMachineOwner);
  addIssue("machine-tag-missing", machineMissingTag);
  addIssue("machine-access-missing", machineMissingAccess);
  addIssue("duplicate-machine-tag", duplicateMachineTags);
  addIssue("assigned-tag-missing-machine", tagMissingMachine);
  addIssue("tag-machine-missing", tagMachineMissing);
  addIssue("tag-machine-mismatch", tagMachineMismatch);
  addIssue("tag-owner-mismatch", tagOwnerMismatch);
  addIssue("tag-access-missing", tagMissingAccess);
  addIssue("access-tag-missing", accessMissingTag);
  addIssue("access-machine-missing", accessMissingMachine);
  addIssue("admin-link-machine-missing", linkMachineMissing);
  addIssue("invite-machine-missing", pendingInviteMachineMissing);
  addIssue("transfer-machine-missing", pendingTransferMachineMissing);

  const handleByUid = new Map<string, string[]>();
  const userProfileByUid = new Map(
    usersSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() || {}]),
  );
  const handleMissingUser: string[] = [];
  const invalidHandle: string[] = [];
  const handleProfileMismatch: string[] = [];
  const reservedHandleBrokenRedirect: string[] = [];
  const handleDocs = new Map(
    accountHandlesSnap.docs.map((docSnap) => [
      docSnap.id,
      docSnap.data() || {},
    ]),
  );
  accountHandlesSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const handle = normalizeAccountHandle(data.handle || docSnap.id);
    const uid = (data.uid || "").toString().trim();
    const status = data.status === "reserved" ? "reserved" : "active";
    if (docSnap.id !== handle || getAccountHandleValidationError(handle)) {
      invalidHandle.push(docSnap.id);
    }
    if (!uid || !authUids.has(uid)) handleMissingUser.push(docSnap.id);
    if (status === "reserved") {
      const redirectTo = normalizeAccountHandle(data.redirectTo);
      const redirectData = handleDocs.get(redirectTo) || {};
      if (!redirectTo ||
          (redirectData.uid || "").toString().trim() !== uid) {
        reservedHandleBrokenRedirect.push(docSnap.id);
      }
      return;
    }
    if (uid) {
      const handles = handleByUid.get(uid) || [];
      handles.push(handle);
      handleByUid.set(uid, handles);
      const profileHandle = normalizeAccountHandle(
        userProfileByUid.get(uid)?.accountHandle,
      );
      if (profileHandle !== handle) {
        handleProfileMismatch.push(`${uid}: @${handle}`);
      }
    }
  });
  usersSnap.forEach((docSnap) => {
    const profileHandle = normalizeAccountHandle(docSnap.data()?.accountHandle);
    if (!profileHandle) return;
    const indexed = handleByUid.get(docSnap.id) || [];
    if (!indexed.includes(profileHandle)) {
      handleProfileMismatch.push(`${docSnap.id}: @${profileHandle}`);
    }
  });
  const duplicateAccountHandles = Array.from(handleByUid.entries())
    .filter(([, handles]) => handles.length > 1)
    .map(([uid, handles]) =>
      `${uid}: ${handles.map((item) => `@${item}`).join(", ")}`,
    );
  addIssue("account-handle-invalid", invalidHandle);
  addIssue("account-handle-user-missing", handleMissingUser);
  addIssue("account-handle-profile-mismatch", handleProfileMismatch);
  addIssue("account-handle-duplicate-user", duplicateAccountHandles);
  addIssue("account-handle-broken-redirect", reservedHandleBrokenRedirect);

  const issueCount = issues.reduce((total, issue) => total + issue.count, 0);
  const pendingTodos = todosSnap.docs.filter(
    (docSnap) => docSnap.data()?.completed !== true,
  ).length;
  const openSuggestions = suggestionsSnap.docs.filter(
    (docSnap) => docSnap.data()?.resolved !== true,
  ).length;
  const pendingInvites = invitesSnap.docs.filter(
    (docSnap) => docSnap.data()?.status === "pending",
  ).length;
  const pendingTransfers = transfersSnap.docs.filter(
    (docSnap) => docSnap.data()?.status === "pending",
  ).length;
  const queriedSnapshots = [
    machinesSnap,
    tagsSnap,
    accessSnap,
    linksSnap,
    invitesSnap,
    transfersSnap,
    todosSnap,
    suggestionsSnap,
    usersSnap,
    accountHandlesSnap,
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    services: {
      functions: "ok",
      firestore: "ok",
      authentication: "ok",
    },
    summary: {
      users: authUsers.length,
      accountHandles: accountHandlesSnap.size,
      machines: machinesSnap.size,
      operationalMachines,
      outOfServiceMachines,
      tags: tagsSnap.size,
      accessRecords: accessSnap.size,
      pendingTasks,
      pendingTodos,
      openSuggestions,
      pendingInvites,
      pendingTransfers,
    },
    integrity: {
      status: issueCount ? "warning" : "ok",
      issueCount,
      issues,
      storageObjectsChecked: false,
      scopeLimited: queriedSnapshots.some((snap) => snap.size >= queryLimit),
    },
  };
});

export const listControlPanelUsers = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const listAuthUsers = async () => {
    const users: Array<{
      uid: string;
      email: string;
      displayName: string;
    }> = [];
    let pageToken: string | undefined;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((user) => {
        users.push({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
        });
      });
      pageToken = page.pageToken;
    } while (pageToken);
    return users;
  };

  const [directorySnap, usersSnap, authUsers] = await Promise.all([
    accountDirectoryCol()
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
    db.collection("users")
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get(),
    listAuthUsers(),
  ]);

  const map = new Map<string, {
    uid: string;
    email: string;
    displayName: string;
    company: string;
    accountHandle: string;
    suggestionsCollaborator: boolean;
  }>();

  const upsertItem = (
    raw: {
      uid?: unknown;
      email?: unknown;
      displayName?: unknown;
      company?: unknown;
      accountHandle?: unknown;
      suggestionsCollaborator?: unknown;
    },
  ) => {
    const uid = (raw.uid || "").toString().trim();
    const email = (raw.email || "").toString().trim();
    const displayName = (raw.displayName || "").toString().trim();
    const company = (raw.company || "").toString().trim();
    const accountHandle = normalizeAccountHandle(raw.accountHandle);
    const key = uid || normalizeEmail(email);
    if (!key) return;
    const current = map.get(key);
    map.set(key, {
      uid: uid || (current?.uid || ""),
      email: email || (current?.email || ""),
      displayName: displayName || (current?.displayName || ""),
      company: company || (current?.company || ""),
      accountHandle: accountHandle || (current?.accountHandle || ""),
      suggestionsCollaborator:
        typeof raw.suggestionsCollaborator === "boolean" ?
          raw.suggestionsCollaborator :
          !!current?.suggestionsCollaborator,
    });
  };

  directorySnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  usersSnap.forEach((docSnap) => {
    upsertItem(docSnap.data() || {});
  });

  authUsers.forEach((user) => {
    upsertItem(user);
  });

  const items = Array.from(map.values()).sort((a, b) => {
    const left = (a.displayName || a.email || a.uid).toLowerCase();
    const right = (b.displayName || b.email || b.uid).toLowerCase();
    return left.localeCompare(right, "en");
  });

  return {ok: true, items};
});

export const setControlPanelUserCollaborator = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const uid = (request.data?.uid || "").toString().trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid-required");

  const enabled = request.data?.enabled === true;
  await db.collection("users").doc(uid).set(
    {
      suggestionsCollaborator: enabled,
      suggestionsCollaboratorUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      suggestionsCollaboratorUpdatedBy: auth.uid || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  return {ok: true, uid, suggestionsCollaborator: enabled};
});
