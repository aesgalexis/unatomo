import {createHash} from "node:crypto";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {
  admin, db, emailOutboxCol, registrationCodesCol,
} from "../core/firebase";
import {assertControlPanelAccess, normalizeEmail} from "../core/auth";
import {generateRegistrationCode} from "../core/codes";
import {buildEmailOutbox} from "../email/outbox";

const requestsCol = () => db.collection("access_requests");
const REQUEST_COOLDOWN_MS = 60 * 60 * 1000;
const CODE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_IP_HOUR = 10;
const clean = (value: unknown, max: number) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, max);
const requestIdForEmail = (email: string) =>
  createHash("sha256").update(email).digest("hex");

export const requestAccountAccess = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email || "");
  const displayName = clean(request.data?.displayName, 120);
  const reason = clean(request.data?.reason, 500);
  const language = request.data?.language === "en" ? "en" : "es";
  if (!email || email.length > 320 || !displayName) {
    throw new HttpsError("invalid-argument", "name-email-required");
  }
  const existingUser = await admin.auth().getUserByEmail(email)
    .catch(() => null);
  if (existingUser) return {ok: true, accepted: false, alreadyRegistered: true};
  const requestRef = requestsCol().doc(requestIdForEmail(email));
  const ipHash = createHash("sha256")
    .update((request.rawRequest.ip || "unknown").toString())
    .digest("hex");
  const hourBucket = Math.floor(Date.now() / REQUEST_COOLDOWN_MS);
  const ipLimitRef = db.collection("email_request_limits")
    .doc(`access_${ipHash}_${hourBucket}`);
  const accepted = await db.runTransaction(async (transaction) => {
    const [snap, ipLimitSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(ipLimitRef),
    ]);
    const previous = snap.data() || {};
    const lastRequestedAt = previous.lastRequestedAt?.toMillis?.() || 0;
    if (previous.status === "pending" ||
        Date.now() - lastRequestedAt < REQUEST_COOLDOWN_MS) return false;
    const ipCount = Number(ipLimitSnap.data()?.count || 0);
    if (ipCount >= MAX_REQUESTS_PER_IP_HOUR) {
      throw new HttpsError("resource-exhausted", "request-limit-reached");
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    transaction.set(ipLimitRef, {
      type: "access_request",
      count: ipCount + 1,
      updatedAt: now,
    }, {merge: true});
    transaction.set(requestRef, {
      email,
      emailLower: email,
      displayName,
      reason,
      language,
      status: "pending",
      requestCount: admin.firestore.FieldValue.increment(1),
      createdAt: previous.createdAt || now,
      lastRequestedAt: now,
      updatedAt: now,
      reviewedAt: admin.firestore.FieldValue.delete(),
      reviewedBy: admin.firestore.FieldValue.delete(),
      registrationCode: admin.firestore.FieldValue.delete(),
    }, {merge: true});
    return true;
  });
  return {ok: true, accepted};
});

export const listControlPanelAccessRequests = onCall(async (request) => {
  assertControlPanelAccess(request.auth);
  const snap = await requestsCol().orderBy("lastRequestedAt", "desc")
    .limit(200).get();
  return {ok: true, items: snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      email: data.email || "",
      displayName: data.displayName || "",
      reason: data.reason || "",
      language: data.language === "en" ? "en" : "es",
      status: data.status || "pending",
      registrationCode: data.registrationCode || "",
      lastRequestedAt: data.lastRequestedAt?.toDate?.().toISOString() || "",
      reviewedAt: data.reviewedAt?.toDate?.().toISOString() || "",
    };
  })};
});

export const reviewControlPanelAccessRequest = onCall(async (request) => {
  const auth = request.auth;
  assertControlPanelAccess(auth);
  const requestId = clean(request.data?.requestId, 80);
  const decision = request.data?.decision === "approved" ?
    "approved" : request.data?.decision === "rejected" ? "rejected" : "";
  if (!requestId || !decision) {
    throw new HttpsError("invalid-argument", "request-decision-required");
  }
  const requestRef = requestsCol().doc(requestId);
  if (decision === "rejected") {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists) throw new HttpsError("not-found", "request-not-found");
      if (snap.data()?.status !== "pending") {
        throw new HttpsError("failed-precondition", "request-not-pending");
      }
      transaction.update(requestRef, {
        status: "rejected",
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewedBy: auth?.uid || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    return {ok: true, status: "rejected"};
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateRegistrationCode();
    const codeRef = registrationCodesCol().doc(code);
    try {
      await db.runTransaction(async (transaction) => {
        const [requestSnap, codeSnap] = await Promise.all([
          transaction.get(requestRef), transaction.get(codeRef),
        ]);
        if (!requestSnap.exists) {
          throw new HttpsError("not-found", "request-not-found");
        }
        const data = requestSnap.data() || {};
        if (data.status !== "pending") {
          throw new HttpsError("failed-precondition", "request-not-pending");
        }
        if (codeSnap.exists) throw new Error("code-collision");
        const requestedEmail = normalizeEmail(data.email || "");
        const existingUser = requestedEmail ?
          await admin.auth().getUserByEmail(requestedEmail)
            .catch(() => null) : null;
        if (existingUser) {
          throw new HttpsError("failed-precondition", "account-already-exists");
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        const expiresAt = admin.firestore.Timestamp.fromMillis(
          Date.now() + CODE_LIFETIME_MS,
        );
        transaction.set(codeRef, {
          active: true,
          accessRequestId: requestId,
          emailLower: requestedEmail,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        });
        transaction.update(requestRef, {
          status: "approved",
          registrationCode: code,
          reviewedAt: now,
          reviewedBy: auth?.uid || "",
          updatedAt: now,
        });
        transaction.create(
          emailOutboxCol().doc(`access_approved_${requestId}_${code}`),
          buildEmailOutbox({
            type: "registration_code_approved",
            to: data.email,
            language: data.language === "en" ? "en" : "es",
            data: {
              displayName: data.displayName || "",
              code,
              expiresText: data.language === "en" ? "7 days" : "7 días",
              actionUrl: `https://unatomo.com/nfc/${
                data.language === "en" ? "en" : "es"
              }/auth/registro.html?code=${encodeURIComponent(code)}`,
            },
            idempotencyKey: `access-approved/${requestId}/${code}`,
          }),
        );
      });
      return {ok: true, status: "approved", code};
    } catch (error) {
      if (error instanceof Error && error.message === "code-collision") {
        continue;
      }
      throw error;
    }
  }
  throw new HttpsError("resource-exhausted", "could-not-generate-code");
});
