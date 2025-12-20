import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWsV-z0v90W9OxtHDx-m2N4SF-iUc9JNY",
  authDomain: "unatomo-c20a4.firebaseapp.com",
  projectId: "unatomo-c20a4",
  storageBucket: "unatomo-c20a4.firebasestorage.app",
  messagingSenderId: "856960214566",
  appId: "1:856960214566:web:8cfe8fffe96143e98728e7",
  measurementId: "G-8S09EBX9ZK"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "europe-west1");

export const validateRegistrationCode = httpsCallable(functions, "validateRegistrationCode");
