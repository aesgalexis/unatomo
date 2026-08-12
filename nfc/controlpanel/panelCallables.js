import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

export const createControlPanelCallables = (functions) => ({
  listUsers: httpsCallable(functions, "listControlPanelUsers"),
  getSystemStatus: httpsCallable(functions, "getControlPanelSystemStatus"),
  listEmailTemplates: httpsCallable(
    functions,
    "listControlPanelEmailTemplates"
  ),
  listEmailDeliveries: httpsCallable(
    functions,
    "listControlPanelEmailDeliveries"
  ),
  retryEmailDelivery: httpsCallable(
    functions,
    "retryControlPanelEmailDelivery"
  ),
  listCodes: httpsCallable(functions, "listControlPanelRegistrationCodes"),
  listAccessRequests: httpsCallable(functions, "listControlPanelAccessRequests"),
  reviewAccessRequest: httpsCallable(functions, "reviewControlPanelAccessRequest"),
  createCode: httpsCallable(functions, "createControlPanelRegistrationCode"),
  deleteCode: httpsCallable(functions, "deleteControlPanelRegistrationCode"),
  cleanupLegacyCodeLinks: httpsCallable(
    functions,
    "cleanupControlPanelLegacyRegistrationCodeLinks"
  ),
  listTags: httpsCallable(functions, "listControlPanelTags"),
  deleteUser: httpsCallable(functions, "deleteControlPanelUser"),
  setUserCollaborator: httpsCallable(
    functions,
    "setControlPanelUserCollaborator"
  )
});
