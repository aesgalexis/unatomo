(function () {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector(".btn-submit");
  const honeypot = form.querySelector('input[name="_gotcha"]');

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Si el honeypot tiene contenido, lo tratamos como spam y salimos en silencio
    if (honeypot && honeypot.value) {
      return;
    }

    // Validación HTML5 manual (novalidate está activo)
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (status) {
      status.hidden = false;
      status.textContent = "Enviando…";
    }

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (response.ok) {
        if (status) {
          status.textContent =
            "Mensaje enviado correctamente. Gracias por contactar con nosotros.";
        }
        form.reset();
      } else {
        if (status) {
          status.textContent =
            "Ha habido un problema al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.";
        }
      }
    } catch (error) {
      if (status) {
        status.textContent =
          "Ha habido un problema de conexión. Por favor, inténtalo de nuevo.";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
})();
