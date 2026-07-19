const isEnglish = () => /^\/en(?:\/|$)/i.test(window.location.pathname);

export const render = (mount) => {
  const isEn = document.documentElement.lang.toLowerCase().startsWith("en") || isEnglish();
  const wrap = document.createElement("div");
  wrap.className = "section-block section-contacto";
  wrap.innerHTML = `
    <h2>${isEn ? "Contact" : "Contacto"}</h2>
    <section class="card" aria-label="${isEn ? "Contact details" : "Datos de contacto"}">
      <div class="contact-info">
        <div class="contact-info-item">
          <span class="contact-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 13 20 6.01V6H4zm0 12h16V8l-8 7-8-7v10z" /></svg>
          </span>
          <p><strong>${isEn ? "Email" : "Correo electr&oacute;nico"}:</strong> <a href="mailto:info@unatomo.com">info@unatomo.com</a></p>
        </div>
        <div class="contact-info-item">
          <span class="contact-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.22z" /></svg>
          </span>
          <p><strong>${isEn ? "Phone" : "Tel&eacute;fono"}:</strong> <a href="tel:+34871252049">+34 871 25 20 49</a></p>
        </div>
        <div class="contact-info-item">
          <span class="contact-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.009 8.009 0 01-8 8zm.5-13h-1v6l5 3 .5-.86-4.5-2.64z" /></svg>
          </span>
          <p><strong>${isEn ? "Opening hours" : "Horario de atenci&oacute;n"}:</strong> ${isEn ? "Monday to Friday, 09:00 to 15:00 (Spain / CET)." : "De lunes a viernes, de 09:00 a 15:00 (Horario de Espa&ntilde;a / CET)."}</p>
        </div>
        <div class="contact-info-item">
          <span class="contact-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 4.25 5.13 10.21 6.38 11.57a1 1 0 001.48 0C13.87 19.21 19 13.25 19 9a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z" /></svg>
          </span>
          <p><strong>${isEn ? "Address" : "Direcci&oacute;n"}:</strong> ${isEn ? "07440 Muro, Mallorca, Spain" : "07440 Muro, Mallorca, Espa&ntilde;a"}</p>
        </div>
      </div>
    </section>
    <section class="card" aria-label="${isEn ? "Contact form" : "Formulario de contacto"}">
      <p>${isEn ? "Contact form" : "Formulario de contacto"}</p>
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
        </div>
        <div class="form-actions" style="display:flex; justify-content:center;">
          <button type="submit" class="btn-primary">${isEn ? "Send" : "Enviar"}</button>
        </div>
      </form>
    </section>
  `;
  mount.appendChild(wrap);
};
