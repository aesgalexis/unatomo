import {
  auth,
  authPersistenceReady,
  db,
  app,
  appCheck,
  storage,
  getUserRegistrationState,
  isAccountOnboardingRequired
} from "/static/js/registro/firebase-init.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

const functions = getFunctions(app);

export {
  auth,
  authPersistenceReady,
  db,
  functions,
  appCheck,
  storage,
  getUserRegistrationState,
  isAccountOnboardingRequired
};
