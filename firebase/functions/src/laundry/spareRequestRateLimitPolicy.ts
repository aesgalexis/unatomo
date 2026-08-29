import {HttpsError} from "firebase-functions/v2/https";

const MAX_REQUESTS_PER_IP_HOUR = 6;

export const nextSpareRequestRateLimitCount = (current: unknown) => {
  const count = Number(current || 0);
  if (count >= MAX_REQUESTS_PER_IP_HOUR) {
    throw new HttpsError("resource-exhausted", "request-limit-reached");
  }
  return count + 1;
};
