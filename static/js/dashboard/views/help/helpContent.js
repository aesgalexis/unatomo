export const HELP_SECTIONS = [
  {
    id: "primeros-pasos",
    title: { es: "Primeros pasos", en: "Getting started" },
    intro: {
      es: "Unatomo reúne la información operativa de cada máquina y permite abrirla desde un código QR o una etiqueta NFC.",
      en: "Unatomo brings each machine’s operational information together and lets people open it from a QR code or NFC tag."
    },
    items: {
      es: [
        ["Accede a tu cuenta", "Inicia sesión con tu correo y contraseña. Si has recibido una invitación, usa la cuenta a la que fue enviada."],
        ["Abre el dashboard", "El dashboard muestra todas las máquinas propias y aquellas que administras."],
        ["Crea tu primera máquina", "Pulsa el botón de añadir, completa los datos básicos y guarda los cambios."],
        ["Completa su ficha", "Añade ubicación, documentación, usuarios y una etiqueta QR/NFC cuando sea necesario."]
      ],
      en: [
        ["Access your account", "Sign in with your email and password. If you received an invitation, use the account it was sent to."],
        ["Open the dashboard", "The dashboard shows the machines you own and those you administer."],
        ["Create your first machine", "Use the add button, complete the basic details and save your changes."],
        ["Complete its record", "Add its location, documents, users and a QR/NFC tag when needed."]
      ]
    }
  },
  {
    id: "dashboard",
    title: { es: "Dashboard y organización", en: "Dashboard and organisation" },
    intro: {
      es: "Organiza el parque de máquinas para encontrar rápidamente lo que necesita atención.",
      en: "Organise your machine fleet so that anything requiring attention is easy to find."
    },
    bullets: {
      es: [
        "Busca máquinas por nombre o ubicación.",
        "Alterna entre la vista agrupada y la lista plana sin cambiar la organización guardada.",
        "Ordena manualmente, por incidencias o por nombre.",
        "Crea grupos arrastrando una máquina sobre otra y usa el menú del grupo para renombrarlo o anidarlo.",
        "En pantallas grandes, el árbol lateral permite filtrar por grupos y ocultar ramas localmente."
      ],
      en: [
        "Search for machines by name or location.",
        "Switch between grouped and flat views without changing the saved organisation.",
        "Sort manually, by incidents or by name.",
        "Create groups by dragging one machine onto another, then use the group menu to rename or nest them.",
        "On large screens, the side tree filters by group and can hide branches locally."
      ]
    }
  },
  {
    id: "ficha-maquina",
    title: { es: "Ficha de una máquina", en: "Machine record" },
    intro: {
      es: "Cada tarjeta concentra el trabajo diario de una máquina en varias pestañas.",
      en: "Each card brings the day-to-day work for a machine together in several tabs."
    },
    items: {
      es: [
        ["Tareas", "Consulta el trabajo pendiente, añade tareas y registra su finalización con notas o imágenes."],
        ["Historial", "Revisa cronológicamente los cambios y actuaciones registrados."],
        ["Estadísticas", "Consulta indicadores de actividad y rendimiento de la máquina."],
        ["General", "Guarda datos identificativos, placa, manual PDF y documentación adicional."],
        ["Configuración", "Gestiona ubicación, administradores, usuarios operativos, Tag ID y acciones de propiedad."]
      ],
      en: [
        ["Tasks", "Review pending work, add tasks and record completion with notes or images."],
        ["History", "Review recorded changes and actions in chronological order."],
        ["Statistics", "Check machine activity and performance indicators."],
        ["General", "Store identification data, the plate image, PDF manual and additional documents."],
        ["Settings", "Manage location, administrators, operators, Tag ID and ownership actions."]
      ]
    }
  },
  {
    id: "estados-incidencias",
    title: { es: "Estados e incidencias", en: "Statuses and incidents" },
    intro: {
      es: "El estado comunica de un vistazo si una máquina está operativa o necesita intervención.",
      en: "The status shows at a glance whether a machine is operational or needs attention."
    },
    bullets: {
      es: [
        "Al marcar una máquina fuera de servicio, describe la incidencia para conservar el contexto.",
        "Unatomo crea o conserva una tarea de seguimiento vinculada a la incidencia.",
        "Completar esa tarea devuelve la máquina al estado operativo y conserva sus notas e imágenes.",
        "Los cambios relevantes quedan reflejados en el historial."
      ],
      en: [
        "When marking a machine out of service, describe the incident to retain its context.",
        "Unatomo creates or keeps a follow-up task linked to the incident.",
        "Completing that task returns the machine to operational status while retaining its notes and images.",
        "Relevant changes are recorded in the history."
      ]
    }
  },
  {
    id: "tareas",
    title: { es: "Tareas", en: "Tasks" },
    intro: {
      es: "Las tareas convierten una necesidad operativa en trabajo asignable y verificable.",
      en: "Tasks turn an operational need into assignable, verifiable work."
    },
    bullets: {
      es: [
        "Crea una tarea desde la máquina o desde la vista global de Tareas.",
        "Indica el trabajo a realizar y, si corresponde, asígnalo a un usuario con acceso.",
        "Añade notas e imágenes para dejar constancia del avance.",
        "Al completarla, registra el resultado. Las tareas ligadas a una incidencia pueden restablecer el estado operativo."
      ],
      en: [
        "Create a task from the machine or the account-wide Tasks view.",
        "Describe the work and, where appropriate, assign it to a user with access.",
        "Add notes and images to record progress.",
        "When completing it, record the result. Incident-linked tasks can restore operational status."
      ]
    }
  },
  {
    id: "documentos-galeria",
    title: { es: "Documentos y galería", en: "Documents and gallery" },
    intro: {
      es: "La documentación queda asociada a la máquina para que esté disponible donde se necesita.",
      en: "Documentation stays associated with the machine so it is available where it is needed."
    },
    items: {
      es: [
        ["Placa", "Sube una imagen JPG, PNG o WebP. La aplicación la adapta antes de guardarla."],
        ["Manual", "Sube un único PDF de hasta 25 MB. Al reemplazarlo, el anterior permanece disponible hasta que el nuevo termina correctamente."],
        ["Otra documentación", "Añade PDF o imágenes, hasta 10 archivos y 100 MB por selección, con un máximo de 25 MB por archivo."],
        ["Galería", "Consulta conjuntamente los archivos de las máquinas visibles y filtra el resultado por máquina o grupo."]
      ],
      en: [
        ["Plate", "Upload a JPG, PNG or WebP image. The application adapts it before storing it."],
        ["Manual", "Upload one PDF up to 25 MB. During replacement, the previous file remains available until the new upload succeeds."],
        ["Other documentation", "Add PDFs or images, up to 10 files and 100 MB per selection, with a 25 MB limit per file."],
        ["Gallery", "Browse files from all visible machines together and filter by machine or group."]
      ]
    }
  },
  {
    id: "usuarios-permisos",
    title: { es: "Usuarios y permisos", en: "Users and permissions" },
    intro: {
      es: "El acceso depende del tipo de usuario y de las máquinas que tenga asignadas.",
      en: "Access depends on the type of user and the machines assigned to them."
    },
    items: {
      es: [
        ["Propietario", "Controla la máquina, sus datos, accesos, administradores y transferencia de propiedad."],
        ["Administrador", "Accede mediante una invitación explícita y administra las máquinas que ha aceptado."],
        ["Usuario operativo", "Accede a las máquinas asignadas con un nombre de usuario y PIN; sus capacidades dependen del rol configurado."],
        ["Vista Usuarios", "Permite revisar usuarios, asignaciones y capacidades desde una visión global de la cuenta."]
      ],
      en: [
        ["Owner", "Controls the machine, its data, access, administrators and ownership transfer."],
        ["Administrator", "Joins through an explicit invitation and manages the machines they have accepted."],
        ["Operator", "Accesses assigned machines with a username and PIN; capabilities depend on the configured role."],
        ["Users view", "Provides an account-wide view of users, assignments and capabilities."]
      ]
    }
  },
  {
    id: "qr-nfc",
    title: { es: "Tags NFC y códigos QR", en: "NFC tags and QR codes" },
    intro: {
      es: "Un Tag ID conecta una etiqueta física con la ficha digital correcta.",
      en: "A Tag ID connects a physical label with the correct digital record."
    },
    steps: {
      es: [
        "Abre Configuración en la tarjeta de la máquina.",
        "Crea o asigna un Tag ID y genera su código QR.",
        "Abre la vista de impresión para preparar la etiqueta física.",
        "Coloca el QR o programa la etiqueta NFC con la URL generada.",
        "Escanea la etiqueta con un móvil para comprobar que abre la máquina correcta antes de ponerla en servicio."
      ],
      en: [
        "Open Settings on the machine card.",
        "Create or assign a Tag ID and generate its QR code.",
        "Open the print view to prepare the physical label.",
        "Place the QR code or program the NFC tag with the generated URL.",
        "Scan the label with a phone to verify it opens the correct machine before putting it into service."
      ]
    },
    note: {
      es: "No reutilices una etiqueta sin desconectarla antes de su máquina anterior.",
      en: "Do not reuse a label without first disconnecting it from its previous machine."
    }
  },
  {
    id: "vistas-globales",
    title: { es: "Registro y estadísticas", en: "Registry and statistics" },
    intro: {
      es: "Las vistas globales permiten trabajar con el conjunto de máquinas visibles sin abrirlas una a una.",
      en: "Account-wide views let you work across all visible machines without opening them one by one."
    },
    items: {
      es: [
        ["Registro", "Reúne los eventos de todas las máquinas y los ordena del más reciente al más antiguo."],
        ["Estadísticas", "Resume el estado del parque, el rendimiento del periodo, los puntos de atención y la comparación entre máquinas."],
        ["Filtros", "En pantallas grandes puedes limitar estas vistas a una rama del árbol, un grupo o una máquina."]
      ],
      en: [
        ["Registry", "Combines events from every machine and orders them from newest to oldest."],
        ["Statistics", "Summarises fleet status, period performance, attention points and machine comparisons."],
        ["Filters", "On large screens you can limit these views to a tree branch, group or individual machine."]
      ]
    }
  },
  {
    id: "configuracion-notificaciones",
    title: { es: "Configuración y notificaciones", en: "Settings and notifications" },
    intro: {
      es: "La configuración de cuenta reúne preferencias personales, seguridad y avisos operativos.",
      en: "Account settings bring together personal preferences, security and operational alerts."
    },
    bullets: {
      es: [
        "Cambia idioma, tema, nombre, imagen de perfil y orden de pestañas.",
        "Consulta el almacenamiento utilizado por documentos y códigos QR.",
        "Configura qué alertas operativas deseas recibir por correo.",
        "Cambia el correo o la contraseña desde el apartado de seguridad.",
        "La campana reúne avisos pendientes e invitaciones que requieren una acción."
      ],
      en: [
        "Change language, theme, name, profile image and tab order.",
        "Review storage used by documents and QR codes.",
        "Choose which operational alerts you want to receive by email.",
        "Change your email or password in the security section.",
        "The bell brings together pending notices and invitations requiring action."
      ]
    }
  },
  {
    id: "movil",
    title: { es: "Uso desde el móvil", en: "Using a phone" },
    intro: {
      es: "La navegación móvil prioriza la consulta rápida junto a la máquina.",
      en: "Mobile navigation prioritises quick access while standing beside the machine."
    },
    bullets: {
      es: [
        "Usa Escanear para leer un QR con la cámara del dispositivo.",
        "La navegación inferior da acceso a las áreas operativas principales.",
        "El botón Más agrupa las páginas secundarias.",
        "Para adjuntar evidencias, permite el acceso a la cámara o selecciona imágenes existentes."
      ],
      en: [
        "Use Scan to read a QR code with the device camera.",
        "The bottom navigation provides access to the main operational areas.",
        "The More button groups secondary pages.",
        "To attach evidence, allow camera access or choose existing images."
      ]
    }
  },
  {
    id: "preguntas-frecuentes",
    title: { es: "Preguntas frecuentes", en: "Frequently asked questions" },
    intro: {
      es: "Respuestas rápidas para las dudas más habituales.",
      en: "Quick answers to common questions."
    },
    items: {
      es: [
        ["¿Por qué no veo una máquina?", "Comprueba que has iniciado sesión con la cuenta correcta y que la propiedad, invitación o asignación sigue activa."],
        ["¿Por qué no puedo modificar algo?", "Las acciones disponibles dependen de tu papel y de las capacidades asignadas para esa máquina."],
        ["¿Qué ocurre si falla una subida?", "El archivo no se incorpora a la ficha. En la sustitución del manual, el documento anterior se conserva hasta que el nuevo esté listo."],
        ["¿Por qué un grupo no aparece?", "Puede estar oculto localmente en este navegador. Usa el control de visibilidad o restaura todos los grupos."],
        ["¿Puedo usar una misma etiqueta en dos máquinas?", "No. Cada Tag ID debe apuntar a una única máquina."]
      ],
      en: [
        ["Why can’t I see a machine?", "Check that you signed in with the correct account and that its ownership, invitation or assignment is still active."],
        ["Why can’t I change something?", "Available actions depend on your role and the capabilities assigned for that machine."],
        ["What happens if an upload fails?", "The file is not added to the record. When replacing a manual, the previous document is retained until the new one is ready."],
        ["Why is a group missing?", "It may be hidden locally in this browser. Use the visibility control or restore all groups."],
        ["Can the same tag be used for two machines?", "No. Each Tag ID must point to one machine only."]
      ]
    }
  }
];
