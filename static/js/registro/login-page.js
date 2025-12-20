import { auth, loginWithGoogle, loginWithEmail } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const btnGoogle = document.getElementById("btn-google-login");
const form = document.getElementById("login-email-form");
const btnEmail = document.getElementById("btn-email-login");
const status = document.getElementById("login-status");

function setStatus(t) {
  status.hidden = false;
  status.textContent = t;
}

function clearStatus() {
  status.hidden = true;
  status.textContent = "";
}

function goHome() {
  window.location.href = "/es/index.html";
}

document.documentElement.style.visibility = "visible";

onAuthStateChanged(auth, (user) => {
  if (user) goHome();
});

btnGoogle?.addEventListener("click", async () => {
  clearStatus();

  try {
    btnGoogle.disabled = true;
    setStatus("Conectando con Google…");

    const res = await loginWithGoogle();
    if (!res.ok) {
      setStatus("No se pudo iniciar sesión.");
      return;
    }

    setStatus("Sesión iniciada. Redirigiendo…");
    setTimeout(goHome, 650);
  } catch (e) {
    setStatus("Error en el inicio de sesión con Google.");
  } finally {
    btnGoogle.disabled = false;
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const email = (document.getElementById("email")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "");

  if (!email || !password) {
    setStatus("Completa los campos obligatorios.");
    return;
  }

  try {
    btnEmail.disabled = true;
    setStatus("Iniciando sesión…");

    const res = await loginWithEmail(email, password);
    if (!res.ok) {
      setStatus("No se pudo iniciar sesión.");
      return;
    }

    setStatus("Sesión iniciada. Redirigiendo…");
    setTimeout(goHome, 650);
  } catch (e) {
    const code = String(e?.code || "");
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
      setStatus("Correo o contraseña incorrectos.");
    } else if (code.includes("auth/invalid-email")) {
      setStatus("Correo no válido.");
    } else if (code.includes("auth/too-many-requests")) {
      setStatus("Demasiados intentos. Prueba más tarde.");
    } else {
      setStatus("Error iniciando sesión.");
    }
  } finally {
    btnEmail.disabled = false;
  }
});
