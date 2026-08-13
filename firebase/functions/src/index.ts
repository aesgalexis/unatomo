// Stable public export boundary for deployed Firebase Function names.

export {saveDashboardGroupLayout} from "./dashboard/layout";
export {
  changeAccountHandle,
  checkAccountHandleAvailability,
  claimAccountHandle,
} from "./accounts/handles";
export {
  redeemRegistrationCode,
  validateRegistrationCode,
} from "./accounts/registration";
export {completeAccountOnboarding} from "./accounts/onboarding";
export {requestAccountPasswordReset} from "./accounts/passwordReset";
export {
  changeAccountPassword,
  finalizeAccountEmailChange,
  resendAccountEmailVerification,
  requestAccountEmailChange,
} from "./accounts/security";
export {
  listControlPanelAccessRequests,
  requestAccountAccess,
  reviewControlPanelAccessRequest,
} from "./accounts/accessRequests";
export {deliverEmailOutbox} from "./email/resend";
export {notifyMachineStatusTransition} from "./notifications/machineStatus";
export {listControlPanelEmailTemplates} from "./controlPanel/emailTemplates";
export {
  listControlPanelEmailDeliveries,
  retryControlPanelEmailDelivery,
} from "./controlPanel/emailDelivery";
export {
  createDashboardSuggestion,
  deleteDashboardSuggestion,
  listDashboardSuggestions,
  markDashboardSuggestionsSeen,
  updateDashboardSuggestionResolved,
} from "./dashboard/suggestions";
export {
  createDashboardTodo,
  deleteDashboardTodo,
  listDashboardTodoCollaborators,
  listDashboardTodos,
  updateDashboardTodo,
} from "./dashboard/todos";
export {
  getControlPanelSystemStatus,
  listControlPanelUsers,
  setControlPanelUserCollaborator,
} from "./controlPanel/systemAndUsers";
export {deleteControlPanelUser} from "./controlPanel/deleteUser";
export {
  cleanupControlPanelLegacyRegistrationCodeLinks,
  createControlPanelRegistrationCode,
  deleteControlPanelRegistrationCode,
  listControlPanelRegistrationCodes,
} from "./controlPanel/registrationCodes";
export {
  createAdminInvite,
  ensureAdminLink,
  leaveAdminRole,
  respondAdminInvite,
  revokeAdminInvite,
} from "./machines/adminInvites";
export {
  cancelMachineTransferInvite,
  createMachineTransferInvite,
  respondMachineTransferInvite,
} from "./machines/transfers";
export {
  assignMachineTag,
  createMachineTagToken,
  disconnectMachineTag,
  generateMachineTagQr,
  listControlPanelTags,
  provisionMachineTagOnCreate,
} from "./machines/tags";
export {createOwnedMachine} from "./machines/createMachine";
export {deleteMachine} from "./machines/deleteMachine";
export {
  deleteGlobalLocalUserAccess,
  saveGlobalLocalUserAccess,
  saveMachineAccessRolePermissionsAccess,
} from "./machines/localUsers";
export {
  cleanupMachineAccessSessions,
  getMachineAccessPublic,
  setMachineQrAccessEnabled,
  updateMachineAccessOperational,
  verifyMachineAccessUser,
} from "./machines/access";
export {
  createMachineDocumentDownloadUrl,
  downloadMachineDocument,
  uploadMachineAccessDocument,
} from "./machines/documents";
export {
  getPublicNfcLandingStats,
  refreshPublicNfcLandingStats,
} from "./publicSite/landingStats";

// Firebase Admin initialization and global runtime options are centralized in
// core/firebase.ts. Keep this file as the stable public export boundary while
// implementations move incrementally into domain modules.
