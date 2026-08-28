import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {admin, db} from "../core/firebase";

const MAX_REQUESTS_PER_IP_HOUR = 6;

export const enforceSpareRequestRateLimit = async (ip: string) => {
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const ref = db.collection("email_request_limits")
    .doc(`laundry_spare_${ipHash}_${hourBucket}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = Number(snapshot.data()?.count || 0);
    if (count >= MAX_REQUESTS_PER_IP_HOUR) {
      throw new HttpsError("resource-exhausted", "request-limit-reached");
    }
    transaction.set(ref, {
      type: "laundry_spare_request",
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  });
};
