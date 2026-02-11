export const render = (mount) => {
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>FAQs</h2>
    <div class="section-faq">
      <h3>¿Qué es UNATOMO?</h3>
      <p>UNATOMO es una plataforma web para la gestión de equipos: inventario, ubicaciones, tareas e historial de intervenciones. Se crea una ficha por cada máquina, se puede adjuntar documentación (manuales, esquemas, fotos, enlaces) y cada acción queda registrada para mantener trazabilidad y continuidad operativa.</p>
    </div>
    <div class="section-faq">
      <h3>¿Para quién está pensado?</h3>
      <p>Para negocios con maquinaria distribuida y mantenimiento recurrente: hostelería (cocina, frío, lavavajillas, climatización), lavanderías, retail con cámaras/frío, talleres y, en general, cualquier operación donde la falta de control sobre equipos genera incidencias, paradas y costes.</p>
    </div>
    <div class="section-faq">
      <h3>¿Necesito instalar algo?</h3>
      <p>No. UNATOMO funciona desde el navegador en móvil o PC.</p>
    </div>
    <div class="section-faq">
      <h3>¿Cómo se accede a la ficha de un equipo?</h3>
      <p>Desde el listado de equipos o, si lo deseas, mediante una etiqueta asociada al equipo (NFC o QR) que abre su ficha directamente desde el móvil en segundos.</p>
    </div>
    <div class="section-faq">
      <h3>¿Puedo gestionar varios locales/ubicaciones?</h3>
      <p>Sí. Puedes organizar equipos por local, zona o ubicación y operar filtrando por cada una de ellas.</p>
    </div>
    <div class="section-faq">
      <h3>¿Cómo funcionan usuarios y permisos?</h3>
      <p>La cuenta admite varios usuarios con permisos por rol. Así puedes definir quién puede visualizar información, registrar intervenciones o administrar equipos y configuración.</p>
    </div>
    <div class="section-faq">
      <h3>¿Qué tipo de información puedo guardar por equipo?</h3>
      <p>Información de identificación (modelo/serie), ubicación, estado, notas, documentación adjunta, tareas planificadas y el historial completo de intervenciones y eventos asociados.</p>
    </div>
    <div class="section-faq">
      <h3>¿Dónde se guardan los datos y cómo se protegen?</h3>
      <p>Los datos se almacenan en la nube, vinculados a la cuenta y protegidos mediante controles de acceso. Solo los usuarios autorizados pueden ver o modificar la información según sus permisos.</p>
    </div>
  `;
  mount.appendChild(wrap);
};
