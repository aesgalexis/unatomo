export const CONTACT_FORM_MESSAGES = Object.freeze({
  es: Object.freeze({
    sending: "Enviando...",
    success: "Mensaje enviado correctamente.",
    sendError: "No se ha podido enviar el mensaje. Inténtalo de nuevo más tarde.",
    networkError: "No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.",
  }),
  en: Object.freeze({
    sending: "Sending...",
    success: "Message sent successfully.",
    sendError: "The message could not be sent. Please try again later.",
    networkError: "Could not connect. Check your connection and try again.",
  }),
  it: Object.freeze({
    sending: "Invio in corso...",
    success: "Messaggio inviato correttamente.",
    sendError: "Non è stato possibile inviare il messaggio. Riprova più tardi.",
    networkError: "Impossibile connettersi. Controlla la connessione e riprova.",
  }),
  el: Object.freeze({
    sending: "Αποστολή...",
    success: "Το μήνυμα στάλθηκε επιτυχώς.",
    sendError: "Δεν ήταν δυνατή η αποστολή του μηνύματος. Δοκιμάστε ξανά αργότερα.",
    networkError: "Δεν ήταν δυνατή η σύνδεση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.",
  }),
});

const normalizeLanguage = (language) => {
  const normalized = String(language || document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  return CONTACT_FORM_MESSAGES[normalized] ? normalized : "es";
};

export const initContactForm = (form, options = {}) => {
  if (!form || form.dataset.contactFormReady === "true") return;
  form.dataset.contactFormReady = "true";

  const status = form.querySelector(options.statusSelector || ".form-status");
  const submitButton = form.querySelector(options.submitSelector || 'button[type="submit"]');
  const honeypot = form.querySelector('input[name="_gotcha"]');
  const messages = CONTACT_FORM_MESSAGES[normalizeLanguage(options.language)];

  const setStatus = (message, state) => {
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (honeypot?.value) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setStatus(messages.sending);
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setStatus(messages.sendError, "error");
        return;
      }

      setStatus(messages.success, "success");
      form.reset();
    } catch {
      setStatus(messages.networkError, "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
};
