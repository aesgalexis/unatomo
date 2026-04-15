const isEnglish = () => /^\/en(?:\/|$)/i.test(window.location.pathname);

export const render = (mount) => {
  const isEn = isEnglish();
  const wrap = document.createElement("div");
  wrap.className = "section-block section-tags";

  if (isEn) {
    wrap.innerHTML = `
      <h2>Physical tags</h2>

      <p>Physical tags allow you to link a real machine directly to its digital information.</p>
      <p>The idea is simple: you place a label on the machine, scan it with your phone, and access its record, documentation, tasks or history without having to search for anything manually.</p>

      <h3>What is an NFC tag</h3>
      <p>An NFC tag is a small label with a chip that can store information, usually a link.</p>
      <p>When a compatible phone gets close to it, it can read that content automatically and open the associated address.</p>
      <p>It does not need a battery, it does not emit a signal on its own, and its use is immediate.</p>
      <p>Its main advantage is convenience: you just bring your phone close to it.</p>

      <h3>What is a QR code</h3>
      <p>A QR code serves a similar purpose, but it is read with the camera.</p>
      <p>Instead of bringing the device close, it is scanned visually.</p>
      <p>The advantage of QR is its universal compatibility.</p>
      <p>The advantage of NFC is speed and a more natural access experience.</p>
      <p>That is why both can coexist on the same machine.</p>

      <h3>What is stored on a tag</h3>
      <p>Usually, a unique link is stored.</p>
      <p>That link points to the digital record of a specific machine or to an intermediate access point from which the system identifies the equipment.</p>
      <p>The tag does not need to store all the technical information.</p>
      <p>It only needs to contain the reference required to reach it.</p>

      <h3>How an NFC tag is written</h3>
      <p>Writing an NFC tag means storing content on it, usually a URL.</p>
      <p>The general process is as follows:</p>
      <ul class="section-list">
        <li>The link that will represent the machine is prepared.</li>
        <li>The NFC tag is brought close to the phone or compatible writer.</li>
        <li>That link is written onto the chip.</li>
        <li>It is checked that reading it opens the correct destination.</li>
        <li>If desired, the tag can be locked to prevent later modifications.</li>
      </ul>
      <p>It is a quick process, but it is always advisable to verify that each tag is associated with the correct machine before installation.</p>

      <h3>How an NFC tag is read</h3>
      <p>To read it, it is usually enough to bring a compatible phone close to the label.</p>
      <p>Depending on the device, reading may be automatic or may require the user to have NFC enabled.</p>
      <p>When the content is detected, the phone opens the link or offers to open it.</p>
      <p>From there, the machine information is accessed.</p>

      <h3>How a QR code is read</h3>
      <p>A QR code is read with the phone camera or with a compatible application.</p>
      <p>When it is focused, the associated link appears and the user can open it instantly.</p>
      <p>It is the most useful alternative when the device does not have NFC or when a visible and easy-to-share system is preferred.</p>

      <h3>How a tag is linked to a machine</h3>
      <p>Each machine must have a unique identifier within the system.</p>
      <p>The physical tag is associated with that identifier through a specific link.</p>
      <p>In practice, the flow is this:</p>
      <ul class="section-list">
        <li>The machine is created inside the platform.</li>
        <li>The system generates or assigns a unique link for that machine.</li>
        <li>That link is written to the NFC tag or converted into a QR code.</li>
        <li>The label is placed physically on the equipment.</li>
        <li>When it is scanned, the user accesses the correct record directly.</li>
      </ul>
      <p>In this way, the physical point and the digital point remain permanently connected.</p>

      <h3>Good practices</h3>
      <p>It is advisable that each tag:</p>
      <ul class="section-list">
        <li>is placed in an accessible and visible area,</li>
        <li>has a clear identification if there are several machines nearby,</li>
        <li>is protected against humidity, heat or aggressive cleaning when the environment requires it,</li>
        <li>has been tested before being considered valid,</li>
        <li>and is documented within the system.</li>
      </ul>

      <h3>What it is used for in practice</h3>
      <p>A physical tag is not just a quick access point.</p>
      <p>It is a way to reduce friction.</p>
      <p>It allows any authorized person to reach the correct information from the machine itself, without depending on memory, loose papers or unnecessary searches.</p>
      <p>This makes it easier to consult documentation, log incidents, review pending tasks or understand the real history of the equipment where it matters: right in front of the machine.</p>
    `;
    mount.appendChild(wrap);
    return;
  }

  wrap.innerHTML = `
    <h2>Tags físicos</h2>

    <p>Los tags físicos permiten vincular una máquina real con su información digital de forma directa.</p>
    <p>La idea es simple: colocas una etiqueta en la máquina, la escaneas con el móvil y accedes a su ficha, documentación, tareas o historial sin tener que buscar nada manualmente.</p>

    <h3>Qué es un tag NFC</h3>
    <p>Un tag NFC es una pequeña etiqueta con un chip que puede almacenar información, normalmente un enlace.</p>
    <p>Cuando un teléfono compatible se acerca a él, puede leer ese contenido automáticamente y abrir la dirección asociada.</p>
    <p>No necesita batería, no emite señal por sí solo y su uso es inmediato.</p>
    <p>Su ventaja principal es la comodidad: basta con acercar el móvil.</p>

    <h3>Qué es un QR</h3>
    <p>Un código QR cumple una función parecida, pero se lee con la cámara.</p>
    <p>En lugar de acercar el dispositivo, se escanea visualmente.</p>
    <p>La ventaja del QR es su compatibilidad universal.</p>
    <p>La del NFC es la rapidez y la sensación de acceso más natural.</p>
    <p>Por eso ambos pueden convivir en una misma máquina.</p>

    <h3>Qué se graba en un tag</h3>
    <p>Lo habitual es grabar un enlace único.</p>
    <p>Ese enlace apunta a la ficha digital de una máquina concreta o a un acceso intermedio desde el que el sistema identifica el equipo.</p>
    <p>El tag no tiene por qué guardar toda la información técnica.</p>
    <p>Solo necesita contener la referencia necesaria para llegar a ella.</p>

    <h3>Cómo se graba un NFC</h3>
    <p>Grabar un tag NFC consiste en escribir en él un contenido, normalmente una URL.</p>
    <p>El proceso general es este:</p>
    <ul class="section-list">
      <li>Se prepara el enlace que representará a la máquina.</li>
      <li>Se acerca el tag NFC al teléfono o grabador compatible.</li>
      <li>Se escribe ese enlace en el chip.</li>
      <li>Se comprueba que la lectura abre el destino correcto.</li>
      <li>Si se desea, el tag puede bloquearse para evitar modificaciones posteriores.</li>
    </ul>
    <p>Es un proceso rápido, pero conviene verificar siempre que cada tag quede asociado al equipo correcto antes de instalarlo.</p>

    <h3>Cómo se lee un NFC</h3>
    <p>Para leerlo, normalmente basta con acercar un teléfono compatible a la etiqueta.</p>
    <p>Dependiendo del dispositivo, la lectura puede ser automática o requerir que el usuario tenga activado NFC.</p>
    <p>Al detectar el contenido, el teléfono abre el enlace o propone abrirlo.</p>
    <p>Desde ahí se accede a la información de la máquina.</p>

    <h3>Cómo se lee un QR</h3>
    <p>La lectura de un QR se hace con la cámara del móvil o con una aplicación compatible.</p>
    <p>Al enfocarlo, aparece el enlace asociado y el usuario puede abrirlo al instante.</p>
    <p>Es la alternativa más útil cuando el dispositivo no dispone de NFC o cuando se quiere un sistema visible y fácil de compartir.</p>

    <h3>Cómo se enlaza un tag con una máquina</h3>
    <p>Cada máquina debe tener un identificador único dentro del sistema.</p>
    <p>El tag físico se asocia a ese identificador mediante un enlace específico.</p>
    <p>En la práctica, el flujo es este:</p>
    <ul class="section-list">
      <li>Se crea la máquina dentro de la plataforma.</li>
      <li>El sistema genera o asigna un enlace único para esa máquina.</li>
      <li>Ese enlace se graba en el NFC o se convierte en un QR.</li>
      <li>La etiqueta se coloca físicamente en el equipo.</li>
      <li>Al escanearla, el usuario accede directamente a la ficha correcta.</li>
    </ul>
    <p>Así, el punto físico y el punto digital quedan conectados de forma permanente.</p>

    <h3>Buenas prácticas</h3>
    <p>Conviene que cada tag:</p>
    <ul class="section-list">
      <li>esté colocado en una zona accesible y visible,</li>
      <li>tenga una identificación clara si hay varias máquinas cerca,</li>
      <li>esté protegido frente a humedad, calor o limpieza agresiva cuando el entorno lo requiera,</li>
      <li>haya sido probado antes de darlo por válido,</li>
      <li>y quede documentado dentro del sistema.</li>
    </ul>

    <h3>Para qué sirve en la práctica</h3>
    <p>Un tag físico no es solo un acceso rápido.</p>
    <p>Es una forma de reducir fricción.</p>
    <p>Permite que cualquier persona autorizada llegue a la información correcta desde la propia máquina, sin depender de memoria, papeles sueltos o búsquedas innecesarias.</p>
    <p>Eso hace más fácil consultar documentación, registrar incidencias, revisar tareas pendientes o entender el historial real del equipo allí donde importa: delante de la máquina.</p>
  `;

  mount.appendChild(wrap);
};
