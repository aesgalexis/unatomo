/* eslint-disable max-len */
import {createHash} from "node:crypto";
import {logger} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {admin, db} from "../core/firebase";
import {resendApiKey} from "../email/resend";

const APP_CHECK_ENFORCED = process.env.ENFORCE_APP_CHECK === "true";
const MAX_REQUESTS_PER_IP_HOUR = 6;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_DESTINATION = "info@unatomo.com";
const VERIFIED_SENDER = "Unatomo <cuenta@correo.unatomo.com>";
const LAUNDRY_URL = "https://unatomo.com/laundryservices/";
const LAUNDRY_LOGO_URL =
  "https://unatomo.com/static/img/logo-unatomo-round-v1.0.png";
const LAUNDRY_BLUE = "#2563eb";
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ImageInput = {
  name: string;
  type: string;
  content: string;
};

type SpareRequest = {
  submissionId: string;
  language: "es" | "en";
  manufacturer: string;
  allianceBrand: string;
  category: string;
  model: string;
  spareName: string;
  partReference: string;
  quantity: number;
  description: string;
  contactName: string;
  email: string;
  phone: string;
  legalName: string;
  taxId: string;
  country: string;
  fiscalAddress: string;
  postalCode: string;
  city: string;
  province: string;
  privacyAccepted: boolean;
  images: ImageInput[];
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type ResendPayload = {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{filename: string; content: string}>;
  tags: Array<{name: string; value: string}>;
};

const clean = (value: unknown, max: number) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, max);

const cleanMultiline = (value: unknown, max: number) =>
  (value || "").toString().trim().replace(/\r\n/g, "\n").slice(0, max);

const escapeHtml = (value: unknown) => (value || "").toString()
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const normalizeEmail = (value: unknown) => clean(value, 320).toLowerCase();

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeImageName = (value: unknown, index: number) => {
  const fallback = `placa-${index + 1}.jpg`;
  const name = clean(value, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  return name && !name.startsWith(".") ? name : fallback;
};

const normalizeRequest = (data: Record<string, unknown>): SpareRequest => ({
  submissionId: clean(data.submissionId, 80),
  language: data.language === "en" ? "en" : "es",
  manufacturer: clean(data.manufacturer, 120),
  allianceBrand: clean(data.allianceBrand, 120),
  category: clean(data.category, 120),
  model: clean(data.model, 160),
  spareName: clean(data.spareName, 200),
  partReference: clean(data.partReference, 160),
  quantity: Math.min(99, Math.max(1, Number(data.quantity) || 1)),
  description: cleanMultiline(data.description, 3000),
  contactName: clean(data.contactName, 160),
  email: normalizeEmail(data.email),
  phone: clean(data.phone, 80),
  legalName: clean(data.legalName, 200),
  taxId: clean(data.taxId, 80),
  country: clean(data.country, 120),
  fiscalAddress: clean(data.fiscalAddress, 240),
  postalCode: clean(data.postalCode, 40),
  city: clean(data.city, 120),
  province: clean(data.province, 120),
  privacyAccepted: data.privacyAccepted === true,
  images: Array.isArray(data.images) ? data.images.map((image, index) => {
    const candidate = image && typeof image === "object" ?
      image as Record<string, unknown> : {};
    return {
      name: normalizeImageName(candidate.name, index),
      type: clean(candidate.type, 80).toLowerCase(),
      content: (candidate.content || "").toString(),
    };
  }) : [],
});

const assertRequiredFields = (request: SpareRequest) => {
  const required = [
    request.submissionId,
    request.manufacturer,
    request.category,
    request.model,
    request.spareName,
    request.contactName,
    request.email,
    request.legalName,
    request.taxId,
    request.country,
    request.fiscalAddress,
    request.postalCode,
    request.city,
  ];
  if (required.some((value) => !value) || !request.privacyAccepted) {
    throw new HttpsError("invalid-argument", "required-fields-missing");
  }
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(request.submissionId) ||
      !isEmail(request.email)) {
    throw new HttpsError("invalid-argument", "invalid-request-data");
  }
};

const hasExpectedSignature = (buffer: Buffer, type: string) => {
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff &&
      buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]));
  }
  return buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
};

