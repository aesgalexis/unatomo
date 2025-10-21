(() => {
  const root = document.getElementById('contact-root');
  if (!root) return;

  root.innerHTML = `
    <div class="contact-wrap">
      <form class="contact-form" id="contact-form" novalidate>
        <!-- Fila 1: todos en una línea -->
        <div class="contact-row">
          <div class="field">
            <label class="label" for="c-name">Nombre y apellidos</label>
            <input class="input" id="c-name" name="name" type="text" placeholder="Tu nombre" autocomplete="name" required>
          </div>

          <div class="field">
            <label class="label" for="c-email">Email</label>
            <input class="input" id="c-email" name="email" type="email" placeholder="tu@correo.com" autocomplete="email" required>
          </div>

          <div class="field">
            <label class="label" for="c-phone">Teléfono</label>
            <input class="input" id="c-phone" name="phone" type="tel" placeholder="+34 600 000 000" inputmode="tel" autocomplete="tel">
          </div>
        </div>

        <!-- Fila 2: asunto en línea con empresa (si quieres) -->
        <div class="contact-row">
          <div class="field">
            <label class="label" for="c-company">Empresa (opcional)</label>
            <input class="input" id="c-company" name="company" type="text" placeholder="Nombre de la empresa">
          </div>

          <div class="field">
            <label class="label" for="c-subject">Asunto</label>
            <input class="input" id="c-subject" name="subject" type="text" placeholder="¿Sobre qué necesitas ayuda?" required>
          </div>
        </div>

        <!-- Fila 3: mensaje -->
        <div class="contact-row">
          <div class="field" style="min-width:100%;">
            <label class="label" for="c-message">Mensaje</label>
            <textarea class="textarea" id="c-message" name="message" placeholder="Cuéntanos brevemente..." required></textarea>
          </div>
        </div>

        <!-- Fila 4: enviar -->
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

  // Validación mínima + demo de envío (sustituye por tu integración)
  root.querySelector('#contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Aquí conectarías con tu endpoint (fetch) o mailto:
    // fetch('/api/contact', { method:'POST', body: new FormData(form) })
    alert('¡Mensaje enviado! (demo)');
    form.reset();
  });
})();
