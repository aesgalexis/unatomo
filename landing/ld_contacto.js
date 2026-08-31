import { initContactForm } from "/static/js/contact-form-controller.js";

const form = document.querySelector(".contact-form");

if (form) {
  const subject = form.querySelector("#asunto");
  const requestedSubject = (new URLSearchParams(window.location.search).get("subject") || "").trim().toLowerCase();
  if (subject && requestedSubject && subject.querySelector(`option[value="${requestedSubject}"]`)) {
    subject.value = requestedSubject;
  }

  initContactForm(form);
}
