import { auth, db, functions, getUserRegistrationState } from "/static/js/registro/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { initPublicNfcLandingStats } from "/static/js/nfc-landing/publicStats.js";

const copy = {
  es: {
    pageTitle: "UNATOMO/NFC · ¿Ya hablas con tus máquinas?",
    pageDescription: "Vincula cada máquina a una ficha digital accesible mediante QR o NFC y reúne su estado, tareas, historial y documentación.",
    languageLabel: "Idioma", slogan: "¿Ya hablas con tus máquinas?",
    introLead: "Vincula cada máquina a una ficha digital accesible mediante QR o NFC.",
    introDetail: "Al iniciar sesión puedes gestionar las máquinas a las que tienes acceso y trabajar con su estado, tareas, historial, documentación y personas autorizadas.",
    statsLabel: "Actividad real en UNATOMO/NFC", statsEyebrow: "Ya en uso", statsMachines: "Equipos registrados", statsUsers: "Usuarios activos", statsTags: "Etiquetas QR/NFC vinculadas",
    detailsOpen: "Más información",
    login: "Iniciar sesión", openDashboard: "Abrir dashboard", register: "Registrarse",
    registerTitle: "Registro", registerPrompt: "¿Tienes un código de acceso?", haveCode: "Sí, tengo un código", noCode: "No, solicitar uno",
    whatLabel: "La máquina como referencia", whatTitle: "La información útil, reunida alrededor de cada equipo.",
    whatTextOne: "El contexto operativo suele quedar repartido entre mensajes, papeles, fotografías sueltas y la memoria de quienes han trabajado sobre una máquina.",
    whatTextTwo: "UNATOMO/NFC ofrece un lugar común para consultar qué máquina es, cuál es su estado, qué trabajo tiene pendiente y qué información se ha registrado hasta ahora.",
    statusIncidents: "Estado e incidencias", statusIncidentsText: "Situación actual, tareas asociadas y seguimiento hasta recuperar la operatividad.",
    tasksHistory: "Tareas e historial", tasksHistoryText: "Trabajo pendiente, notas y registro de los cambios realizados.",
    documentation: "Documentación", documentationText: "Placas, fotografías, manuales, notas técnicas y otros archivos.",
    peopleAccess: "Personas y acceso", peopleAccessText: "Propietarios, administradores y usuarios autorizados según su relación con la máquina.",
    flowLabel: "Acceso mediante QR o NFC", flowTitle: "La etiqueta identifica la máquina. Los permisos determinan el acceso.",
    qrFrameLabel: "Código QR de UNATOMO/NFC", qrFrameCaption: "Escanea este código para abrir la información pública sobre Tags físicos.", qrAlt: "Código QR para abrir la sección Tags físicos", flowOneTitle: "Escanear o acercar", flowOneText: "El QR o la etiqueta NFC abre el acceso correspondiente a esa máquina.",
    flowTwoTitle: "Identificarse", flowTwoText: "La etiqueta no funciona como autorización. El usuario accede con su identidad.",
    flowThreeTitle: "Trabajar con permiso", flowThreeText: "La aplicación muestra la información y las acciones disponibles para ese usuario.",
    betaLabel: "Beta activa", realTitle: "Conectando máquinas y personas en entornos reales.",
    realTextOne: "Ya existen máquinas, códigos QR y usuarios reales utilizando UNATOMO/NFC para registrar incidencias, consultar información y mantener un contexto compartido.",
    realTextTwo: "La aplicación continúa evolucionando a partir de ese uso diario. La beta describe un desarrollo activo, no una demostración ni un prototipo.",
    factMachines: "Equipos registrados y accesibles", factTags: "Etiquetas QR y NFC vinculadas", factStatus: "Estado e incidencias registradas", factTasks: "Tareas y seguimiento operativo", factHistory: "Historial de acciones y anotaciones", factImages: "Fotografías y galería por equipo", factDocuments: "Manuales, placas y documentación técnica", factAccess: "Personas autorizadas y control de acceso",
    registrationAccessTitle: "¿Quieres acceder a UNATOMO/NFC?", registrationAccessText: "Las nuevas cuentas se crean mediante código de acceso. Puedes registrarte si ya tienes uno o solicitarlo.",
    accessCopy: "Introduce el código para crear tu cuenta.", codePlaceholder: "Código", continue: "Continuar", privacy: "Política de privacidad y cookies"
  },
  en: {
    pageTitle: "UNATOMO/NFC · Do you already talk to your machines?",
    pageDescription: "Link each machine to a digital record available through QR or NFC, bringing together status, tasks, history and documents.",
    languageLabel: "Language", slogan: "Do you already talk to your machines?",
    introLead: "Link each machine to a digital record available through QR or NFC.",
    introDetail: "Once signed in, you can manage the machines you have access to and work with their status, tasks, history, documents and authorised people.",
    statsLabel: "Real activity in UNATOMO/NFC", statsEyebrow: "Already in use", statsMachines: "Registered equipment", statsUsers: "Active users", statsTags: "Linked QR/NFC tags",
    detailsOpen: "More information",
    login: "Sign in", openDashboard: "Open dashboard", register: "Register",
    registerTitle: "Registration", registerPrompt: "Do you have an access code?", haveCode: "Yes, I have a code", noCode: "No, request one",
    whatLabel: "The machine as a reference", whatTitle: "Useful information, gathered around each machine.",
    whatTextOne: "Operational context is often split across messages, paperwork, loose photographs and the memory of those who have worked on a machine.",
    whatTextTwo: "UNATOMO/NFC provides one place to check which machine it is, its current status, the work still pending and the information recorded so far.",
    statusIncidents: "Status and incidents", statusIncidentsText: "Current situation, related tasks and follow-up until operation is restored.",
    tasksHistory: "Tasks and history", tasksHistoryText: "Pending work, notes and a record of the changes made.",
    documentation: "Documentation", documentationText: "Nameplates, photographs, manuals, technical notes and other files.",
    peopleAccess: "People and access", peopleAccessText: "Owners, administrators and authorised users according to their relationship with the machine.",
    flowLabel: "Access through QR or NFC", flowTitle: "The tag identifies the machine. Permissions determine access.",
    qrFrameLabel: "UNATOMO/NFC QR code", qrFrameCaption: "Scan this code to open the public information about Physical tags.", qrAlt: "QR code to open the Physical tags section", flowOneTitle: "Scan or tap", flowOneText: "The QR or NFC tag opens the access point for that machine.",
    flowTwoTitle: "Identify yourself", flowTwoText: "The tag is not an authorisation method. The user signs in with their identity.",
    flowThreeTitle: "Work with permission", flowThreeText: "The application shows the information and actions available to that user.",
    betaLabel: "Active beta", realTitle: "Connecting machines and people in real environments.",
    realTextOne: "Real machines, QR codes and users already use UNATOMO/NFC to report incidents, consult information and maintain a shared context.",
    realTextTwo: "The application continues to evolve through that daily use. Beta describes active development, not a demonstration or prototype.",
    factMachines: "Registered and accessible equipment", factTags: "Linked QR and NFC tags", factStatus: "Recorded status and incidents", factTasks: "Tasks and operational follow-up", factHistory: "Action and note history", factImages: "Photos and gallery for each machine", factDocuments: "Manuals, plates and technical documentation", factAccess: "Authorized people and access control",
    registrationAccessTitle: "Want to access UNATOMO/NFC?", registrationAccessText: "New accounts are created with an access code. Register if you already have one, or request one from us.",
    accessCopy: "Enter the code to create your account.", codePlaceholder: "Code", continue: "Continue", privacy: "Privacy and cookie policy"
  }
};

