/* eslint-disable max-len */
export type EmailLanguage = "es" | "en";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailTemplateId =
  | "registration_code_approved"
  | "account_welcome"
  | "password_reset"
  | "password_changed"
  | "email_verification"
  | "email_change_old"
  | "email_change_new"
  | "admin_invite"
  | "machine_transfer_requested"
  | "machine_transfer_completed"
  | "account_activity";

export type EmailTemplateInput = {
  displayName: string;
  actionUrl?: string;
  code?: string;
  expiresText?: string;
  actorName?: string;
  machineName?: string;
  oldEmail?: string;
  newEmail?: string;
  activityTitle?: string;
  activityDetail?: string;
  occurredAt?: string;
};

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  category: "access" | "account" | "security" | "invitation";
  hasButton: boolean;
  integration: "active" | "pending";
  labels: Record<EmailLanguage, {name: string; description: string}>;
};

const APP_URL = "https://unatomo.com/nfc";
const LOGO_URL =
  "https://unatomo.com/static/img/logo-unatomo-round-v1.0.png";
const BRAND_GREEN = "#16a34a";

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {id: "registration_code_approved", category: "access", hasButton: true, integration: "pending", labels: {es: {name: "Código de acceso aprobado", description: "Entrega el código personal después de aprobar una solicitud."}, en: {name: "Access code approved", description: "Delivers the personal code after an access request is approved."}}},
  {id: "account_welcome", category: "account", hasButton: true, integration: "active", labels: {es: {name: "Bienvenida", description: "Confirma que la cuenta y el dashboard están preparados."}, en: {name: "Welcome", description: "Confirms that the account and dashboard are ready."}}},
  {id: "password_reset", category: "security", hasButton: true, integration: "pending", labels: {es: {name: "Restablecer contraseña", description: "Permite elegir una contraseña nueva mediante un enlace seguro."}, en: {name: "Reset password", description: "Lets the user choose a new password through a secure link."}}},
  {id: "password_changed", category: "security", hasButton: false, integration: "pending", labels: {es: {name: "Contraseña modificada", description: "Confirma un cambio de contraseña y alerta si no fue reconocido."}, en: {name: "Password changed", description: "Confirms a password change and warns if it was not recognised."}}},
  {id: "email_verification", category: "security", hasButton: true, integration: "pending", labels: {es: {name: "Verificar correo", description: "Verifica que la dirección pertenece al titular de la cuenta."}, en: {name: "Verify email", description: "Verifies that the address belongs to the account holder."}}},
  {id: "email_change_old", category: "security", hasButton: true, integration: "pending", labels: {es: {name: "Aviso al correo anterior", description: "Avisa al correo anterior y ofrece una vía de recuperación."}, en: {name: "Previous email notice", description: "Warns the previous address and provides a recovery path."}}},
  {id: "email_change_new", category: "security", hasButton: true, integration: "pending", labels: {es: {name: "Verificar correo nuevo", description: "Confirma la nueva dirección antes de completar el cambio."}, en: {name: "Verify new email", description: "Confirms the new address before completing the change."}}},
  {id: "admin_invite", category: "invitation", hasButton: true, integration: "pending", labels: {es: {name: "Invitación de administrador", description: "Invita a administrar una máquina desde una pantalla de revisión."}, en: {name: "Administrator invitation", description: "Invites someone to manage a machine from a review screen."}}},
  {id: "machine_transfer_requested", category: "invitation", hasButton: true, integration: "pending", labels: {es: {name: "Transferencia solicitada", description: "Solicita revisar una transferencia de propiedad."}, en: {name: "Transfer requested", description: "Requests review of an ownership transfer."}}},
  {id: "machine_transfer_completed", category: "account", hasButton: true, integration: "pending", labels: {es: {name: "Transferencia completada", description: "Confirma que la propiedad de una máquina ha cambiado."}, en: {name: "Transfer completed", description: "Confirms that machine ownership has changed."}}},
  {id: "account_activity", category: "security", hasButton: true, integration: "pending", labels: {es: {name: "Actividad importante", description: "Plantilla común para cambios importantes de cuenta."}, en: {name: "Important activity", description: "Shared template for important account changes."}}},
];

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const clean = (value: unknown, fallback = "") =>
  (value || fallback).toString().trim();

