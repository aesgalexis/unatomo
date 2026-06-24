import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {normalizeAccountHandle} from "../core/accountHandles";
import {isControlPanelAuth, normalizeEmail} from "../core/auth";
import {
  accountHandlesCol,
  dashboardTodosCol,
  db,
} from "../core/firebase";

const canUseDashboardTodo = async (auth: {
  uid?: string;
  token?: {email?: string | null};
} | null | undefined) => {
  if (isControlPanelAuth(auth)) return {allowed: true, isSuperadmin: true};
  const userSnap = await db.collection("users").doc(auth?.uid || "").get();
  const userData = userSnap.data() || {};
  return {
    allowed: userData.suggestionsCollaborator === true,
    isSuperadmin: false,
  };
};

type DashboardTodoPerson = {
  uid: string;
  email: string;
  displayName: string;
  mention: string;
};

const getTodoMention = (email: string) =>
  normalizeEmail(email).split("@")[0] || "";

const toDashboardTodoPerson = (
  user: admin.auth.UserRecord,
  accountHandle = "",
) => ({
  uid: user.uid,
  email: normalizeEmail(user.email || ""),
  displayName: (user.displayName || user.email || "").toString().trim(),
  mention: normalizeAccountHandle(accountHandle) ||
    getTodoMention(user.email || ""),
});

const getAccountHandleForUid = async (uid: string) => {
  const snap = await db.collection("users").doc(uid).get();
  return normalizeAccountHandle(snap.data()?.accountHandle);
};

const getAccountHandlesForUids = async (uids: string[]) => {
  const uniqueUids = Array.from(new Set(uids.filter(Boolean)));
  const handles = new Map<string, string>();
  for (let index = 0; index < uniqueUids.length; index += 100) {
    const chunk = uniqueUids.slice(index, index + 100);
    const snaps = await db.getAll(
      ...chunk.map((uid) => db.collection("users").doc(uid)),
    );
    snaps.forEach((snap) => {
      const handle = normalizeAccountHandle(snap.data()?.accountHandle);
      if (handle) handles.set(snap.id, handle);
    });
  }
  return handles;
};

const canUserRecordUseDashboardTodo = async (
  user: admin.auth.UserRecord,
) => {
  if (isControlPanelAuth({token: {email: user.email || ""}})) return true;
  const snap = await db.collection("users").doc(user.uid).get();
  return snap.data()?.suggestionsCollaborator === true;
};

const resolveDashboardTodoMentions = async (
  mentions: string[],
  creatorUid: string,
) => {
  if (!mentions.length) return [] as DashboardTodoPerson[];
  if (mentions.length > 10) {
    throw new HttpsError("invalid-argument", "too-many-todo-mentions");
  }
  const wanted = new Set(mentions);
  const matches = new Map<string, admin.auth.UserRecord[]>();
  const resolvedHandles = await Promise.all(
    mentions.map(async (mention) => {
      const snap = await accountHandlesCol().doc(mention).get();
      const handleData = snap.data() || {};
      const uid = (handleData.uid || "").toString().trim();
      if (!snap.exists || !uid) {
        return null;
      }
      const user = await admin.auth().getUser(uid).catch(() => null);
      return user ? {mention, user} : null;
    }),
  );
  resolvedHandles.forEach((match) => {
    if (!match) return;
    matches.set(match.mention, [match.user]);
    wanted.delete(match.mention);
  });
  let pageToken: string | undefined;
  if (wanted.size) {
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((user) => {
        const mention = getTodoMention(user.email || "");
        if (!wanted.has(mention)) return;
        const current = matches.get(mention) || [];
        current.push(user);
        matches.set(mention, current);
      });
      pageToken = page.pageToken;
    } while (pageToken);
  }

  const people: DashboardTodoPerson[] = [];
  for (const mention of mentions) {
    const candidates = matches.get(mention) || [];
    if (candidates.length !== 1) {
      throw new HttpsError(
        candidates.length ? "failed-precondition" : "not-found",
        candidates.length ?
          "todo-mention-ambiguous" :
          "todo-mention-not-found",
      );
    }
    const user = candidates[0];
    if (user.uid === creatorUid) continue;
    if (!await canUserRecordUseDashboardTodo(user)) {
      throw new HttpsError("permission-denied", "todo-recipient-disabled");
    }
    const currentHandle = await getAccountHandleForUid(user.uid);
    people.push(toDashboardTodoPerson(user, currentHandle || mention));
  }
  return people;
};

