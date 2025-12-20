import { auth, loginWithGoogle, loginWithEmail } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

(function () {
  const btnOpen = document.getElementById("go-login");
  const box = document.getElementById("login-box");

  const btnGoogle = document.getElementById("login-google");
  const form = document.getElementById("login-email-form");
  const btnEmail = document.getElementById("login-email-submit");

  const status = document.getElementById("login-status");
  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-password");

  function showStatus(t) {
    if (!status) return;
    status.hidden = false;
    status.textContent = t;
  }

  function clearStatus() {
    if (!status) return;
    status.hidden = true;
    status.textContent = "";
  }

  function toggleBox() {
    if (!box) return;
    box.hidden = !box.hidden;
    clearStatus();
    if (!box.hidden) emailInput?.focus();
  }

  btnOpen?.addEventListener("click", toggleBox);

  onAuthStateChanged(auth, (user) => {
    if (!box) return;
    if (user) {
      window.location.href = "/es/index.html";
    }
  });

  btnGoogle?.addEventListener("click", async () => {
    clearStatus();
    try {
      btnGoogle.disabled = true;
      showStatus("Conectando con Google…");

      const res = await loginWithGoogle();
      if (!res.ok) {
        showStatus("No se pudo iniciar sesión.");
        return;
      }

      showStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(() => {
        window.location.href = "/es/index.html";
      }, 650);
    } catch (e) {
      showStatus("Error en el inicio de sesión con Google.");
    } finally {
      btnGoogle.disabled = false;
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const email = (emailInput?.value || "").trim();
    const pw = (passInput?.value || "");

    if (!email || !pw) {
      showStatus("Completa los campos obligatorios.");
      return;
    }

    try {
      btnEmail.disabled = true;
      showStatus("Iniciando sesión…");

      const res = await loginWithEmail(email, pw);
      if (!res.ok) {
        showStatus("No se pudo iniciar sesión.");
        return;
      }

      showStatus("Sesión iniciada. Redirigiendo…");
      setTimeout(() => {
        window.location.href = "/es/index.html";
      }, 650);
    } catch (e) {
      const code = String(e?.code || "");
      if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
        showStatus("Correo o contraseña incorrectos.");
      } else if (code.includes("auth/invalid-email")) {
        showStatus("Correo no válido.");
      } else if (code.includes("auth/too-many-requests")) {
        showStatus("Demasiados intentos. Prueba más tarde.");
      } else {
        showStatus("Error iniciando sesión.");
      }
    } finally {
      btnEmail.disabled = false;
    }
  });
})();
