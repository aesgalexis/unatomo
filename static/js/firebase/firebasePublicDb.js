import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { app } from "/static/js/firebase/firebaseCore.js";

export const db = getFirestore(app);