const validateImages = (images: ImageInput[]) => {
  if (!images.length || images.length > MAX_IMAGES) {
    throw new HttpsError("invalid-argument", "invalid-image-count");
  }
  let totalBytes = 0;
  images.forEach((image) => {
    const maxBase64Length = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4;
    if (!ALLOWED_IMAGE_TYPES.has(image.type) ||
        !image.content || image.content.length > maxBase64Length ||
        !/^[a-zA-Z0-9+/]+={0,2}$/.test(image.content)) {
      throw new HttpsError("invalid-argument", "invalid-image");
    }
    const buffer = Buffer.from(image.content, "base64");
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES ||
        !hasExpectedSignature(buffer, image.type)) {
      throw new HttpsError("invalid-argument", "invalid-image");
    }
    totalBytes += buffer.length;
  });
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "images-too-large");
  }
};

const enforceRateLimit = async (ip: string) => {
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

const row = (label: string, value: unknown) => `
  <tr>
    <th style="padding:8px 12px;text-align:left;vertical-align:top;` +
  "border-bottom:1px solid #e5e7eb;color:#334155;width:190px\">" +
  `${escapeHtml(label)}</th>
    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;` +
  `color:#0f172a">${escapeHtml(value || "—")}</td>
  </tr>`;

export const renderLaundrySpareEmail = (request: SpareRequest) => {
  const model = request.allianceBrand ?
    `${request.allianceBrand} · ${request.model}` : request.model;
  const address = [
    request.fiscalAddress,
    request.postalCode,
    request.city,
    request.province,
    request.country,
  ].filter(Boolean).join(", ");
  const rows = [
    row("Fabricante / marca", request.manufacturer),
    row("Tipo de máquina", request.category),
    row("Modelo / familia", model),
    row("Recambio solicitado", request.spareName),
    row("Referencia", request.partReference),
    row("Cantidad", request.quantity),
    row("Nombre de contacto", request.contactName),
    row("Correo", request.email),
    row("Teléfono", request.phone),
    row("Razón social", request.legalName),
    row("CIF / NIF / VAT", request.taxId),
    row("Dirección fiscal", address),
  ].join("");
  const description = request.description ? `
    <h2 style="font-size:16px;margin:24px 0 8px;color:#0f172a">Detalles</h2>
    <div style="white-space:pre-wrap;padding:14px;background:#f8fafc;` +
    "border-radius:10px;color:#334155\">" +
    `${escapeHtml(request.description)}</div>` : "";
  const reference = request.submissionId.slice(0, 8).toUpperCase();
  return {
    subject: `[Recambios ${reference}] ${request.manufacturer} · ` +
      request.spareName,
    html: "<!doctype html><html><body style=\"margin:0;background:#f1f5f9;" +
      "font-family:Arial,sans-serif\"><div style=\"max-width:760px;" +
      "margin:0 auto;padding:28px\"><div style=\"background:#fff;" +
      "border-radius:14px;padding:28px\"><p style=\"margin:0 0 6px;" +
      "color:#64748b\">" +
      `Solicitud ${reference}</p><h1 style="margin:0 0 22px;font-size:24px;` +
      "color:#0f172a\">Nueva solicitud de recambio</h1>" +
      `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
      `${description}<p style="margin:24px 0 0;color:#64748b;font-size:13px">` +
      `${request.images.length} foto(s) de la placa adjunta(s). Responde a ` +
      `este correo para contactar con ${escapeHtml(request.contactName)}.` +
      "</p></div></div></body></html>",
    text: [
      `Nueva solicitud de recambio ${reference}`,
      `Fabricante / marca: ${request.manufacturer}`,
      `Tipo de máquina: ${request.category}`,
      `Modelo / familia: ${model}`,
      `Recambio: ${request.spareName}`,
      `Referencia: ${request.partReference || "—"}`,
      `Cantidad: ${request.quantity}`,
      `Detalles: ${request.description || "—"}`,
      `Contacto: ${request.contactName}`,
      `Correo: ${request.email}`,
      `Teléfono: ${request.phone || "—"}`,
      `Razón social: ${request.legalName}`,
      `CIF / NIF / VAT: ${request.taxId}`,
      `Dirección fiscal: ${address}`,
      `Fotos de placa adjuntas: ${request.images.length}`,
    ].join("\n"),
  };
};

export const renderLaundrySpareConfirmation = (
  request: SpareRequest,
): RenderedEmail => {
  const en = request.language === "en";
  const reference = request.submissionId.slice(0, 8).toUpperCase();
  const name = escapeHtml(request.contactName);
  const machine = [
    request.manufacturer,
    request.allianceBrand,
    request.model,
  ].filter(Boolean).join(" · ");
  const subject = en ?
    `We received your spare-part request · ${reference}` :
    `Hemos recibido tu solicitud de recambio · ${reference}`;
  const title = en ?
    "We have received your request" :
    "Hemos recibido tu solicitud";
  const greeting = en ? `Hello ${name},` : `Hola ${name},`;
  const firstParagraph = en ?
    "Thank you for contacting UNATOMO Laundry Services. Your request has " +
      "been registered successfully." :
    "Gracias por contactar con UNATOMO Laundry Services. Tu solicitud se " +
      "ha registrado correctamente.";
  const secondParagraph = en ?
    "Our team will review the data-plate photographs and the information " +
      "provided. We will contact you if we need any clarification." :
    "Nuestro equipo revisará las fotografías de la placa y la información " +
      "facilitada. Contactaremos contigo si necesitamos alguna aclaración.";
  const referenceLabel = en ? "Request reference" : "Referencia de solicitud";
  const machineLabel = en ? "Machine" : "Máquina";
  const spareLabel = en ? "Requested spare part" : "Recambio solicitado";
  const quantityLabel = en ? "Quantity" : "Cantidad";
  const buttonLabel = en ?
    "Visit Laundry Services" :
    "Ir a Laundry Services";
  const footer = en ?
    "This email confirms receipt of your request. You can reply if you " +
      "need to add any information." :
    "Este correo confirma la recepción de tu solicitud. Puedes responder " +
      "si necesitas añadir información.";
  const summaryRow = (label: string, value: unknown) =>
    `<tr><td style="padding:7px 0;color:#64748b;font-size:14px;vertical-align:top">${escapeHtml(label)}</td>` +
    `<td style="padding:7px 0 7px 18px;color:#17201d;font-size:14px;font-weight:600;text-align:right">${escapeHtml(value)}</td></tr>`;
  const summary = [
    summaryRow(machineLabel, machine),
    summaryRow(spareLabel, request.spareName),
    summaryRow(quantityLabel, request.quantity),
  ].join("");

  const html = `<!doctype html>
<html lang="${request.language}"><body style="margin:0;background:#f5f7f6;color:#17201d;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(subject)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e1e7e4;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 36px 12px"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td><img src="${LAUNDRY_LOGO_URL}" width="54" height="54" alt="Unatomo" style="display:block;border:0"></td>
<td style="padding-left:16px;color:#4b5563;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">UNATOMO <span style="color:#9ca3af">/</span> Laundry Services</td>
</tr></table></td></tr>
<tr><td style="padding:12px 36px 36px">
<p style="margin:0 0 8px;color:${LAUNDRY_BLUE};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${referenceLabel} ${reference}</p>
<h1 style="margin:0 0 22px;font-size:28px;line-height:1.2;color:#17201d">${title}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${greeting}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${firstParagraph}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6">${secondParagraph}</p>
<div style="margin:22px 0;padding:10px 18px;border-radius:10px;background:#f1f5f9">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${summary}</table>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px"><tr><td style="border-radius:9px;background:${LAUNDRY_BLUE}">
<a href="${LAUNDRY_URL}" style="display:inline-block;padding:11px 19px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${buttonLabel}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 36px;background:#eef3f1;color:#53615c;font-size:13px;line-height:1.5">${footer}<br>
<a href="${LAUNDRY_URL}" style="color:${LAUNDRY_BLUE}">unatomo.com/laundryservices</a>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    greeting,
    "",
    firstParagraph,
    secondParagraph,
    "",
    `${referenceLabel}: ${reference}`,
    `${machineLabel}: ${machine}`,
    `${spareLabel}: ${request.spareName}`,
    `${quantityLabel}: ${request.quantity}`,
    "",
    footer,
    LAUNDRY_URL,
  ].join("\n");
  return {subject, html, text};
};

const sendResendEmail = async (
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
  await enforceRateLimit(ip);

  const rendered = renderLaundrySpareEmail(request);
  await sendResendEmail({
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
  await sendResendEmail({
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
