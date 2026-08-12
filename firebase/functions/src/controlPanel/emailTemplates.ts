import {onCall} from "firebase-functions/v2/https";
import {assertControlPanelAccess} from "../core/auth";
import {
  EMAIL_TEMPLATE_DEFINITIONS,
  EmailLanguage,
  renderEmailTemplate,
} from "../email/templates";

const samples = {
  displayName: "Alexis",
  actionUrl: "https://unatomo.com/nfc",
  code: "UNATOMO-2026",
  expiresText: "24 horas",
  actorName: "Alexis",
  machineName: "Lavadora 01",
  oldEmail: "anterior@ejemplo.com",
  newEmail: "nuevo@ejemplo.com",
  activityTitle: "Cambio de nombre de usuario",
  activityDetail: "Tu nombre de usuario público se ha actualizado.",
  occurredAt: "12 ago 2026, 10:30",
};

export const listControlPanelEmailTemplates = onCall((request) => {
  assertControlPanelAccess(request.auth);
  const language: EmailLanguage = request.data?.language === "en" ? "en" : "es";
  return {
    items: EMAIL_TEMPLATE_DEFINITIONS.map((definition) => ({
      ...definition,
      ...definition.labels[language],
      preview: renderEmailTemplate(definition.id, samples, language),
    })),
  };
});
