import { localizeEsPath } from "/static/js/site/locale.js";

export const QR_SIZE_STEPS = [76, 100, 132, 168, 210, 260];
export const PRINT_COLUMNS_BY_STEP = [5, 4, 3, 2, 2, 1];
export const GRID_GAP_BY_STEP = ["0.7rem", "0.85rem", "1rem", "1.2rem", "1.45rem", "1.65rem"];
export const PRINT_ROWS_BY_STEP = [6, 5, 4, 3, 3, 2];

export const RELOAD_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.34-5.66"></path><path d="M20 4v5h-5"></path></svg>`;
export const PRINT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9V3h12v6"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v7H6z"></path></svg>`;
export const ZOOM_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4.5 4.5"></path><path d="M10.5 8v5"></path><path d="M8 10.5h5"></path></svg>`;

export const createQrPrintText = (lang) => {
  const isEn = lang === "en";
  return {
    title: isEn ? "QR print" : "Impresión QR",
    loading: isEn ? "Loading..." : "Cargando...",
    empty: isEn ? "No generated QR codes. Generate a Tag ID on a machine to create the first one." : "No hay QRs generados. Genera un Tag ID en una máquina para crear el primero.",
    emptyNoMachines: isEn ? "No machines are available for generating QR codes." : "No hay máquinas disponibles para generar QRs.",
    emptySelectedWithoutQr: isEn ? "This machine does not have a generated QR code yet." : "Esta máquina todavía no tiene un QR generado.",
    qrGenerated: isEn ? "QR generated" : "QR generado",
    error: isEn ? "Unable to load QR codes." : "No se han podido cargar los QRs.",
    print: isEn ? "Print" : "Imprimir",
    printBack: isEn ? "Print back side with machine names?" : "¿Imprimir el reverso con los nombres de las máquinas?",
    reload: isEn ? "Reload QR codes" : "Recargar QRs",
    search: isEn ? "Search QR by machine title" : "Buscar QR por titulo de maquina",
    searchPlaceholder: isEn ? "Search by title..." : "Buscar por titulo...",
    remove: isEn ? "Remove from print sheet" : "Quitar de la hoja",
    size: isEn ? "QR size" : "Tamaño QR",
    frame: isEn ? "Frame" : "Marco",
    backNames: isEn ? "Back names" : "Nombres reverso",
    sectionNavAria: isEn ? "Sections" : "Secciones",
    navDashboard: isEn ? "Home" : "Inicio",
    navRegistry: isEn ? "Registry" : "Registro",
    navQrPrint: isEn ? "QR print" : "Impresión QR",
    navGallery: isEn ? "Gallery" : "Galería",
    navSuggestions: isEn ? "Suggestions" : "Sugerencias",
    navTodo: isEn ? "Tasks" : "Tareas",
    count: (visible, total) => `${visible}/${total}`,
    login: localizeEsPath("/es/auth/login.html", lang),
    home: localizeEsPath("/es/index.html", lang),
    onboarding: localizeEsPath("/es/onboarding.html", lang),
    dashboard: localizeEsPath("/es/index.html", lang),
    qrPrint: localizeEsPath("/es/impresion-qr.html", lang)
  };
};

export const createMobileHeadingGroup = (heading, loading = null) => {
  const group = document.createElement("div");
  group.className = "qr-print-mobile-section-heading";
  group.appendChild(heading);
  if (loading) group.appendChild(loading);
  return group;
};

export const createQrIconButton = (className, label, icon) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `qr-print-icon-button ${className}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon;
  return button;
};
