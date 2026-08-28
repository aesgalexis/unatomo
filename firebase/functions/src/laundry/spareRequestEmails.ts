/* eslint-disable max-len */
import {
  LaundryLanguage,
  RenderedEmail,
  SpareRequest,
} from "./spareRequestTypes";
import {escapeHtml} from "./spareRequestValidation";

export const REQUEST_DESTINATION = "info@unatomo.com";
export const VERIFIED_SENDER = "Unatomo <cuenta@correo.unatomo.com>";
const LAUNDRY_URL = "https://unatomo.com/laundryservices/";
const LAUNDRY_LOGO_URL =
  "https://unatomo.com/static/img/logo-unatomo-round-v1.0.png";
const LAUNDRY_BLUE = "#2563eb";

const row = (label: string, value: unknown) => `
  <tr>
    <th style="padding:8px 12px;text-align:left;vertical-align:top;` +
  "border-bottom:1px solid #e5e7eb;color:#334155;width:190px\">" +
  `${escapeHtml(label)}</th>
    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;` +
  `color:#0f172a">${escapeHtml(value || "-")}</td>
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
      `Referencia: ${request.partReference || "-"}`,
      `Cantidad: ${request.quantity}`,
      `Detalles: ${request.description || "-"}`,
      `Contacto: ${request.contactName}`,
      `Correo: ${request.email}`,
      `Teléfono: ${request.phone || "-"}`,
      `Razón social: ${request.legalName}`,
      `CIF / NIF / VAT: ${request.taxId}`,
      `Dirección fiscal: ${address}`,
      `Fotos de placa adjuntas: ${request.images.length}`,
    ].join("\n"),
  };
};

type ConfirmationCopy = {
  subject: string;
  title: string;
  greeting: string;
  firstParagraph: string;
  secondParagraph: string;
  referenceLabel: string;
  machineLabel: string;
  spareLabel: string;
  quantityLabel: string;
  buttonLabel: string;
  footer: string;
};

const CONFIRMATION_COPY: Record<LaundryLanguage, ConfirmationCopy> = {
  es: {
    subject: "Hemos recibido tu solicitud de recambio",
    title: "Hemos recibido tu solicitud",
    greeting: "Hola",
    firstParagraph: "Gracias por contactar con UNATOMO Laundry Services. Tu solicitud se ha registrado correctamente.",
    secondParagraph: "Nuestro equipo revisará las fotografías de la placa y la información facilitada. Contactaremos contigo si necesitamos alguna aclaración.",
    referenceLabel: "Referencia de solicitud",
    machineLabel: "Máquina",
    spareLabel: "Recambio solicitado",
    quantityLabel: "Cantidad",
    buttonLabel: "Ir a Laundry Services",
    footer: "Este correo confirma la recepción de tu solicitud. Puedes responder si necesitas añadir información.",
  },
  en: {
    subject: "We received your spare-part request",
    title: "We have received your request",
    greeting: "Hello",
    firstParagraph: "Thank you for contacting UNATOMO Laundry Services. Your request has been registered successfully.",
    secondParagraph: "Our team will review the data-plate photographs and the information provided. We will contact you if we need any clarification.",
    referenceLabel: "Request reference",
    machineLabel: "Machine",
    spareLabel: "Requested spare part",
    quantityLabel: "Quantity",
    buttonLabel: "Visit Laundry Services",
    footer: "This email confirms receipt of your request. You can reply if you need to add any information.",
  },
  it: {
    subject: "Abbiamo ricevuto la tua richiesta di ricambio",
    title: "Abbiamo ricevuto la tua richiesta",
    greeting: "Ciao",
    firstParagraph: "Grazie per aver contattato UNATOMO Laundry Services. La tua richiesta è stata registrata correttamente.",
    secondParagraph: "Il nostro team esaminerà le foto della targhetta e le informazioni fornite. Ti contatteremo se serviranno chiarimenti.",
    referenceLabel: "Riferimento richiesta",
    machineLabel: "Macchina",
    spareLabel: "Ricambio richiesto",
    quantityLabel: "Quantità",
    buttonLabel: "Visita Laundry Services",
    footer: "Questa email conferma la ricezione della richiesta. Puoi rispondere se devi aggiungere informazioni.",
  },
  el: {
    subject: "Λάβαμε το αίτημά σας για ανταλλακτικό",
    title: "Λάβαμε το αίτημά σας",
    greeting: "Γεια σας",
    firstParagraph: "Σας ευχαριστούμε που επικοινωνήσατε με το UNATOMO Laundry Services. Το αίτημά σας καταχωρίστηκε επιτυχώς.",
    secondParagraph: "Η ομάδα μας θα εξετάσει τις φωτογραφίες της πινακίδας και τις πληροφορίες που δώσατε. Θα επικοινωνήσουμε μαζί σας αν χρειαστούμε διευκρινίσεις.",
    referenceLabel: "Αναφορά αιτήματος",
    machineLabel: "Μηχάνημα",
    spareLabel: "Ζητούμενο ανταλλακτικό",
    quantityLabel: "Ποσότητα",
    buttonLabel: "Μετάβαση στο Laundry Services",
    footer: "Αυτό το email επιβεβαιώνει την παραλαβή του αιτήματος. Μπορείτε να απαντήσετε αν θέλετε να προσθέσετε πληροφορίες.",
  },
};

export const renderLaundrySpareConfirmation = (
  request: SpareRequest,
): RenderedEmail => {
  const copy = CONFIRMATION_COPY[request.language];
  const reference = request.submissionId.slice(0, 8).toUpperCase();
  const machine = [
    request.manufacturer,
    request.allianceBrand,
    request.model,
  ].filter(Boolean).join(" · ");
  const subject = `${copy.subject} · ${reference}`;
  const greeting = `${copy.greeting} ${escapeHtml(request.contactName)},`;
  const summaryRow = (label: string, value: unknown) =>
    `<tr><td style="padding:7px 0;color:#64748b;font-size:14px;vertical-align:top">${escapeHtml(label)}</td>` +
    `<td style="padding:7px 0 7px 18px;color:#17201d;font-size:14px;font-weight:600;text-align:right">${escapeHtml(value)}</td></tr>`;
  const summary = [
    summaryRow(copy.machineLabel, machine),
    summaryRow(copy.spareLabel, request.spareName),
    summaryRow(copy.quantityLabel, request.quantity),
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
<p style="margin:0 0 8px;color:${LAUNDRY_BLUE};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${copy.referenceLabel} ${reference}</p>
<h1 style="margin:0 0 22px;font-size:28px;line-height:1.2;color:#17201d">${copy.title}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${greeting}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${copy.firstParagraph}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6">${copy.secondParagraph}</p>
<div style="margin:22px 0;padding:10px 18px;border-radius:10px;background:#f1f5f9">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${summary}</table>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px"><tr><td style="border-radius:9px;background:${LAUNDRY_BLUE}">
<a href="${LAUNDRY_URL}" style="display:inline-block;padding:11px 19px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${copy.buttonLabel}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 36px;background:#eef3f1;color:#53615c;font-size:13px;line-height:1.5">${copy.footer}<br>
<a href="${LAUNDRY_URL}" style="color:${LAUNDRY_BLUE}">unatomo.com/laundryservices</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    greeting,
    "",
    copy.firstParagraph,
    copy.secondParagraph,
    "",
    `${copy.referenceLabel}: ${reference}`,
    `${copy.machineLabel}: ${machine}`,
    `${copy.spareLabel}: ${request.spareName}`,
    `${copy.quantityLabel}: ${request.quantity}`,
    "",
    copy.footer,
    LAUNDRY_URL,
  ].join("\n");
  return {subject, html, text};
};
