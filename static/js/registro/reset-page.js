// FILE: static/js/registro/reset-page.js
import { sendPasswordReset } from "/static/js/registro/firebase-init.js";

const form = document.getElementById("reset-form");
const status = document.getElementById("reset-status");
const submit = document.getElementById("reset-submit");

function setStatus(t) {
  if (!status) return;
  status.hidden = false;
  status.textContent = t;
}
function clearStatus() {
  if (!status) return;
  status.hidden = true;
  status.textContent = "";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const email = (form.querySelector("#email")?.value ?? "").toString().trim();
  if (!email) return setStatus("Escribe tu correo.");

  try {
    if (submit) submit.disabled = true;
    setStatus("Enviando enlace…");

    await sendPasswordReset(email);

    setStatus("Si el correo está registrado, recibirás un email con el enlace. (Revisa también Spam)");
    form.reset();
  } catch (err) {
    const code = err?.code || "";
    if (code === "auth/invalid-email") {
      setStatus("El correo no parece válido.");
      return;
    }
    if (code === "auth/too-many-requests") {
      setStatus("Demasiados intentos. Inténtalo más tarde.");
      return;
    }
    setStatus("Si el correo está registrado, recibirás un email con el enlace. (Revisa también Spam)");
    form.reset();
  } finally {
    if (submit) submit.disabled = false;
  }
});
