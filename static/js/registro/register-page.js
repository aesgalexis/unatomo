import { validateRegistrationCode, registerWithGoogle, registerWithEmail } from "/static/js/registro/firebase-init.js";

const status = document.getElementById("reg-status");
const btnGoogle = document.getElementById("btn-google");
const btnEmail = document.getElementById("btn-email");
const form = document.getElementById("register-email-form");

function setStatus(t) {
  status.hidden = false;
  status.textContent = t;
}

function clearStatus() {
  status.hidden = true;
  status.textContent = "";
}

const code = (sessionStorage.getItem("unatomo_access_code") || "").trim();

if (!code) {
  window.location.replace("/?setup=1");
} else {
  const check = await validateRegistrationCode(code);
  if (!check.valid) {
    try { sessionStorage.removeItem("unatomo_access_code"); } catch (e) {}
    window.location.replace("/?setup=1");
  } else {
    document.documentElement.style.visibility = "visible";
  }
}

btnGoogle?.addEventListener("click", async () => {
  clearStatus();
  try {
    btnGoogle.disabled = true;
    setStatus("Conectando con Google…");

    const res = await registerWithGoogle(code);
    if (!res.ok) {
      setStatus("No se pudo completar el registro.");
      return;
    }

    setStatus("Registro completado. Redirigiendo…");
    setTimeout(() => {
      window.location.href = "/es/index.html";
    }, 650);
  } catch (e) {
    setStatus("Error en el registro con Google.");
  } finally {
    btnGoogle.disabled = false;
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const nombre = (document.getElementById("nombre")?.value || "").trim();
  const email = (document.getElementById("email")?.value || "").trim();
  const p1 = (document.getElementById("password")?.value || "");
  const p2 = (document.getElementById("password2")?.value || "");

  if (!email || !p1 || !p2) {
    setStatus("Completa los campos obligatorios.");
    return;
  }

  if (p1.length < 8) {
    setStatus("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (p1 !== p2) {
    setStatus("Las contraseñas no coinciden.");
    return;
  }

  try {
    btnEmail.disabled = true;
    setStatus("Creando cuenta…");

    const res = await registerWithEmail(code, email, p1, nombre);
    if (!res.ok) {
      setStatus("No se pudo completar el registro.");
      return;
    }

    setStatus("Registro completado. Redirigiendo…");
    setTimeout(() => {
      window.location.href = "/es/index.html";
    }, 650);
  } catch (e) {
    const msg = String(e?.code || "");
    if (msg.includes("auth/email-already-in-use")) setStatus("Ese correo ya tiene cuenta.");
    else if (msg.includes("auth/invalid-email")) setStatus("Correo no válido.");
    else if (msg.includes("auth/weak-password")) setStatus("Contraseña demasiado débil.");
    else setStatus("Error creando la cuenta.");
  } finally {
    btnEmail.disabled = false;
  }
});