const normalizeDashboardTodoPerson = (
  value: unknown,
): DashboardTodoPerson | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const uid = (raw.uid || "").toString().trim();
  if (!uid) return null;
  return {
    uid,
    email: normalizeEmail((raw.email || "").toString()),
    displayName: (raw.displayName || "").toString().trim(),
    mention: (raw.mention || "").toString().trim().toLowerCase(),
  };
};

export const listDashboardTodoCollaborators = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }

  const enabledSnap = await db.collection("users")
    .where("suggestionsCollaborator", "==", true)
    .get();
  const enabledUids = new Set(enabledSnap.docs.map((docSnap) => docSnap.id));
  const enabledProfiles = new Map(
    enabledSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() || {}]),
  );
  const eligibleUsers: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    page.users.forEach((user) => {
      if (user.uid === auth.uid) return;
      const isSuperadmin = isControlPanelAuth({
        token: {email: user.email || ""},
      });
      if (!enabledUids.has(user.uid) && !isSuperadmin) return;
      eligibleUsers.push(user);
    });
    pageToken = page.pageToken;
  } while (pageToken);

  const people = await Promise.all(eligibleUsers.map(async (user) => {
    const profile = enabledProfiles.get(user.uid);
    const accountHandle = normalizeAccountHandle(
      profile?.accountHandle || await getAccountHandleForUid(user.uid),
    );
    return toDashboardTodoPerson(user, accountHandle);
  }));

  people.sort((a, b) => {
    const left = (a.displayName || a.email || a.mention).toLowerCase();
    const right = (b.displayName || b.email || b.mention).toLowerCase();
    return left.localeCompare(right, "es");
  });
  return {ok: true, items: people};
});

export const listDashboardTodos = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    return {
      ok: true,
      canTodo: false,
      isSuperadmin: access.isSuperadmin,
      items: [],
    };
  }
  const rawLimit = Number(request.data?.limit || 254);
  const limit = Math.max(1, Math.min(500, Math.floor(rawLimit)));
  const [ownedSnap, sharedSnap] = await Promise.all([
    dashboardTodosCol()
      .where("ownerUid", "==", auth.uid)
      .limit(limit)
      .get(),
    dashboardTodosCol()
      .where("participantUids", "array-contains", auth.uid)
      .limit(limit)
      .get(),
  ]);
  const todoDocs = new Map<
    string,
    FirebaseFirestore.QueryDocumentSnapshot
  >();
  [...ownedSnap.docs, ...sharedSnap.docs].forEach((docSnap) => {
    todoDocs.set(docSnap.id, docSnap);
  });
  const participantUids = Array.from(todoDocs.values()).flatMap((docSnap) => {
    const data = docSnap.data() || {};
    const recipients = Array.isArray(data.sharedWith) ? data.sharedWith : [];
    return [
      (data.ownerUid || "").toString(),
      ...recipients.map((person) => (person?.uid || "").toString()),
    ];
  });
  const currentHandles = await getAccountHandlesForUids(participantUids);
  const items = Array.from(todoDocs.values()).map((docSnap) => {
    const data = docSnap.data() || {};
    const owner = normalizeDashboardTodoPerson(data.owner);
    const recipients = Array.isArray(data.sharedWith) ?
      data.sharedWith
        .map(normalizeDashboardTodoPerson)
        .filter((person): person is DashboardTodoPerson => !!person) :
      [];
    if (owner && currentHandles.has(owner.uid)) {
      owner.mention = currentHandles.get(owner.uid) || owner.mention;
    }
    recipients.forEach((person) => {
      if (currentHandles.has(person.uid)) {
        person.mention = currentHandles.get(person.uid) || person.mention;
      }
    });
    const sharedWith = data.ownerUid === auth.uid ?
      recipients :
      [owner, ...recipients]
        .filter((person): person is DashboardTodoPerson => !!person)
        .filter((person) => person.uid !== auth.uid);
    return {
      id: docSnap.id,
      text: data.text || "",
      ownerUid: data.ownerUid || "",
      canDelete: data.ownerUid === auth.uid,
      isShared: recipients.length > 0,
      sharedWith,
      completed: data.completed === true,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || "",
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() ||
        data.completedAt || "",
    };
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const left = a.updatedAt || a.createdAt;
    const right = b.updatedAt || b.createdAt;
    return new Date(right).getTime() - new Date(left).getTime();
  }).slice(0, limit);
  return {
    ok: true,
    canTodo: true,
    isSuperadmin: access.isSuperadmin,
    items,
  };
});