const emailShell = ({title, preheader, greeting, paragraphs, button, callout, footer}: {
  title: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
  button?: {label: string; url: string};
  callout?: string;
  footer: string;
}) => `<!doctype html>
<html lang="en"><body style="margin:0;background:#f5f7f6;color:#17201d;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e1e7e4;border-radius:16px;overflow:hidden">
<tr><td style="padding:30px 36px 12px"><img src="${LOGO_URL}" width="54" height="54" alt="Unatomo" style="display:block;border:0"></td></tr>
<tr><td style="padding:12px 36px 36px"><h1 style="margin:0 0 22px;font-size:28px;line-height:1.2;color:#17201d">${title}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${greeting}</p>
${paragraphs.map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${paragraph}</p>`).join("")}
${callout ? `<div style="margin:22px 0;padding:15px 18px;border-radius:10px;background:#eef3f1;color:#17201d;font-size:19px;font-weight:700;letter-spacing:.08em;text-align:center">${callout}</div>` : ""}
${button ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px"><tr><td style="border-radius:9px;background:${BRAND_GREEN}"><a href="${button.url}" style="display:inline-block;padding:10px 18px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${button.label}</a></td></tr></table>` : ""}
</td></tr><tr><td style="padding:22px 36px;background:#eef3f1;color:#53615c;font-size:13px;line-height:1.5">${footer}<br><a href="${APP_URL}" style="color:${BRAND_GREEN}">unatomo.com/nfc</a></td></tr>
</table></td></tr></table></body></html>`;

const build = (subject: string, html: string, text: string): RenderedEmail =>
  ({subject, html, text});

export const renderEmailTemplate = (
  id: EmailTemplateId,
  input: EmailTemplateInput,
  language: EmailLanguage,
): RenderedEmail => {
  const en = language === "en";
  const name = escapeHtml(clean(input.displayName, en ? "there" : ""));
  const greeting = en ? `Hello ${name},` : `Hola ${name},`;
  const url = escapeHtml(clean(input.actionUrl, APP_URL));
  const machine = escapeHtml(clean(input.machineName, en ? "Machine 01" : "Máquina 01"));
  const actor = escapeHtml(clean(input.actorName, "Alexis"));
  const expires = escapeHtml(clean(input.expiresText, en ? "24 hours" : "24 horas"));
  const footer = en ? "This account email was sent by Unatomo. You can reply if you need help." : "Unatomo te ha enviado este correo de cuenta. Puedes responder si necesitas ayuda.";
  const shell = (options: Omit<Parameters<typeof emailShell>[0], "greeting" | "footer">) =>
    emailShell({...options, greeting, footer});

  switch (id) {
  case "registration_code_approved": {
    const code = escapeHtml(clean(input.code, "UNATOMO-2026"));
    const subject = en ? "Your UNATOMO/NFC access code" : "Tu código de acceso a UNATOMO/NFC";
    return build(subject, shell({title: en ? "Your access request was approved" : "Tu solicitud de acceso ha sido aprobada", preheader: subject, paragraphs: [en ? `Use this personal, single-use code within ${expires} to create your account.` : `Utiliza este código personal y de un solo uso durante las próximas ${expires} para crear tu cuenta.`, en ? "Do not share it with anyone." : "No lo compartas con nadie."], callout: code, button: {label: en ? "Create my account" : "Crear mi cuenta", url}}), `${greeting}\n\n${subject}: ${clean(input.code, "UNATOMO-2026")}\n${url}`);
  }
  case "account_welcome": {
    const subject = en ? "Welcome to UNATOMO/NFC" : "Te damos la bienvenida a UNATOMO/NFC";
    return build(subject, shell({title: en ? "Your UNATOMO/NFC account is ready" : "Tu cuenta de UNATOMO/NFC está lista", preheader: subject, paragraphs: [en ? "You can now organise your equipment, assign NFC identification and access its information from one place." : "Ya puedes organizar tus equipos, asignarles identificación NFC y acceder a su información desde un mismo lugar.", en ? "Open your dashboard to start setting everything up." : "Entra en tu dashboard para empezar a configurarlo todo."], button: {label: en ? "Open my dashboard" : "Abrir mi dashboard", url}}), `${greeting}\n\n${subject}\n\n${url}\n\nUnatomo`);
  }
  case "password_reset": {
    const subject = en ? "Reset your Unatomo password" : "Restablece tu contraseña de Unatomo";
    return build(subject, shell({title: en ? "Choose a new password" : "Elige una contraseña nueva", preheader: subject, paragraphs: [en ? `This secure link is valid for ${expires}.` : `Este enlace seguro es válido durante ${expires}.`, en ? "If you did not request this change, you can ignore this email." : "Si no has solicitado este cambio, puedes ignorar este correo."], button: {label: en ? "Change password" : "Cambiar contraseña", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "password_changed": {
    const subject = en ? "Your Unatomo password was changed" : "Tu contraseña de Unatomo ha cambiado";
    return build(subject, shell({title: en ? "Password changed" : "Contraseña modificada", preheader: subject, paragraphs: [en ? `Your password was changed on ${escapeHtml(clean(input.occurredAt, "12 Aug 2026, 10:30"))}.` : `Tu contraseña se modificó el ${escapeHtml(clean(input.occurredAt, "12 ago 2026, 10:30"))}.`, en ? "If you do not recognise this action, reset your password immediately and contact us." : "Si no reconoces esta acción, restablece tu contraseña inmediatamente y contacta con nosotros."]}), `${greeting}\n\n${subject}`);
  }
  case "email_verification": {
    const subject = en ? "Verify your Unatomo email" : "Verifica tu correo de Unatomo";
    return build(subject, shell({title: en ? "Verify your email address" : "Verifica tu dirección de correo", preheader: subject, paragraphs: [en ? `This secure link is valid for ${expires}.` : `Este enlace seguro es válido durante ${expires}.`, en ? "If you did not create this account, you can ignore this email." : "Si no has creado esta cuenta, puedes ignorar este correo."], button: {label: en ? "Verify my email" : "Verificar mi correo", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "email_change_old": {
    const subject = en ? "Your Unatomo email is being changed" : "Se está cambiando tu correo de Unatomo";
    return build(subject, shell({title: en ? "Email address change" : "Cambio de dirección de correo", preheader: subject, paragraphs: [en ? `A change from ${escapeHtml(clean(input.oldEmail, "old@example.com"))} to ${escapeHtml(clean(input.newEmail, "new@example.com"))} was requested.` : `Se ha solicitado cambiar ${escapeHtml(clean(input.oldEmail, "anterior@ejemplo.com"))} por ${escapeHtml(clean(input.newEmail, "nuevo@ejemplo.com"))}.`, en ? "If this was not you, secure your account now." : "Si no has sido tú, protege tu cuenta ahora."], button: {label: en ? "Secure my account" : "Proteger mi cuenta", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "email_change_new": {
    const subject = en ? "Confirm your new Unatomo email" : "Confirma tu nuevo correo de Unatomo";
    return build(subject, shell({title: en ? "Confirm your new email" : "Confirma tu nuevo correo", preheader: subject, paragraphs: [en ? `Confirm ${escapeHtml(clean(input.newEmail, "new@example.com"))} to complete the change.` : `Confirma ${escapeHtml(clean(input.newEmail, "nuevo@ejemplo.com"))} para completar el cambio.`, en ? `This link is valid for ${expires}.` : `Este enlace es válido durante ${expires}.`], button: {label: en ? "Confirm new email" : "Confirmar correo nuevo", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "admin_invite": {
    const subject = en ? `${actor} invited you to manage ${machine}` : `${actor} te invita a administrar ${machine}`;
    return build(subject, shell({title: en ? "Administrator invitation" : "Invitación de administrador", preheader: subject, paragraphs: [en ? `${actor} invited you to manage ${machine} in UNATOMO/NFC.` : `${actor} te ha invitado a administrar ${machine} en UNATOMO/NFC.`, en ? "Review the invitation and its access before accepting." : "Revisa la invitación y sus accesos antes de aceptarla."], button: {label: en ? "Review invitation" : "Revisar invitación", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "machine_transfer_requested": {
    const subject = en ? `Ownership transfer for ${machine}` : `Transferencia de propiedad de ${machine}`;
    return build(subject, shell({title: en ? "Ownership transfer requested" : "Transferencia de propiedad solicitada", preheader: subject, paragraphs: [en ? `${actor} wants to transfer ownership of ${machine} to your account.` : `${actor} quiere transferir la propiedad de ${machine} a tu cuenta.`, en ? "Review the consequences before accepting." : "Revisa las consecuencias antes de aceptar."], button: {label: en ? "Review transfer" : "Revisar transferencia", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "machine_transfer_completed": {
    const subject = en ? `Ownership of ${machine} was transferred` : `La propiedad de ${machine} se ha transferido`;
    return build(subject, shell({title: en ? "Transfer completed" : "Transferencia completada", preheader: subject, paragraphs: [en ? `The ownership transfer for ${machine} has been completed.` : `La transferencia de propiedad de ${machine} se ha completado.`, en ? "You can review the machine and its current access in your dashboard." : "Puedes revisar la máquina y sus accesos actuales en tu dashboard."], button: {label: en ? "Open my dashboard" : "Abrir mi dashboard", url}}), `${greeting}\n\n${subject}\n${url}`);
  }
  case "account_activity": {
    const activity = escapeHtml(clean(input.activityTitle, en ? "Important account change" : "Cambio importante de cuenta"));
    const detail = escapeHtml(clean(input.activityDetail, en ? "Your public username was changed." : "Se ha cambiado tu nombre de usuario público."));
    const subject = en ? `Important activity: ${activity}` : `Actividad importante: ${activity}`;
    return build(subject, shell({title: activity, preheader: subject, paragraphs: [detail, en ? `Recorded on ${escapeHtml(clean(input.occurredAt, "12 Aug 2026, 10:30"))}.` : `Registrado el ${escapeHtml(clean(input.occurredAt, "12 ago 2026, 10:30"))}.`, en ? "If you do not recognise this action, review and secure your account." : "Si no reconoces esta acción, revisa y protege tu cuenta."], button: {label: en ? "Review my account" : "Revisar mi cuenta", url}}), `${greeting}\n\n${subject}\n${detail}\n${url}`);
  }
  }
};

export const renderWelcomeEmail = ({displayName, language}: {
  displayName: string;
  language: EmailLanguage;
}): RenderedEmail => renderEmailTemplate(
  "account_welcome",
  {displayName, actionUrl: APP_URL},
  language,
);
