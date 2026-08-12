import { localizeEsPath } from "/static/js/site/locale.js";

export const createPanelText = (isEn) => {
  const text = {
    systemTitle: isEn ? "System status" : "Estado del sistema",
    systemLoading: isEn ? "Checking system..." : "Comprobando sistema...",
    systemError: isEn
      ? "Unable to retrieve system status."
      : "No se ha podido obtener el estado del sistema.",
    systemHint: isEn
      ? "Live read-only overview of the production system."
      : "Resumen en vivo y de solo lectura del sistema de producción.",
    systemChecked: isEn ? "Checked" : "Comprobado",
    systemFunctions: "Functions",
    systemFirestore: "Firestore",
    systemAuthentication: "Authentication",
    systemIntegrity: isEn ? "Data integrity" : "Integridad de datos",
    systemHealthy: isEn ? "Healthy" : "Correcto",
    systemWarning: isEn ? "Warnings" : "Avisos",
    systemUsers: isEn ? "Users" : "Usuarios",
    systemAccountHandles: isEn ? "Usernames" : "Nombres de usuario",
    systemMachines: isEn ? "Machines" : "Máquinas",
    systemOperational: isEn ? "Operational" : "Operativas",
    systemOutOfService: isEn ? "Out of service" : "Fuera de servicio",
    systemTags: "Tags",
    systemPendingTasks: isEn ? "Pending tasks" : "Tareas pendientes",
    systemPendingTodos: isEn ? "Pending global tasks" : "Tareas globales pendientes",
    systemOpenSuggestions: isEn ? "Open suggestions" : "Sugerencias abiertas",
    systemPendingInvites: isEn ? "Pending invites" : "Invitaciones pendientes",
    systemPendingTransfers: isEn ? "Pending transfers" : "Transferencias pendientes",
    integrityTitle: isEn ? "Data integrity" : "Integridad de datos",
    integrityLoading: isEn ? "Checking relationships..." : "Comprobando relaciones...",
    integrityError: isEn
      ? "Unable to run integrity checks."
      : "No se han podido ejecutar las comprobaciones de integridad.",
    integrityHint: isEn
      ? "Read-only checks across machines, owners, Tags, access and invitations."
      : "Comprobaciones de solo lectura entre máquinas, propietarios, Tags, accesos e invitaciones.",
    integrityOk: isEn ? "No inconsistencies detected" : "No se detectaron inconsistencias",
    integrityIssues: isEn ? "Inconsistencies detected" : "Inconsistencias detectadas",
    integritySamples: isEn ? "Examples" : "Ejemplos",
    integrityStoragePending: isEn
      ? "Physical Storage objects are not checked in this phase."
      : "Los objetos físicos de Storage no se comprueban en esta fase.",
    integrityScopeLimited: isEn
      ? "At least one collection reached the current inspection limit."
      : "Al menos una colección alcanzó el límite actual de inspección.",
    integrityIssueLabels: {
      "machine-missing-owner": isEn ? "Machines without owner" : "Máquinas sin propietario",
      "machine-owner-not-in-auth": isEn ? "Machine owners missing from Auth" : "Propietarios ausentes en Auth",
      "machine-tag-missing": isEn ? "Machines referencing a missing Tag" : "Máquinas con Tag inexistente",
      "machine-access-missing": isEn ? "Tagged machines without access record" : "Máquinas con Tag sin acceso",
      "duplicate-machine-tag": isEn ? "Tags assigned to multiple machines" : "Tags asignados a varias máquinas",
      "assigned-tag-missing-machine": isEn ? "Assigned Tags without machine" : "Tags asignados sin máquina",
      "tag-machine-missing": isEn ? "Tags referencing a missing machine" : "Tags con máquina inexistente",
      "tag-machine-mismatch": isEn ? "Tag and machine assignment mismatch" : "Asignación Tag-máquina inconsistente",
      "tag-owner-mismatch": isEn ? "Tag and machine owner mismatch" : "Propietario de Tag inconsistente",
      "tag-access-missing": isEn ? "Assigned Tags without access record" : "Tags asignados sin acceso",
      "access-tag-missing": isEn ? "Access records without Tag" : "Accesos sin Tag",
      "access-machine-missing": isEn ? "Access records without machine" : "Accesos sin máquina",
      "admin-link-machine-missing": isEn ? "Admin links without machine" : "Enlaces de administrador sin máquina",
      "invite-machine-missing": isEn ? "Pending invites without machine" : "Invitaciones pendientes sin máquina",
      "transfer-machine-missing": isEn ? "Pending transfers without machine" : "Transferencias pendientes sin máquina",
    },
    codeStatsTitle: isEn ? "Application code" : "C\u00f3digo de aplicaci\u00f3n",
    codeStatsLoading: isEn ? "Loading code stats..." : "Cargando estad\u00edsticas de c\u00f3digo...",
    codeStatsError: isEn ? "Unable to load code stats." : "No se han podido cargar las estad\u00edsticas de c\u00f3digo.",
    codeStatsHint: isEn
      ? "Source lines counted during the last static build."
      : "L\u00edneas fuente contadas durante el \u00faltimo build est\u00e1tico.",
    codeStatsLines: isEn
      ? (value) => `${value} lines of code running this application`
      : (value) => `${value} l\u00edneas de c\u00f3digo corriendo esta aplicaci\u00f3n`,
    backupTitle: isEn ? "Backup" : "Respaldo",
    backupLoading: isEn ? "Loading backup status..." : "Cargando estado de respaldo...",
    backupError: isEn ? "Unable to load backup status." : "No se ha podido cargar el estado de respaldo.",
    backupHint: isEn
      ? "Local NFC backup status. Snapshot files stay outside the repository."
      : "Estado local del respaldo NFC. Los snapshots quedan fuera del repositorio.",
    backupPending: isEn ? "No backup recorded yet" : "Sin respaldo registrado",
    backupOk: isEn ? "Ready" : "Correcto",
    backupPartial: isEn ? "Partial" : "Parcial",
    backupRunning: isEn ? "Running" : "En curso",
    backupFailed: isEn ? "Needs attention" : "Revisar",
    backupOverall: isEn ? "Current backup scope" : "Alcance actual del respaldo",
    backupFirestore: isEn ? "Firestore data" : "Datos Firestore",
    backupStorage: isEn ? "Storage inventory" : "Inventario Storage",
    backupAuth: isEn ? "Firebase Authentication" : "Firebase Authentication",
    backupCompleted: isEn ? "Completed" : "Completado",
    backupAge: isEn ? "Age" : "Antigüedad",
    backupCoverage: isEn ? "Included" : "Incluido",
    backupPendingCoverage: isEn ? "Pending" : "Pendiente",
    backupManifest: isEn ? "Manifest" : "Manifiesto",
    backupAttempted: isEn ? "Attempted" : "Intento",
    backupFile: isEn ? "File" : "Archivo",
    backupFolder: isEn ? "Folder" : "Carpeta",
    backupCollections: isEn ? "Collections" : "Colecciones",
    backupDocuments: isEn ? "Documents" : "Documentos",
    backupFiles: isEn ? "Files" : "Archivos",
    backupUsers: isEn ? "Users" : "Usuarios",
    backupSize: isEn ? "Size" : "Tama\u00f1o",
    backupProject: isEn ? "Project" : "Proyecto",
    backupBucket: isEn ? "Bucket" : "Bucket",
    backupCause: isEn ? "Cause" : "Causa",
    backupScopeNames: {
      "legacy-tenant-machines": isEn ? "legacy tenant machines" : "máquinas legacy",
      "restore-tools": isEn ? "restore tools" : "herramientas de restauración",
      "scheduled-execution": isEn ? "scheduled execution" : "ejecución programada",
    },
    whatsNewTitle: isEn ? "What's new" : "Novedades",
    whatsNewLoading: isEn ? "Loading What's new status..." : "Cargando estado de Novedades...",
    whatsNewHint: isEn
      ? "Codex-facing toggle for deciding whether relevant product changes should be added to the public What's new section."
      : "Control orientado a Codex para decidir si los cambios relevantes de producto deben añadirse a la seccion publica Novedades.",
    whatsNewEnabled: isEn ? "Enabled" : "Activado",
    whatsNewDisabled: isEn ? "Disabled" : "Desactivado",
    whatsNewDisable: isEn ? "Disable locally" : "Desactivar localmente",
    whatsNewEnable: isEn ? "Enable locally" : "Activar localmente",
    whatsNewSource: isEn
      ? "Authoritative source: static/data/codex-flags.json"
      : "Fuente autoritativa: static/data/codex-flags.json",
    whatsNewPending: isEn
      ? "Pending: this panel control is not wired to the project flag yet."
      : "Pendiente: este control del panel aun no esta conectado a la flag del proyecto.",
    agentCardTitle: "Codex",
    agentCardHint: isEn
      ? "Local owner-facing identity card for this Codex relationship."
      : "Tarjeta local de identidad para esta relacion con Codex.",
    agentCardLocalOnly: isEn
      ? "Local panel card. Stored role preference stays in this browser; no Firestore write, no callable, no cloud memory."
      : "Tarjeta local del panel. La preferencia de rol queda en este navegador; sin escritura en Firestore, sin callable, sin memoria en la nube.",
    agentRoleLabel: isEn ? "Role" : "Rol",
    agentRoleOptions: [
      {
        value: "local-coding-agent",
        label: isEn ? "Local coding agent" : "Agente local de codigo",
      },
      {
        value: "technical-collaborator",
        label: isEn ? "Technical collaborator" : "Colaborador tecnico",
      },
      {
        value: "project-copilot",
        label: isEn ? "Project copilot" : "Copiloto de proyecto",
      },
    ],
    agentCardFields: {
      name: isEn ? "Name" : "Nombre",
      owner: "Owner",
      interface: isEn ? "Interface" : "Interfaz",
      freedom: isEn ? "Freedom" : "Libertad",
    },
    agentCardValues: {
      name: "Codex",
      owner: "Alexis",
      interface: isEn ? "VS Code Codex extension and chat" : "Extension Codex en VS Code y chat",
      freedom: isEn
        ? "Can inspect, propose, edit, and validate with scoped autonomy inside the project. Publishing, deployments, destructive actions, secrets, and production ownership changes still require explicit owner intent."
        : "Puede inspeccionar, proponer, editar y validar con autonomia acotada dentro del proyecto. Publicaciones, despliegues, acciones destructivas, secretos y cambios de ownership en produccion siguen requiriendo intencion explicita del owner.",
    },
    agentDocsTitle: isEn ? "Project documents" : "Documentos del proyecto",
    agentDocsHint: isEn
      ? "Versioned Markdown files for public project orientation and technical work."
      : "Archivos Markdown versionados para orientacion publica del proyecto y trabajo tecnico.",
    agentDocOpen: isEn ? "Open in VS Code" : "Abrir en VS Code",
    agentDocCopy: isEn ? "Copy path" : "Copiar ruta",
    agentDocCopied: isEn ? "Path copied." : "Ruta copiada.",
    agentDocCopyError: isEn ? "Unable to copy path." : "No se ha podido copiar la ruta.",
    agentDocuments: [
      {
        title: "AGENTS.md",
        path: "AGENTS.md",
        description: isEn
          ? "Repository-level operating instructions for Codex."
          : "Instrucciones operativas del repositorio para Codex.",
      },
      {
        title: "Project overview",
        path: "docs/PROJECT_OVERVIEW.md",
        description: isEn
          ? "Human-readable summary of what Unatomo does and how it is shaped."
          : "Resumen legible de que hace Unatomo y como esta enfocado.",
      },
      {
        title: "Repository map",
        path: "docs/REPO_MAP.md",
        description: isEn
          ? "Quick source layout and documentation routing."
          : "Mapa rapido del codigo y ruta de documentacion.",
      },
      {
        title: "Dashboard model",
        path: "docs/DASHBOARD_MODEL.md",
        description: isEn
          ? "Dashboard, machine cards, QR, Tag ID, menu, and i18n notes."
          : "Notas de dashboard, tarjetas, QR, Tag ID, menu e i18n.",
      },
      {
        title: "Firebase model",
        path: "docs/FIREBASE_MODEL.md",
        description: isEn
          ? "Firebase data flows, permissions, Functions, and cleanup rules."
          : "Flujos Firebase, permisos, Functions y reglas de limpieza.",
      },
      {
        title: "Contributing",
        path: "CONTRIBUTING.md",
        description: isEn
          ? "Human contribution rules and local validation expectations."
          : "Reglas humanas de contribucion y validacion local esperada.",
      },
    ],
    preferencesTitle: isEn ? "Superadmin preferences" : "Preferencias de superadmin",
    emailTemplatesTitle: isEn ? "Transactional emails" : "Correos transaccionales",
    emailTemplatesLoading: isEn ? "Loading templates..." : "Cargando plantillas...",
    emailTemplatesError: isEn ? "Unable to load templates." : "No se han podido cargar las plantillas.",
    emailTemplatesHint: isEn
      ? "Authoritative catalogue rendered by the same backend used for delivery. Active means connected to a production event; Ready means the template is complete but its event is pending."
      : "Catálogo autoritativo renderizado por el mismo backend que realiza los envíos. Activa significa conectada a un evento de producción; Lista significa que la plantilla está terminada pero su evento está pendiente.",
    emailTemplatesLanguage: isEn ? "Preview language" : "Idioma de previsualización",
    emailTemplatesName: isEn ? "Template" : "Plantilla",
    emailTemplatesCategory: isEn ? "Category" : "Categoría",
    emailTemplatesSubject: isEn ? "Subject" : "Asunto",
    emailTemplatesStatus: isEn ? "Status" : "Estado",
    emailTemplatesActions: isEn ? "Actions" : "Acciones",
    emailTemplatesActive: isEn ? "Active" : "Activa",
    emailTemplatesReady: isEn ? "Ready · event pending" : "Lista · evento pendiente",
    emailTemplatesPreview: isEn ? "Preview" : "Previsualizar",
    emailTemplatesClose: isEn ? "Close" : "Cerrar",
    emailTemplatesPlainText: isEn ? "Plain text" : "Texto plano",
    emailTemplatesPreviewTitle: isEn
      ? (name) => `Preview of ${name}`
      : (name) => `Previsualización de ${name}`,
    emailTemplateCategories: {
      access: isEn ? "Access" : "Acceso",
      account: isEn ? "Account" : "Cuenta",
      security: isEn ? "Security" : "Seguridad",
      invitation: isEn ? "Invitation" : "Invitación",
    },
    preferencesHint: isEn
      ? "Personal interface options stored only in this browser."
      : "Opciones personales de interfaz guardadas solo en este navegador.",
    languageToggleLabel: isEn
      ? "Show ES/EN selector in the topbar"
      : "Mostrar selector ES/EN en el topbar",
    languageToggleVisible: isEn ? "Visible" : "Visible",
    languageToggleHidden: isEn ? "Hidden" : "Oculto",
    usersTitle: isEn ? "Users" : "Usuarios",
    usersLoading: isEn ? "Loading users..." : "Cargando usuarios...",
    usersEmpty: isEn ? "No users found." : "No se han encontrado usuarios.",
    usersError: isEn ? "Unable to load users." : "No se han podido cargar los usuarios.",
    usersHint: isEn
      ? "Accounts detected through Unatomo sign-in flows."
      : "Cuentas detectadas a través de los flujos de acceso de Unatomo.",
    userCollaborator: isEn ? "Collaborator" : "Colaborador",
    userCollaboratorSaved: isEn
      ? "Collaborator access updated."
      : "Acceso de colaborador actualizado.",
    userCollaboratorError: isEn
      ? "Unable to update collaborator access."
      : "No se ha podido actualizar el acceso de colaborador.",
    deleteUser: isEn ? "Delete account" : "Eliminar cuenta",
    usersDeleting: isEn ? "Deleting account..." : "Eliminando cuenta...",
    usersDeleted: isEn
      ? "Account deleted."
      : "Cuenta eliminada.",
    usersActionError: isEn
      ? "Unable to delete account."
      : "No se ha podido eliminar la cuenta.",
    confirmDeleteUser: isEn
      ? (label) => `Delete account ${label}? This will permanently remove the account and all related data, including machines, Tag IDs and QR files. This action cannot be undone.`
      : (label) => `¿Eliminar la cuenta ${label}? Esto eliminará de forma permanente la cuenta y todos sus datos relacionados, incluidas máquinas, Tag ID y archivos QR. Este cambio no se puede deshacer.`,
    codesTitle: isEn ? "Registration codes" : "C\u00f3digos de registro",
    accessRequestsTitle: isEn ? "Access requests" : "Solicitudes de acceso",
    accessRequestsHint: isEn ? "Review requests. Approval creates a personal seven-day code and emails it to the applicant." : "Revisa las solicitudes. Al aprobar se crea un código personal válido durante siete días y se envía por correo.",
    accessRequestsLoading: isEn ? "Loading access requests..." : "Cargando solicitudes de acceso...",
    accessRequestsEmpty: isEn ? "No access requests yet." : "Todavía no hay solicitudes de acceso.",
    accessRequestsError: isEn ? "Unable to load access requests." : "No se han podido cargar las solicitudes.",
    accessRequestApprove: isEn ? "Approve and send" : "Aprobar y enviar",
    accessRequestReject: isEn ? "Reject" : "Rechazar",
    accessRequestCode: isEn ? "Code" : "Código",
    accessRequestStatus: (status) => ({ pending: isEn ? "Pending" : "Pendiente", approved: isEn ? "Approved" : "Aprobada", rejected: isEn ? "Rejected" : "Rechazada" }[status] || status),
    codesLoading: isEn
      ? "Loading active registration codes..."
      : "Cargando c\u00f3digos de registro activos...",
    codesEmpty: isEn
      ? "No active registration codes found."
      : "No se han encontrado c\u00f3digos de registro activos.",
    codesError: isEn
      ? "Unable to load registration codes."
      : "No se han podido cargar los c\u00f3digos de registro.",
    codesHint: isEn
      ? "Unused active registration codes. A code disappears after registering one account."
      : "C\u00f3digos activos sin usar. Cada c\u00f3digo desaparece al registrar una cuenta.",
    codePlaceholder: isEn ? "Custom code (optional)" : "C\u00f3digo personalizado (opcional)",
    addCode: isEn ? "Add code" : "A\u00f1adir c\u00f3digo",
    deleteCode: isEn ? "Delete" : "Eliminar",
    codesSaving: isEn ? "Saving..." : "Guardando...",
    codesDeleting: isEn ? "Deleting..." : "Eliminando...",
    confirmDeleteCode: isEn
      ? (code) => `Delete registration code ${code}?`
      : (code) => `¿Eliminar el código de registro ${code}?`,
    codeCreated: isEn
      ? (code) => `Code created: ${code}`
      : (code) => `C\u00f3digo creado: ${code}`,
    codeDeleted: isEn
      ? (code) => `Code deleted: ${code}`
      : (code) => `C\u00f3digo eliminado: ${code}`,
    codeActionError: isEn
      ? "Unable to update registration codes."
      : "No se han podido actualizar los c\u00f3digos de registro.",
    cleanupLegacyCodes: isEn ? "Remove legacy links" : "Eliminar v\u00ednculos antiguos",
    cleanupLegacyCodesConfirm: isEn
      ? "Remove registration-code references from existing accounts? Account access will not be affected."
      : "\u00bfEliminar las referencias a c\u00f3digos de las cuentas existentes? El acceso de las cuentas no se ver\u00e1 afectado.",
    cleanupLegacyCodesRunning: isEn
      ? "Removing legacy links..."
      : "Eliminando v\u00ednculos antiguos...",
    cleanupLegacyCodesDone: isEn
      ? (count) => `${count} legacy account links removed.`
      : (count) => `Se han eliminado ${count} v\u00ednculos antiguos de cuentas.`,
    noName: isEn ? "Unnamed user" : "Usuario sin nombre",
    noEmail: isEn ? "No email" : "Sin correo",
    tagsTitle: isEn ? "Tag IDs" : "Tag ID",
    tagsLoading: isEn ? "Loading generated Tag IDs..." : "Cargando Tag ID generados...",
    tagsEmpty: isEn ? "No Tag IDs found." : "No se han encontrado Tag ID.",
    tagsError: isEn ? "Unable to load Tag IDs." : "No se han podido cargar los Tag ID.",
    tagsHint: isEn ? "Generated Tag IDs and their current assignment details." : "Tag ID generados y su informacion actual de asignacion.",
    tagIdLabel: isEn ? "Tag ID" : "Tag ID",
    tagMachineLabel: isEn ? "Machine" : "Maquina",
    tagUrlLabel: isEn ? "URL" : "URL",
    tagOwnerLabel: isEn ? "Owner" : "Propietario",
    tagCreatedByLabel: isEn ? "Created by" : "Creado por",
    tagAssignedByLabel: isEn ? "Assigned by" : "Asignado por",
    tagStateLabel: isEn ? "State" : "Estado",
    tagCreatedAtLabel: isEn ? "Created" : "Creado",
    tagAssignedAtLabel: isEn ? "Assigned" : "Asignado",
    noMachine: isEn ? "No machine" : "Sin maquina",
    noData: "-",
    backToHome: localizeEsPath("/es/index.html"),
    login: localizeEsPath("/es/auth/login.html")
  };

  Object.assign(text.integrityIssueLabels, {
    "account-handle-invalid": isEn
      ? "Invalid account usernames"
      : "Nombres de usuario no validos",
    "account-handle-user-missing": isEn
      ? "Usernames without Auth account"
      : "Nombres de usuario sin cuenta Auth",
    "account-handle-profile-mismatch": isEn
      ? "Username and profile mismatch"
      : "Nombre de usuario y perfil inconsistentes",
    "account-handle-duplicate-user": isEn
      ? "Accounts with multiple usernames"
      : "Cuentas con varios nombres de usuario",
    "account-handle-broken-redirect": isEn
      ? "Broken username redirects"
      : "Redirecciones de nombres de usuario rotas"
  });

  return text;
};
