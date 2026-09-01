const root = document.documentElement;
const profileButtons = [...document.querySelectorAll("[data-profile-choice]")];
const profileName = document.querySelector("[data-current-profile]");
const demoForm = document.querySelector("[data-demo-form]");
const formMessage = document.querySelector("[data-form-message]");

const profiles = {
  "core-light": "Core · claro",
  "core-dark": "Core · oscuro",
  laundry: "Laundry Services",
  studio: "Studio"
};

const applyProfile = (profile) => {
  if (!profiles[profile]) return;
  root.dataset.profile = profile;
  profileName.textContent = profiles[profile];

  profileButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.profileChoice === profile));
  });
};

profileButtons.forEach((button) => {
  button.addEventListener("click", () => applyProfile(button.dataset.profileChoice));
});

demoForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "Ejemplo validado. El showroom no envía ningún dato.";
});

applyProfile(root.dataset.profile || "core-light");

