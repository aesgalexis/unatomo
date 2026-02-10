export const render = (mount) => {
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>FAQs</h2>
    <div class="section-faq">
      <h3>¿Puedo acceder desde móvil?</h3>
      <p>Sí. El panel está optimizado para móvil y escritorio.</p>
    </div>
    <div class="section-faq">
      <h3>¿Cómo se asignan administradores?</h3>
      <p>Desde Configuración puedes invitar y compartir equipos.</p>
    </div>
    <div class="section-faq">
      <h3>¿Qué pasa si pierdo el acceso?</h3>
      <p>Contacta con soporte y validaremos la cuenta.</p>
    </div>
  `;
  mount.appendChild(wrap);
};
