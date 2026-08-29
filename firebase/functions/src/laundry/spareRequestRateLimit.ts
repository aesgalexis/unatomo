import {createHash} from "node:crypto";
import {admin, db} from "../core/firebase";
import {nextSpareRequestRateLimitCount} from "./spareRequestRateLimitPolicy";

export const enforceSpareRequestRateLimit = async (ip: string) => {
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const ref = db.collection("email_request_limits")
    .doc(`laundry_spare_${ipHash}_${hourBucket}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const nextCount = nextSpareRequestRateLimitCount(snapshot.data()?.count);
    transaction.set(ref, {
      type: "laundry_spare_request",
      count: nextCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  });
};
