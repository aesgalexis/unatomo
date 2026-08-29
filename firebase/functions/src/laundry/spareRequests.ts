import {logger} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import {resendApiKey} from "../email/resend";
import {sendLaundryEmail} from "./spareRequestDelivery";
import {enforceSpareRequestRateLimit} from "./spareRequestRateLimit";
import {deliverLaundrySpareRequest} from "./spareRequestWorkflow";
import {
  assertRequiredFields,
  clean,
  normalizeRequest,
  validateImages,
} from "./spareRequestValidation";

export {
  renderLaundrySpareConfirmation,
  renderLaundrySpareEmail,
} from "./spareRequestEmails";

const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";

export const submitLaundrySpareRequest = onCall({
  enforceAppCheck: APP_CHECK_ENFORCED,
  secrets: [resendApiKey],
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 5,
}, async (callableRequest) => {
  const rawData = callableRequest.data &&
    typeof callableRequest.data === "object" ?
    callableRequest.data as Record<string, unknown> : {};
  if (clean(rawData.website, 200)) {
    return {ok: true, accepted: false};
  }

  const request = normalizeRequest(rawData);
  assertRequiredFields(request);
  validateImages(request.images);
  const ip = (callableRequest.rawRequest.ip || "unknown").toString();
  await enforceSpareRequestRateLimit(ip);

  const delivery = await deliverLaundrySpareRequest(request, sendLaundryEmail);
  if (!delivery.confirmationSent) {
    logger.warn("Laundry spare request accepted without confirmation email", {
      submissionId: request.submissionId,
    });
  }

  return {
    ok: true,
    accepted: true,
    confirmationSent: delivery.confirmationSent,
    requestId: request.submissionId.slice(0, 8).toUpperCase(),
  };
});
