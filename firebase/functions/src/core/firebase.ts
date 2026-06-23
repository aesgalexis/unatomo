import {setGlobalOptions} from "firebase-functions";
import * as admin from "firebase-admin";

setGlobalOptions({maxInstances: 10});

if (!admin.apps.length) {
  admin.initializeApp();
}

export {admin};
export const db = admin.firestore();
export const storageBucket = admin.storage().bucket();

export const machinesCol = () => db.collection("machines");
export const invitesCol = () => db.collection("admin_machine_invites");
export const linksCol = () => db.collection("admin_machine_links");
export const transferInvitesCol = () =>
  db.collection("machine_transfer_invites");
export const accountDirectoryCol = () => db.collection("account_directory");
export const registrationCodesCol = () => db.collection("registration_codes");
export const tagsCol = () => db.collection("tags");
export const machineAccessCol = () => db.collection("machine_access");
export const dashboardSuggestionsCol = () =>
  db.collection("dashboard_suggestions");
export const dashboardTodosCol = () => db.collection("dashboard_todos");
export const accountHandlesCol = () => db.collection("account_handles");
export const accountHandleHistoryCol = () =>
  db.collection("account_handle_history");
