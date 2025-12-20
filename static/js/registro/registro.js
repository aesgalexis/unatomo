import { validateRegistrationCode } from "/static/js/registro/firebase-init.js";

(function () {
  const loginBtn = document.getElementById("go-login");
  const registerBtn = document.getElementById("go-register");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/auth/login.html";
    });
  }

  let registerBox = null;

  function ensureRegisterBox() {
    if (registerBox) return registerBox;
    if (!registerBtn) return null;

    registerBox = document.createElement("section");
    registerBox.className = "card";
    registerBox.style.marginTop = "0.75rem";
    registerBox.style.width = "100%";
    registerBox.style.maxWidth = "520px";
    registerBox.style.marginLeft = "auto";
    registerBox.style.marginRight = "auto";
    registerBox.hidden = true;

    const title = document.createElement("h3");
    title.textContent = "Código de acceso";

    const text = document.createElement("p");
    text.textContent = "Introduce el código para registrarte.";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "register-code-input";
    input.autocomplete = "one-time-code";
    input.placeholder = "Código";
    input.style.width = "100%";
    input.style.marginTop = "0.75rem";
    input.style.padding = "0.65rem 0.85rem";
    input.style.borderRadius = "0.75rem";
    input.style.border = "1px solid color-mix(in srgb, var(--fg) 30%, transparent)";
    input.style.background = "transparent";
    input.style.color = "var(--fg)";
    input.style.font = "inherit";
    input.style.fontSize = "0.95rem";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "0.75rem";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.marginTop = "0.85rem";
    row.style.flexWrap = "wrap";

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "btn-pill btn-pill-solid";
    submit.id = "register-code-submit";
    submit.textContent = "Continuar";

    const link = document.createElement("a");
    link.href = "/auth/request-code.html";
    link.textContent = "Solicitar código si no lo tienes";
    link.style.textDecoration = "underline";
    link.style.color = "var(--fg)";
    link.style.fontSize = "0.95rem";

    const error = document.createElement("p");
    error.id = "register-code-error";
    error.style.marginTop = "0.75rem";
    error.style.marginBottom = "0";
    error.style.fontSize = "0.95rem";
    error.style.opacity = "0.9";
    error.hidden = true;

    row.appendChild(submit);
    row.appendChild(link);

    registerBox.appendChild(title);
    registerBox.appendChild(text);
    registerBox.appendChild(input);
    registerBox.appendChild(row);
    registerBox.appendChild(error);

    registerBtn.insertAdjacentElement("afterend", registerBox);

    async function go() {
      const raw = (input.value || "").trim();
      error.hidden = true;
      error.textContent = "";

      if (!raw) {
        error.textContent = "Introduce un código válido.";
        error.hidden = false;
        input.focus();
        return;
      }

      try {
        submit.disabled = true;

        const res = await validateRegistrationCode(raw);
        console.log("validateRegistrationCode:", res);

        if (!res.valid) {
          if (res.reason === "not_found") error.textContent = "Código no válido.";
          else if (res.reason === "inactive") error.textContent = "Código desactivado.";
          else error.textContent = "Código no válido.";
          error.hidden = false;
          input.focus();
          return;
        }

        try {
          sessionStorage.setItem("unatomo_access_code", res.code);
        } catch (e) {}

        window.location.href = "/auth/register.html";
      } catch (e) {
        console.error("validateRegistrationCode error:", e);
        const code = (e && e.code) ? String(e.code) : "";
        if (code.includes("permission-denied")) {
          error.textContent = "Permiso denegado en Firestore (revisa Rules).";
        } else {
          error.textContent = "Error validando el código.";
        }
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    }

    submit.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });

    return registerBox;
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      const box = ensureRegisterBox();
      if (!box) return;

      box.hidden = !box.hidden;

      if (!box.hidden) {
        const input = document.getElementById("register-code-input");
        if (input) input.focus();
      }
    });
  }
})();
