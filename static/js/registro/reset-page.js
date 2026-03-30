import { sendPasswordReset } from "/static/js/registro/firebase-init.js";
import { getCurrentLang } from "/static/js/site/locale.js";

const isEn = getCurrentLang() === "en";
const text = {
  enterEmail: isEn ? "Enter your email." : "Escribe tu correo.",
  sendingLink: isEn ? "Sending link..." : "Enviando enlace...",
  resetSent: isEn
    ? "If the email is registered, you will receive a reset link. Check Spam too."
    : "Si el correo está registrado, recibirás un email con el enlace. (Revisa también Spam)",
  invalidEmail: isEn ? "The email does not look valid." : "El correo no parece válido.",
  tooManyRequests: isEn ? "Too many attempts. Try again later." : "Demasiados intentos. Inténtalo más tarde.",
};

const form = document.getElementById("reset-form");
const status = document.getElementById("reset-status");
const submit = document.getElementById("reset-submit");

function setStatus(message) {
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
}

function clearStatus() {
  if (!status) return;
  status.hidden = true;
  status.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const email = (form.querySelector("#email").value || "").toString().trim();
  if (!email) return setStatus(text.enterEmail);

  try {
    if (submit) submit.disabled = true;
    setStatus(text.sendingLink);
    await sendPasswordReset(email);
    setStatus(text.resetSent);
    form.reset();
  } catch (error) {
    const code = error.code || "";
    if (code === "auth/invalid-email") {
      setStatus(text.invalidEmail);
      return;
    }
    if (code === "auth/too-many-requests") {
      setStatus(text.tooManyRequests);
      return;
    }
    setStatus(text.resetSent);
    form.reset();
  } finally {
    if (submit) submit.disabled = false;
  }
});
