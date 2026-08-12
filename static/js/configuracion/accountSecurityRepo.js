import {functions} from "/static/js/firebase/firebaseApp.js";
import {httpsCallable} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

const changePasswordCallable = httpsCallable(functions, "changeAccountPassword");
const requestEmailChangeCallable = httpsCallable(functions, "requestAccountEmailChange");
const finalizeEmailChangeCallable = httpsCallable(functions, "finalizeAccountEmailChange");

export const changeAccountPassword = async (password) =>
  (await changePasswordCallable({password}))?.data || {};

export const requestAccountEmailChange = async (newEmail) =>
  (await requestEmailChangeCallable({newEmail}))?.data || {};

export const finalizeAccountEmailChange = async () =>
  (await finalizeEmailChangeCallable({}))?.data || {};