const lang = document.documentElement.lang === "en" ? "en" : "es";
const text = copy[lang];

document.title = text.pageTitle;
document.getElementById("page-description")?.setAttribute("content", text.pageDescription);
document.querySelectorAll("[data-i18n]").forEach((element) => {
  const value = text[element.dataset.i18n];
  if (value != null) element.textContent = value;
});
document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
  const value = text[element.dataset.i18nAria];
  if (value) element.setAttribute("aria-label", value);
});
document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
  const value = text[element.dataset.i18nPlaceholder];
  if (value) element.setAttribute("placeholder", value);
});
document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
  const value = text[element.dataset.i18nAlt];
  if (value) element.setAttribute("alt", value);
});

document.querySelectorAll("[data-set-lang]").forEach((button) => {
  const targetLang = button.dataset.setLang;
  button.addEventListener("click", () => {
    if (targetLang !== "es" && targetLang !== "en") return;
    try { localStorage.setItem("unatomo_lang", targetLang); } catch {}
    window.location.reload();
  });
});

const langToggle = document.getElementById("lang-toggle");
const langMenu = document.getElementById("lang-menu");
const langLabel = langToggle?.querySelector(".landing-lang-label");
if (langLabel) langLabel.textContent = lang.toUpperCase();

const closeLangMenu = () => {
  if (!langToggle || !langMenu) return;
  langMenu.hidden = true;
  langToggle.setAttribute("aria-expanded", "false");
};

langToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  const willOpen = langMenu?.hidden === true;
  if (!langMenu) return;
  langMenu.hidden = !willOpen;
  langToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".landing-lang-picker")) return;
  closeLangMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLangMenu();
});

const localized = {
  login: lang === "en" ? "/nfc/en/auth/login.html" : "/nfc/es/auth/login.html",
  dashboard: lang === "en" ? "/nfc/en/index.html#/dashboard" : "/nfc/es/index.html#/dashboard",
  contact: lang === "en" ? "/nfc/en/contacto.html" : "/nfc/es/contacto.html",
  privacy: lang === "en" ? "/nfc/en/privacidad.html" : "/nfc/es/privacidad.html"
};

const LANDING_RETURN_STATE_KEY = "unatomoNfcLandingReturn";
let suppressDashboardRedirect = false;
let dashboardRedirectStarted = false;

const consumeLandingReturnState = () => {
  const currentState = window.history.state;
  if (!currentState || currentState[LANDING_RETURN_STATE_KEY] !== true) return false;
  const nextState = {...currentState};
  delete nextState[LANDING_RETURN_STATE_KEY];
  window.history.replaceState(nextState, "", window.location.href);
  return true;
};

const markLandingReturnState = () => {
  const currentState = window.history.state;
  const nextState = currentState && typeof currentState === "object"
    ? {...currentState}
    : {};
  nextState[LANDING_RETURN_STATE_KEY] = true;
  window.history.replaceState(nextState, "", window.location.href);
};

suppressDashboardRedirect = consumeLandingReturnState();
window.addEventListener("pageshow", () => {
  if (consumeLandingReturnState()) suppressDashboardRedirect = true;
});

document.querySelectorAll("[data-session-cta]").forEach((link) => { link.href = localized.login; });
document.getElementById("request-code-link")?.setAttribute("href", `${localized.contact}?subject=registration`);
document.getElementById("footer-privacy")?.setAttribute("href", localized.privacy);
const landingQr = document.getElementById("landing-qr-code");
if (landingQr) landingQr.src = lang === "en" ? "/static/img/nfc-tags-qr-en.png" : "/static/img/nfc-tags-qr-es.png";

const detailsToggle = document.getElementById("landing-details-toggle");
const landingDetails = document.getElementById("landing-details");
let detailsScrollTimeout = 0;

const scrollToLandingDetails = () => {
  if (!landingDetails) return;
  const headerHeight = document.querySelector(".landing-header")?.offsetHeight || 0;
  const top = Math.max(
    0,
    window.scrollY + landingDetails.getBoundingClientRect().top - headerHeight - 18,
  );
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({top, behavior: reducedMotion ? "auto" : "smooth"});
};

const openLandingDetails = () => {
  if (!detailsToggle || !landingDetails) return;
  if (detailsToggle.getAttribute("aria-expanded") === "true") return;
  window.clearTimeout(detailsScrollTimeout);
  detailsToggle.setAttribute("aria-expanded", "true");
  landingDetails.hidden = false;
  window.requestAnimationFrame(() => {
    landingDetails.classList.add("is-open");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    detailsScrollTimeout = window.setTimeout(scrollToLandingDetails, reducedMotion ? 0 : 280);
  });
};

detailsToggle?.addEventListener("click", openLandingDetails);

void initPublicNfcLandingStats({db, functions, lang});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const registration = await getUserRegistrationState(user);
    if (!registration.allowed) return;
    document.querySelectorAll("[data-session-cta]").forEach((link) => {
      link.href = localized.dashboard;
      link.textContent = text.openDashboard;
      link.onclick = markLandingReturnState;
    });
    if (suppressDashboardRedirect || dashboardRedirectStarted) return;
    dashboardRedirectStarted = true;
    markLandingReturnState();
    window.location.assign(localized.dashboard);
  } catch {}
});