export const createDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const text: string = (request.data?.text || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
  if (!text) throw new HttpsError("invalid-argument", "text-required");
  const mentionMatches = text.match(
    /@[a-z0-9][a-z0-9._-]{0,63}/gi,
  ) || [];
  const mentions = mentionMatches
    .map((match) => match.slice(1).toLowerCase())
    .filter((mention, index, values) => values.indexOf(mention) === index);
  const recipients = await resolveDashboardTodoMentions(mentions, auth.uid);
  const storedText = text
    .replace(/@[a-z0-9][a-z0-9._-]{0,63}/gi, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!storedText) throw new HttpsError("invalid-argument", "text-required");
  const [creatorRecord, creatorHandle] = await Promise.all([
    admin.auth().getUser(auth.uid),
    getAccountHandleForUid(auth.uid),
  ]);
  const owner = toDashboardTodoPerson(creatorRecord, creatorHandle);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = dashboardTodosCol().doc();
  await ref.set({
    text: storedText,
    ownerUid: auth.uid,
    owner,
    participantUids: [auth.uid, ...recipients.map((person) => person.uid)],
    sharedWith: recipients,
    completed: false,
    completedAt: "",
    createdAt: now,
    updatedAt: now,
  });
  return {ok: true, id: ref.id};
});

export const updateDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const todoId = (request.data?.todoId || "").toString().trim();
  if (!todoId) throw new HttpsError("invalid-argument", "todoId-required");
  const ref = dashboardTodosCol().doc(todoId);
  const completed = request.data?.completed === true;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "todo-not-found");
    const todo = snap.data() || {};
    const participantUids = Array.isArray(todo.participantUids) ?
      todo.participantUids :
      [];
    if (todo.ownerUid !== auth.uid && !participantUids.includes(auth.uid)) {
      throw new HttpsError("permission-denied", "not-todo-participant");
    }
    tx.set(
      ref,
      {
        completed,
        completedByUid: completed ? auth.uid : "",
        completedAt: completed ?
          admin.firestore.FieldValue.serverTimestamp() :
          "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  });
  return {ok: true, todoId, completed};
});

export const deleteDashboardTodo = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const access = await canUseDashboardTodo(auth);
  if (!access.allowed) {
    throw new HttpsError("permission-denied", "todo-disabled");
  }
  const todoId = (request.data?.todoId || "").toString().trim();
  if (!todoId) throw new HttpsError("invalid-argument", "todoId-required");
  const ref = dashboardTodosCol().doc(todoId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    if ((snap.data()?.ownerUid || "") !== auth.uid) {
      throw new HttpsError("permission-denied", "not-todo-owner");
    }
    tx.delete(ref);
  });
  return {ok: true, todoId};
});
