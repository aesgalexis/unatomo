import {normalizeEmail} from "../core/auth";
import {db} from "../core/firebase";
import {EmailLanguage} from "./templates";

export const getEmailRecipient = async (email: string, uid = "") => {
  const emailLower = normalizeEmail(email);
  const directory = emailLower ?
    (await db.collection("account_directory").doc(emailLower).get()).data() ||
      {} :
    {};
  const resolvedUid = uid || (directory.uid || "").toString();
  const profile = resolvedUid ?
    (await db.collection("users").doc(resolvedUid).get()).data() || {} : {};
  const language: EmailLanguage =
    profile.language === "en" || directory.language === "en" ? "en" : "es";
  return {
    email: email.trim(),
    displayName: (profile.displayName || directory.displayName || "")
      .toString().trim(),
    language,
  };
};

export const dashboardUrl = (language: EmailLanguage) =>
  `https://unatomo.com/nfc/${language}/index.html`;
