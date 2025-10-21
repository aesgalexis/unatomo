(() => {
  const root = document.getElementById('contact-root');
  if (!root) return;

  root.innerHTML = `
    <div class="contact-wrap">
      <form class="contact-form" id="contact-form" novalidate>
        <!-- Fila 1: Nombre / Email -->
        <div class="contact-row">
          <div class="field">
            <label class="label" for="c-name">Nombre y apellidos</label>
            <input class="input" id="c-name" name="name" type="text" autocomplete="name" required>
          </div>

          <div class="field">
            <label class="label" for="c-email">Email</label>
            <input class="input" id="c-email" name="email" type="email" autocomplete="email" required>
          </div>
        </div>

        <!-- Fila 2: Empresa / Teléfono (opcionales) -->
        <div class="contact-row">
          <div class="field">
            <label class="label" for="c-company">Empresa (opcional)</label>
            <input class="input" id="c-company" name="company" type="text" autocomplete="organization">
          </div>

          <div class="field">
            <label class="label" for="c-phone">Teléfono (opcional)</label>
            <input class="input" id="c-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel">
          </div>
        </div>

        <!-- Fila 3: Asunto (select) -->
        <div class="contact-row">
          <div class="field">
            <label class="label" for="c-subject">Asunto</label>
            <select class="select" id="c-subject" name="subject" required>
              <option value="" disabled selected>Selecciona una opción</option>
              <option value="consulta-general">Consulta general</option>
              <option value="presupuesto">Solicitud de presupuesto</option>
              <option value="soporte-tecnico">Soporte técnico</option>
              <option value="colaboracion">Colaboración / Partners</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <!-- Fila 4: Mensaje -->
        <div class="contact-row">
          <div class="field" style="min-width:100%;">
            <label class="label" for="c-message">Mensaje</label>
            <textarea class="textarea" id="c-message" name="message" required></textarea>
          </div>
        </div>

        <!-- Fila 5: Enviar -->
        <div class="contact-row">
          <button class="btn-submit" type="submit">Enviar</button>
        </div>
      </form>

      <!-- Lateral con info (editable) -->
      <aside class="contact-aside" aria-label="Información de contacto">
        <h3>Atención comercial</h3>
        <p>Respondemos normalmente en 24–48h laborables.</p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:hola@unatomo.com">hola@unatomo.com</a></li>
          <li><strong>Teléfono:</strong> <a href="tel:+34871252049">+34 871 252 049</a></li>
        </ul>
        <h3>Horarios</h3>
        <ul>
          <li>L–V · 9:00–18:00 CET</li>
          <li>Sábados · Solo urgencias</li>
        </ul>
      </aside>
    </div>
  `;

  // Validación básica + demo de envío
  root.querySelector('#contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Sustituir por tu integración real (fetch a tu endpoint, etc.)
    alert('¡Mensaje enviado! (demo)');
    form.reset();
  });
})();
