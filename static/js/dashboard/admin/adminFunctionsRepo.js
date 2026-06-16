import { functions } from "/static/js/firebase/firebaseApp.js";
import {
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const createInviteCallable = httpsCallable(functions, "createAdminInvite");
const respondInviteCallable = httpsCallable(functions, "respondAdminInvite");
const leaveAdminCallable = httpsCallable(functions, "leaveAdminRole");
const revokeAdminCallable = httpsCallable(functions, "revokeAdminInvite");
const ensureLinkCallable = httpsCallable(functions, "ensureAdminLink");
const createTransferCallable = httpsCallable(functions, "createMachineTransferInvite");
const respondTransferCallable = httpsCallable(functions, "respondMachineTransferInvite");
const cancelTransferCallable = httpsCallable(functions, "cancelMachineTransferInvite");

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

export const ensureAdminLink = async (inviteId) => {
  const res = await ensureLinkCallable({ inviteId });
  return res.data || null;
};

export const createMachineTransferInvite = async (machineId, toEmail) => {
  const res = await createTransferCallable({ machineId, toEmail });
  return res.data || null;
};

export const respondMachineTransferInvite = async (inviteId, decision) => {
  const res = await respondTransferCallable({ inviteId, decision });
  return res.data || null;
};

export const cancelMachineTransferInvite = async (machineId) => {
  const res = await cancelTransferCallable({ machineId });
  return res.data || null;
};
