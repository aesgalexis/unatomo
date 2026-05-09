import { createHash } from "./hash.js";

const CONTROL_PANEL_EMAIL_HASH =
  "361be737851cc08e4a603606a25f7dc0649d8d75823f9e6244df97f14fd5ebd5";

const normalizeEmail = (email) => (email || "").toString().trim().toLowerCase();

export const getControlPanelPath = () =>
  /^\/nfc(?:\/|$)/i.test(window.location.pathname) ? "/nfc/controlpanel/" : "/controlpanel/";

export async function isControlPanelUser(userOrEmail) {
  const email =
    typeof userOrEmail === "string"
      ? userOrEmail
      : userOrEmail && typeof userOrEmail.email === "string"
        ? userOrEmail.email
        : "";
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const digest = await createHash(normalized);
  return digest === CONTROL_PANEL_EMAIL_HASH;
}
