(() => {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const honeypot = form.querySelector('input[name="_gotcha"]');
  const subject = document.getElementById("asunto");

  const messages = {
    es: {
      sending: "Enviando...",
      success: "Mensaje enviado correctamente.",
      sendError: "Ha habido un problema al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.",
      networkError: "Ha habido un problema de conexión. Por favor, inténtalo de nuevo.",
    },
    en: {
      sending: "Sending...",
      success: "Message sent successfully.",
      sendError: "There was a problem sending the message. Please try again later.",
      networkError: "There was a connection problem. Please try again.",
    },
    it: {
      sending: "Invio...",
      success: "Messaggio inviato correttamente.",
      sendError: "Si e verificato un problema durante l'invio. Riprova piu tardi.",
      networkError: "Si e verificato un problema di connessione. Riprova.",
    },
    el: {
      sending: "Apostoli...",
      success: "To minima stalike epitixos.",
      sendError: "Ypirxe provlima kata tin apostoli. Dokimaste xana argotera.",
      networkError: "Ypirxe provlima syndesis. Dokimaste xana.",
    },
  };

  const getLang = () => {
    if (window.unatomoI18n && typeof window.unatomoI18n.getLanguage === "function") {
      return window.unatomoI18n.getLanguage();
    }
    return (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  };

  const setStatus = (message, state) => {
    if (!status) return;
    status.hidden = false;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
    status.textContent = message;
  };

  const applySubject = () => {
    if (!subject) return;
    const params = new URLSearchParams(window.location.search);
    const initialSubject = (params.get("subject") || "").trim().toLowerCase();
    if (!initialSubject) return;
    if (!subject.querySelector(`option[value="${initialSubject}"]`)) return;
    subject.value = initialSubject;
  };

  applySubject();
  document.addEventListener("app:language-change", applySubject);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (honeypot && honeypot.value) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const text = messages[getLang()] || messages.es;
    setStatus(text.sending);
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setStatus(text.success, "success");
        form.reset();
      } else {
        setStatus(text.sendError, "error");
      }
    } catch {
      setStatus(text.networkError, "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
