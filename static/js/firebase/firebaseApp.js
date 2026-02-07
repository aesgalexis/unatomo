import { auth, db, app } from "/static/js/registro/firebase-init.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const functions = getFunctions(app);

export { auth, db, functions };
