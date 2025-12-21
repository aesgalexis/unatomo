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

document.documentElement.style.visibility = "visible";

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const email = (document.getElementById("email")?.value || "").trim();
  if (!email) return setStatus("Introduce un correo válido.");

  try {
    if (submit) submit.disabled = true;
    setStatus("Enviando enlace…");

    const res = await sendPasswordReset(email);
    if (!res.ok) return setStatus("No se pudo enviar el correo. Revisa el email e inténtalo de nuevo.");

    setStatus("Listo. Si el correo existe, recibirás un email con el enlace.");
    form.reset();
  } catch {
    setStatus("Error enviando el correo. Inténtalo más tarde.");
  } finally {
    if (submit) submit.disabled = false;
  }
});
