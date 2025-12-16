(function () {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector(".btn-submit");
  const honeypot = form.querySelector('input[name="_gotcha"]');

  function setStatus(message, state) {
    if (!status) return;
    status.hidden = false;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
    status.textContent = message;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (honeypot && honeypot.value) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setStatus("Enviando…");
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        setStatus("Mensaje enviado correctamente.", "success");
        form.reset();
      } else {
        setStatus(
          "Ha habido un problema al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.",
          "error"
        );
      }
    } catch (error) {
      setStatus(
        "Ha habido un problema de conexión. Por favor, inténtalo de nuevo.",
        "error"
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
