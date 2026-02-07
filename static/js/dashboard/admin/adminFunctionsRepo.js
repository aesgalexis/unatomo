import { functions } from "/static/js/firebase/firebaseApp.js";
import {
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createInviteCallable = httpsCallable(functions, "createAdminInvite");
const respondInviteCallable = httpsCallable(functions, "respondAdminInvite");
const leaveAdminCallable = httpsCallable(functions, "leaveAdminRole");
const revokeAdminCallable = httpsCallable(functions, "revokeAdminInvite");

export const createAdminInvite = async (machineId, adminEmail) => {
  const res = await createInviteCallable({ machineId, adminEmail });
  return res.data || null;
};

export const respondAdminInvite = async (inviteId, decision) => {
  const res = await respondInviteCallable({ inviteId, decision });
  return res.data || null;
};

export const leaveAdminRole = async (machineId) => {
  const res = await leaveAdminCallable({ machineId });
  return res.data || null;
};

export const revokeAdminInvite = async (machineId, adminEmail) => {
  const res = await revokeAdminCallable({ machineId, adminEmail });
  return res.data || null;
};
