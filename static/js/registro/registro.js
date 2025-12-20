import { validateRegistrationCode } from "/static/js/registro/firebase-init.js";

(function () {
  const loginBtn = document.getElementById("go-login");
  const registerBtn = document.getElementById("go-register");

  const box = document.getElementById("register-code-box");
  const input = document.getElementById("register-code-input");
  const submit = document.getElementById("register-code-submit");
  const status = document.getElementById("register-code-status");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/auth/login.html";
    });
  }

  function clearStatus() {
    if (!status) return;
    status.hidden = true;
    status.textContent = "";
  }

  function setStatus(text) {
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
  }

  function toggleBox() {
    if (!box) return;
    box.hidden = !box.hidden;
    clearStatus();
    if (!box.hidden && input) input.focus();
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", toggleBox);
  }

  async function go() {
    clearStatus();

    const raw = (input?.value || "").trim();
    if (!raw) {
      setStatus("Introduce un código válido.");
      input?.focus();
      return;
    }

    try {
      if (submit) submit.disabled = true;
      setStatus("Validando código…");

      const res = await validateRegistrationCode(raw);

      if (!res.valid) {
        setStatus("Código no válido.");
        input?.focus();
        return;
      }

      try {
        sessionStorage.setItem("unatomo_access_code", res.code);
      } catch (e) {}

      setStatus("Código correcto. Redirigiendo…");

      setTimeout(() => {
        window.location.href = "/auth/register.html";
      }, 650);
    } catch (e) {
      setStatus("Error validando el código.");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  if (submit) submit.addEventListener("click", go);

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  }
})();
