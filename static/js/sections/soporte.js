const isEnglish = () => /^\/en(?:\/|$)/i.test(window.location.pathname);

import { initContactForm } from "/static/js/contact-form-controller.js";

export const render = (mount) => {
  const isEn = document.documentElement.lang.toLowerCase().startsWith("en") || isEnglish();
  const wrap = document.createElement("div");
  wrap.className = "section-block section-contacto";
  wrap.innerHTML = `
    <section class="card" aria-label="${isEn ? "Contact form" : "Formulario de contacto"}">
      <form class="contact-form" action="https://formspree.io/f/mkgqlvqj" method="POST" novalidate>
        <input
          type="text"
          name="_gotcha"
          tabindex="-1"
          autocomplete="off"
          style="position:absolute; left:-5000px;"
          aria-hidden="true"
        >
        <div class="form-grid">
          <div class="form-field">
            <label for="section-nombre">${isEn ? "Name" : "Nombre"}<span aria-hidden="true"> *</span></label>
            <input id="section-nombre" name="nombre" type="text" required class="field" autocomplete="name" />
          </div>
          <div class="form-field">
            <label for="section-empresa">${isEn ? "Company" : "Empresa"}</label>
            <input id="section-empresa" name="empresa" type="text" class="field" autocomplete="organization" />
          </div>
          <div class="form-field">
            <label for="section-email">${isEn ? "Email" : "Correo electr&oacute;nico"}<span aria-hidden="true"> *</span></label>
            <input id="section-email" name="email" type="email" required class="field" autocomplete="email" />
          </div>
          <div class="form-field">
            <label for="section-telefono">${isEn ? "Phone" : "Tel&eacute;fono"}</label>
            <input id="section-telefono" name="telefono" type="tel" class="field" autocomplete="tel" inputmode="tel" />
          </div>
          <div class="form-field form-field--full">
            <label for="section-asunto">${isEn ? "Subject" : "Asunto"}<span aria-hidden="true"> *</span></label>
            <select id="section-asunto" name="asunto" required class="field">
              <option value="" disabled selected>${isEn ? "Select a subject..." : "Selecciona un asunto..."}</option>
              <option>${isEn ? "General enquiry" : "Consulta general"}</option>
              <option>${isEn ? "Registration" : "Registro"}</option>
              <option>${isEn ? "Other" : "Otros"}</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label for="section-mensaje">${isEn ? "Message" : "Mensaje"}<span aria-hidden="true"> *</span></label>
            <textarea id="section-mensaje" name="mensaje" rows="6" required class="field"></textarea>
          </div>
          <div class="form-consent form-field--full">
            <label class="form-consent-label" for="section-privacy-consent">
              <input id="section-privacy-consent" name="privacy_consent" type="checkbox" value="accepted" required>
              <span>${isEn ? "I accept the" : "Acepto la"} <a href="${isEn ? "/nfc/en/privacidad.html" : "/nfc/es/privacidad.html"}">${isEn ? "privacy and cookie policy" : "política de privacidad y cookies"}</a><span aria-hidden="true"> *</span></span>
            </label>
          </div>
        </div>
        <p class="form-status ut-form-status" role="status" aria-live="polite" hidden></p>
        <div class="ut-form-actions">
          <button type="submit" class="ut-button ut-button--primary">${isEn ? "Send" : "Enviar"}</button>
        </div>
      </form>
    </section>
  `;
  mount.appendChild(wrap);
  initContactForm(wrap.querySelector(".contact-form"));
};
