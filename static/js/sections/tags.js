export const render = (mount) => {
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>Tags físicos / precios</h2>
    <p>
      Los tags NFC permiten abrir una máquina directamente desde una etiqueta.
    </p>
    <ul class="section-list">
      <li>Pack básico de tags físicos.</li>
      <li>Etiquetas resistentes para entorno industrial.</li>
      <li>Asesoría de instalación y configuración.</li>
    </ul>
    <p>
      Contacta con soporte para tarifas actualizadas.
    </p>
  `;
  mount.appendChild(wrap);
};
