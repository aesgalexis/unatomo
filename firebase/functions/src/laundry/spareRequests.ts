import {onCall} from "firebase-functions/v2/https";
import {resendApiKey} from "../email/resend";
import {sendLaundryEmail} from "./spareRequestDelivery";
import {
  renderLaundrySpareConfirmation,
  renderLaundrySpareEmail,
  REQUEST_DESTINATION,
  VERIFIED_SENDER,
} from "./spareRequestEmails";
import {enforceSpareRequestRateLimit} from "./spareRequestRateLimit";
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

  const rendered = renderLaundrySpareEmail(request);
  await sendLaundryEmail({
    from: VERIFIED_SENDER,
    reply_to: request.email,
    to: [REQUEST_DESTINATION],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: request.images.map((image) => ({
      filename: image.name,
      content: image.content,
    })),
    tags: [{name: "category", value: "laundry_spare_request"}],
  }, `laundry-spare/internal/${request.submissionId}`,
  "Laundry spare notification");

  const confirmation = renderLaundrySpareConfirmation(request);
  await sendLaundryEmail({
    from: VERIFIED_SENDER,
    reply_to: REQUEST_DESTINATION,
    to: [request.email],
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text,
    tags: [{name: "category", value: "laundry_spare_confirmation"}],
  }, `laundry-spare/confirmation/${request.submissionId}`,
  "Laundry spare confirmation");

  return {
    ok: true,
    accepted: true,
    requestId: request.submissionId.slice(0, 8).toUpperCase(),
  };
});
