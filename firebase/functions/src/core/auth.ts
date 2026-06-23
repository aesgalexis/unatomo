import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";

const CONTROL_PANEL_EMAIL_HASH =
  "361be737851cc08e4a603606a25f7dc0649d8d75823f9e6244df97f14fd5ebd5";

export const normalizeEmail = (email: string) =>
  (email || "").toString().trim().toLowerCase();

const hashEmail = (email: string) =>
  createHash("sha256").update(normalizeEmail(email)).digest("hex");

export const isControlPanelAuth = (auth: {
  token?: {email?: string | null};
} | null | undefined) => {
  const email = (auth?.token?.email || "").toString();
  return !!email && hashEmail(email) === CONTROL_PANEL_EMAIL_HASH;
};

export const assertControlPanelAccess = (auth: {
  token?: {email?: string | null};
} | null | undefined) => {
  if (!isControlPanelAuth(auth)) {
    throw new HttpsError("permission-denied", "not-allowed");
  }
};
