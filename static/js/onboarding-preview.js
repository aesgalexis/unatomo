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
const isEnglish = document.body.dataset.lang === "en";

const params = new URLSearchParams(window.location.search);
if (params.get("name")) nameInput.value = params.get("name").trim().slice(0, 120);

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

form.addEventListener("submit", (event) => {
  event.preventDefault();
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
  card.classList.add("is-creating");
  creatingState.hidden = false;
  window.setTimeout(() => {
    window.location.assign(isEnglish ? "/nfc/en/index.html#/dashboard" : "/nfc/es/index.html#/dashboard");
  }, 5000);
});
