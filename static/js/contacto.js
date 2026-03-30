(function () {
  const isEn = /^\/en(?:\/|$)/i.test(window.location.pathname);
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn =
    form.querySelector(".btn-submit") ||
    form.querySelector('button[type="submit"]');
  const honeypot = form.querySelector('input[name="_gotcha"]');

  const text = {
    sending: isEn ? "Sending..." : "Enviando...",
    success: isEn ? "Message sent successfully." : "Mensaje enviado correctamente.",
    sendError: isEn
      ? "There was a problem sending the message. Please try again later."
      : "Ha habido un problema al enviar el mensaje. Por favor, int?ntalo de nuevo m?s tarde.",
    networkError: isEn
      ? "There was a connection problem. Please try again."
      : "Ha habido un problema de conexi?n. Por favor, int?ntalo de nuevo.",
  };

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

    setStatus(text.sending);
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        setStatus(text.success, "success");
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
