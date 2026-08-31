import { initContactForm } from "/static/js/contact-form-controller.js";

const form = document.querySelector(".contact-form");

if (form) {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  const requestedSubject = new URLSearchParams(window.location.search).get("subject");

  if (requestedSubject === "registration") {
    const subjectSelect = form.querySelector('select[name="asunto"]');
    const registrationOption = Array.from(subjectSelect?.options || []).find((option) =>
      /^(Registro|Registration)$/i.test(option.textContent.trim())
    );
    if (subjectSelect && registrationOption) subjectSelect.value = registrationOption.value;

    const messageField = form.querySelector('textarea[name="mensaje"]');
    if (messageField && !messageField.value.trim()) {
      messageField.value = isEnglish
        ? "Hello, I would like to register for UNATOMO/NFC and request an access code."
        : "Hola, me gustaría registrarme en UNATOMO/NFC y solicitar un código de acceso.";
    }
  }

  initContactForm(form);
}
