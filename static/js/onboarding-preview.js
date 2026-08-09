import {
  auth,
  functions,
  getUserRegistrationState
} from "/static/js/firebase/firebaseApp.js";
import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";

const form = document.querySelector("#onboarding-form");
const card = document.querySelector(".onboarding-card");
const nameInput = document.querySelector("#onboarding-name");
const companyInput = document.querySelector("#onboarding-company");
const equipmentInput = document.querySelector("#onboarding-equipment");
const rangeInput = document.querySelector(".equipment-range");
const status = document.querySelector("#onboarding-status");
const equipmentSection = document.querySelector(".onboarding-equipment");
const ownershipInputs = document.querySelectorAll('input[name="ownership"]');
const creatingState = document.querySelector(".onboarding-creating");
const submitButton = form.querySelector(".onboarding-submit");
const isEnglish = document.body.dataset.lang === "en";
const dashboardUrl = isEnglish ? "/nfc/en/index.html#/dashboard" : "/nfc/es/index.html#/dashboard";
const loginUrl = isEnglish ? "/nfc/en/auth/login.html" : "/nfc/es/auth/login.html";
const setupUrl = "/nfc/?setup=1";
const completeOnboarding = httpsCallable(functions, "completeAccountOnboarding");
let activeUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(loginUrl);
    return;
  }
  try {
    const registration = await getUserRegistrationState(user);
    if (!registration.allowed) {
      window.location.replace(setupUrl);
      return;
    }
    if (
      registration.profile?.onboardingRequired !== true ||
      registration.profile?.onboardingCompletedAt
    ) {
      window.location.replace(dashboardUrl);
      return;
    }
    activeUser = user;
    nameInput.value = (user.displayName || registration.profile?.displayName || "").trim();
    companyInput.value = (registration.profile?.company || "").toString().trim();
    submitButton.disabled = false;
    if (!nameInput.value) nameInput.focus();
  } catch {
    status.textContent = isEnglish
      ? "We could not load your account. Check your connection and try again."
      : "No pudimos cargar tu cuenta. Revisa la conexión e inténtalo de nuevo.";
  }
});

const clampEquipment = (value) => Math.min(50, Math.max(0, Number.parseInt(value, 10) || 0));
const syncEquipment = (value) => {
  const next = clampEquipment(value);
  equipmentInput.value = String(next);
  rangeInput.value = String(next);
};

document.querySelectorAll(".equipment-button").forEach((button) => {
  button.addEventListener("click", () => syncEquipment(Number(equipmentInput.value) + (button.dataset.action === "increase" ? 1 : -1)));
});
equipmentInput.addEventListener("input", () => { if (equipmentInput.value) syncEquipment(equipmentInput.value); });
equipmentInput.addEventListener("blur", () => syncEquipment(equipmentInput.value));
rangeInput.addEventListener("input", () => syncEquipment(rangeInput.value));

ownershipInputs.forEach((input) => input.addEventListener("change", () => {
  const managesOwn = input.value === "own" && input.checked;
  if (!input.checked) return;
  equipmentSection.hidden = !managesOwn;
  equipmentInput.disabled = !managesOwn;
}));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeUser || submitButton.disabled) return;
  const name = nameInput.value.trim();
  const company = companyInput.value.trim();
  const ownsEquipment = form.elements.ownership.value === "own";
  const count = ownsEquipment ? clampEquipment(equipmentInput.value) : 0;
  syncEquipment(count);
  if (!name || !company) {
    status.textContent = isEnglish ? "Complete your name and company to continue." : "Completa tu nombre y empresa para continuar.";
    (!name ? nameInput : companyInput).focus();
    return;
  }
  status.textContent = "";
  submitButton.disabled = true;
  card.classList.add("is-creating");
  creatingState.hidden = false;
  try {
    await Promise.all([
      completeOnboarding({
        displayName: name,
        company,
        ownership: ownsEquipment ? "own" : "other",
        machineCount: count,
        language: isEnglish ? "en" : "es"
      }),
      new Promise((resolve) => window.setTimeout(resolve, 5000))
    ]);
    if (activeUser.displayName !== name) {
      await updateProfile(activeUser, { displayName: name });
    }
    window.location.replace(dashboardUrl);
  } catch {
    card.classList.remove("is-creating");
    creatingState.hidden = true;
    submitButton.disabled = false;
    status.textContent = isEnglish
      ? "We could not create your workspace. Please try again."
      : "No pudimos crear tu espacio de trabajo. Inténtalo de nuevo.";
  }
});
