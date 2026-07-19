import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {admin, db, machinesCol} from "../core/firebase";

const PUBLIC_METRICS_COLLECTION = "public_metrics";
const NFC_METRICS_DOCUMENT = "nfc";
const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const CALLABLE_OPTIONS = {enforceAppCheck: APP_CHECK_ENFORCED};

type LandingStats = {
  machines: number;
  registeredUsers: number;
  linkedTags: number;
};

const metricsRef = () =>
  db.collection(PUBLIC_METRICS_COLLECTION).doc(NFC_METRICS_DOCUMENT);

const toSafeCount = (value: unknown) => {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

const readExistingStats = async (): Promise<LandingStats | null> => {
  const snapshot = await metricsRef().get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const machines = toSafeCount(data.machines);
  const registeredUsers = toSafeCount(data.registeredUsers);
  const linkedTags = toSafeCount(data.linkedTags);
  if (machines == null || registeredUsers == null || linkedTags == null) {
    return null;
  }
  return {machines, registeredUsers, linkedTags};
};

const calculateLandingStats = async (): Promise<LandingStats> => {
  const [machinesSnap, usersSnap, linkedTagsSnap] = await Promise.all([
    machinesCol().count().get(),
    db.collection("users").count().get(),
    machinesCol().where("tagId", ">", "").count().get(),
  ]);
  return {
    machines: machinesSnap.data().count,
    registeredUsers: usersSnap.data().count,
    linkedTags: linkedTagsSnap.data().count,
  };
};

const saveLandingStats = async (stats: LandingStats) => {
  await metricsRef().set({
    ...stats,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    schemaVersion: 1,
  });
  return stats;
};

export const refreshPublicNfcLandingStats = onSchedule(
  "every 6 hours",
  async () => {
    await saveLandingStats(await calculateLandingStats());
  },
);

export const getPublicNfcLandingStats = onCall(
  CALLABLE_OPTIONS,
  async () => {
    const existing = await readExistingStats();
    const stats = existing || await saveLandingStats(
      await calculateLandingStats(),
    );
    return {ok: true, ...stats};
  },
);
