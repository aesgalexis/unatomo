import {logger} from "firebase-functions";
import {HttpsError} from "firebase-functions/v2/https";
import {resendApiKey} from "../email/resend";
import {ResendPayload} from "./spareRequestTypes";
import {clean} from "./spareRequestValidation";

export const sendLaundryEmail = async (
  payload: ResendPayload,
  idempotencyKey: string,
  logLabel: string,
) => {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey.value()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.error(`${logLabel} network error`, {error});
    throw new HttpsError("unavailable", "email-send-failed");
  }
  const body = await response.json().catch(() => ({})) as {
    id?: unknown;
    message?: unknown;
  };
  if (!response.ok) {
    logger.error(`${logLabel} rejected by Resend`, {
      status: response.status,
      message: clean(body.message, 500),
    });
    throw new HttpsError("unavailable", "email-send-failed");
  }
};
