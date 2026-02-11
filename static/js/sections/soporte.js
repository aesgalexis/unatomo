export const render = (mount) => {
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>Contacto</h2>
    <section class="card" aria-label="Formulario de contacto">
      <p>Formulario de contacto</p>
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
            <label for="section-nombre">Nombre<span aria-hidden="true"> *</span></label>
            <input id="section-nombre" name="nombre" type="text" required class="field" autocomplete="name" />
          </div>
          <div class="form-field">
            <label for="section-empresa">Empresa</label>
            <input id="section-empresa" name="empresa" type="text" class="field" autocomplete="organization" />
          </div>
          <div class="form-field">
            <label for="section-email">Correo electrónico<span aria-hidden="true"> *</span></label>
            <input id="section-email" name="email" type="email" required class="field" autocomplete="email" />
          </div>
          <div class="form-field">
            <label for="section-telefono">Teléfono</label>
            <input id="section-telefono" name="telefono" type="tel" class="field" autocomplete="tel" inputmode="tel" />
          </div>
          <div class="form-field form-field--full">
            <label for="section-asunto">Asunto<span aria-hidden="true"> *</span></label>
            <select id="section-asunto" name="asunto" required class="field">
              <option value="" disabled selected>Selecciona un asunto...</option>
              <option>Consulta general</option>
              <option>Registro</option>
              <option>Otros</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label for="section-mensaje">Mensaje<span aria-hidden="true"> *</span></label>
            <textarea id="section-mensaje" name="mensaje" rows="6" required class="field"></textarea>
          </div>
        </div>
        <div class="form-actions" style="display:flex; justify-content:center;">
          <button type="submit" class="btn-primary">Enviar</button>
        </div>
      </form>
    </section>
  `;
  mount.appendChild(wrap);
};

