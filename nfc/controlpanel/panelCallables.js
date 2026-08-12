import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

export const createControlPanelCallables = (functions) => ({
  listUsers: httpsCallable(functions, "listControlPanelUsers"),
  getSystemStatus: httpsCallable(functions, "getControlPanelSystemStatus"),
  listEmailTemplates: httpsCallable(
    functions,
    "listControlPanelEmailTemplates"
  ),
  listCodes: httpsCallable(functions, "listControlPanelRegistrationCodes"),
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
