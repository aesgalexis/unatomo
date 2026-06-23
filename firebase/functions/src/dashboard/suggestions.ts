import {HttpsError, onCall} from "firebase-functions/v2/https";
import {
  assertControlPanelAccess,
  isControlPanelAuth,
  normalizeEmail,
} from "../core/auth";
import {admin, dashboardSuggestionsCol, db} from "../core/firebase";

export const createDashboardSuggestion = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const userRef = db.collection("users").doc(auth.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const canSuggest =
    isControlPanelAuth(auth) || userData.suggestionsCollaborator === true;
  if (!canSuggest) {
    throw new HttpsError("permission-denied", "suggestions-disabled");
  }

  const text = (request.data?.text || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
  if (!text) throw new HttpsError("invalid-argument", "text-required");
  const replyToSuggestionId = (request.data?.replyToSuggestionId || "")
    .toString()
    .trim();

  const now = admin.firestore.FieldValue.serverTimestamp();
  const nowIso = new Date().toISOString();
  const authorEmail = normalizeEmail(auth.token?.email || userData.email || "");
  const authorName = (
    auth.token?.name ||
    userData.displayName ||
    authorEmail ||
    ""
  ).toString().trim();

  if (replyToSuggestionId) {
    const ref = dashboardSuggestionsCol().doc(replyToSuggestionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "suggestion-not-found");
    }
    const suggestion = snap.data() || {};
    if (!isControlPanelAuth(auth) && suggestion.authorUid !== auth.uid) {
      throw new HttpsError("permission-denied", "not-suggestion-author");
    }
    const reply = {
      id: dashboardSuggestionsCol().doc().id,
      text,
      authorUid: auth.uid,
      authorEmail,
      authorName,
      createdAt: nowIso,
    };
    await ref.set(
      {
        replies: admin.firestore.FieldValue.arrayUnion(reply),
        updatedAt: now,
        lastActivityAt: now,
      },
      {merge: true},
    );
    return {ok: true, id: ref.id, replyId: reply.id};
  }

  const ref = dashboardSuggestionsCol().doc();
  await ref.set({
    text,
    authorUid: auth.uid,
    authorEmail,
    authorName,
    replies: [],
    resolved: false,
    resolvedAt: "",
    resolvedByUid: "",
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  return {ok: true, id: ref.id};
});

export const updateDashboardSuggestionResolved = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const suggestionId = (request.data?.suggestionId || "").toString().trim();
  if (!suggestionId) {
    throw new HttpsError("invalid-argument", "suggestionId-required");
  }
  const resolved = request.data?.resolved === true;
  await dashboardSuggestionsCol().doc(suggestionId).set(
    {
      resolved,
      resolvedAt: resolved ? admin.firestore.FieldValue.serverTimestamp() : "",
      resolvedByUid: resolved ? auth.uid : "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );
  return {ok: true, suggestionId, resolved};
});

export const deleteDashboardSuggestion = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  assertControlPanelAccess(auth);

  const suggestionId = (request.data?.suggestionId || "").toString().trim();
  if (!suggestionId) {
    throw new HttpsError("invalid-argument", "suggestionId-required");
  }
  await dashboardSuggestionsCol().doc(suggestionId).delete();
  return {ok: true, suggestionId};
});

export const listDashboardSuggestions = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");

  const userSnap = await db.collection("users").doc(auth.uid).get();
  const userData = userSnap.data() || {};
  const isSuperadmin = isControlPanelAuth(auth);
  const canSuggest =
    isSuperadmin || userData.suggestionsCollaborator === true;
  if (!canSuggest) {
    return {
      ok: true,
      canSuggest: false,
      isSuperadmin,
      items: [],
      suggestionsSeenAt: "",
    };
  }

  const rawLimit = Number(request.data?.limit || 254);
  const limit = Math.max(1, Math.min(500, Math.floor(rawLimit)));
  let query: FirebaseFirestore.Query = dashboardSuggestionsCol()
    .orderBy("createdAt", "desc")
    .limit(limit);
  if (!isSuperadmin) {
    query = dashboardSuggestionsCol()
      .where("authorUid", "==", auth.uid)
      .limit(limit);
  }

  const [suggestionsSnap, layoutSnap] = await Promise.all([
    query.get(),
    db.collection("dashboard_layout").doc(auth.uid).get(),
  ]);
  const items = suggestionsSnap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      text: data.text || "",
      authorUid: data.authorUid || "",
      authorEmail: data.authorEmail || "",
      authorName: data.authorName || "",
      resolved: data.resolved === true,
      resolvedAt: data.resolvedAt?.toDate?.()?.toISOString?.() ||
        data.resolvedAt || "",
      resolvedByUid: data.resolvedByUid || "",
      replies: Array.isArray(data.replies) ? data.replies.map((reply) => ({
        id: (reply.id || "").toString(),
        text: (reply.text || "").toString(),
        authorUid: (reply.authorUid || "").toString(),
        authorEmail: (reply.authorEmail || "").toString(),
        authorName: (reply.authorName || "").toString(),
        createdAt: (reply.createdAt || "").toString(),
      })) : [],
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
      lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString?.() ||
        data.createdAt?.toDate?.()?.toISOString?.() || "",
    };
  }).sort((a, b) => {
    const left = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const right = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return right - left;
  });

  return {
    ok: true,
    canSuggest,
    isSuperadmin,
    items,
    suggestionsSeenAt: layoutSnap.data()?.suggestionsSeenAt || "",
  };
});

export const markDashboardSuggestionsSeen = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  if (!isControlPanelAuth(auth)) return {ok: true};

  const seenAt = new Date().toISOString();
  await db.collection("dashboard_layout").doc(auth.uid).set(
    {
      suggestionsSeenAt: seenAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    {merge: true},
  );
  return {ok: true, suggestionsSeenAt: seenAt};
});

