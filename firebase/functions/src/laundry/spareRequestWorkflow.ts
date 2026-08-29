import {
  renderLaundrySpareConfirmation,
  renderLaundrySpareEmail,
  REQUEST_DESTINATION,
  VERIFIED_SENDER,
} from "./spareRequestEmails";
import {ResendPayload, SpareRequest} from "./spareRequestTypes";

type EmailSender = (
  payload: ResendPayload,
  idempotencyKey: string,
  logLabel: string,
) => Promise<void>;

export const deliverLaundrySpareRequest = async (
  request: SpareRequest,
  deliver: EmailSender,
) => {
  const rendered = renderLaundrySpareEmail(request);
  await deliver({
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
  try {
    await deliver({
      from: VERIFIED_SENDER,
      reply_to: REQUEST_DESTINATION,
      to: [request.email],
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
      tags: [{name: "category", value: "laundry_spare_confirmation"}],
    }, `laundry-spare/confirmation/${request.submissionId}`,
    "Laundry spare confirmation");
    return {confirmationSent: true};
  } catch {
    return {confirmationSent: false};
  }
};
