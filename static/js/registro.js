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

  function setStatus(el, text) {
    el.hidden = false;
    el.textContent = text;
  }

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

    const formRow = document.createElement("div");
    formRow.style.display = "flex";
    formRow.style.gap = "0.75rem";
    formRow.style.alignItems = "center";
    formRow.style.marginTop = "0.85rem";
    formRow.style.flexWrap = "nowrap";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "register-code-input";
    input.autocomplete = "one-time-code";
    input.placeholder = "Código";
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "0.65rem 0.85rem";
    input.style.borderRadius = "0.75rem";
    input.style.border = "1px solid color-mix(in srgb, var(--fg) 30%, transparent)";
    input.style.background = "transparent";
    input.style.color = "var(--fg)";
    input.style.font = "inherit";
    input.style.fontSize = "0.95rem";

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "btn-secondary";
    submit.id = "register-code-submit";
    submit.textContent = "Continuar";
    submit.style.marginTop = "0";

    const tick = document.createElement("span");
    tick.textContent = " ✓";
    tick.style.display = "none";
    submit.appendChild(tick);

    formRow.appendChild(input);
    formRow.appendChild(submit);

    const linkRow = document.createElement("div");
    linkRow.style.marginTop = "0.85rem";

    const link = document.createElement("a");
    link.href = "/auth/request-code.html";
    link.textContent = "Solicitar código si no lo tienes";
    link.style.textDecoration = "underline";
    link.style.color = "var(--fg)";
    link.style.fontSize = "0.95rem";

    linkRow.appendChild(link);

    const status = document.createElement("p");
    status.id = "register-code-status";
    status.style.marginTop = "0.85rem";
    status.style.marginBottom = "0";
    status.style.fontSize = "0.95rem";
    status.style.opacity = "0.9";
    status.hidden = true;

    registerBox.appendChild(title);
    registerBox.appendChild(text);
    registerBox.appendChild(formRow);
    registerBox.appendChild(linkRow);
    registerBox.appendChild(status);

    registerBtn.insertAdjacentElement("afterend", registerBox);

    async function go() {
      const raw = (input.value || "").trim();
      status.hidden = true;
      status.textContent = "";
      tick.style.display = "none";

      if (!raw) {
        setStatus(status, "Introduce un código válido.");
        input.focus();
        return;
      }

      try {
        submit.disabled = true;
        submit.style.opacity = "0.7";
        setStatus(status, "Validando código…");

        const res = await validateRegistrationCode(raw);

        if (!res.valid) {
          setStatus(status, "Código no válido.");
          input.focus();
          return;
        }

        try {
          sessionStorage.setItem("unatomo_access_code", res.code);
        } catch (e) {}

        tick.style.display = "inline";
        setStatus(status, "Código correcto. Redirigiendo…");

        setTimeout(() => {
          window.location.href = "/auth/register.html";
        }, 650);
      } catch (e) {
        const code = e && e.code ? String(e.code) : "";
        if (code.includes("permission-denied")) {
          setStatus(status, "Permiso denegado en Firestore (revisa Rules).");
        } else {
          setStatus(status, "Error validando el código.");
        }
      } finally {
        submit.disabled = false;
        submit.style.opacity = "1";
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
