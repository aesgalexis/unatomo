const isEnglish = () => /^\/en(?:\/|$)/i.test(window.location.pathname);

export const render = (mount) => {
  const isEn = isEnglish();
  const wrap = document.createElement("div");
  wrap.className = "section-block";
  wrap.innerHTML = `
    <h2>${isEn ? "Physical tags" : "Tags físicos"}</h2>
    <p>
      ${isEn ? "NFC tags let you open a machine directly from a physical label." : "Los tags NFC permiten abrir una máquina directamente desde una etiqueta."}
    </p>
    <ul class="section-list">
      <li>${isEn ? "Basic pack of physical tags." : "Pack básico de tags físicos."}</li>
      <li>${isEn ? "Durable labels for industrial environments." : "Etiquetas resistentes para entorno industrial."}</li>
      <li>${isEn ? "Installation and configuration guidance." : "Asesoría de instalación y configuración."}</li>
    </ul>
    <p>
      ${isEn ? "Contact support for updated pricing." : "Contacta con soporte para tarifas actualizadas."}
    </p>
  `;
  mount.appendChild(wrap);
};
