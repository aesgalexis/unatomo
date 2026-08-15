import { localizeEsPath } from "/static/js/site/locale.js";

export const QR_SIZE_STEPS = [76, 100, 132, 168, 210, 260];
export const PRINT_COLUMNS_BY_STEP = [5, 4, 3, 2, 2, 1];
export const GRID_GAP_BY_STEP = ["0.7rem", "0.85rem", "1rem", "1.2rem", "1.45rem", "1.65rem"];
export const PRINT_ROWS_BY_STEP = [6, 5, 4, 3, 3, 2];

export const PRINT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9V3h12v6"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v7H6z"></path></svg>`;
export const ZOOM_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4.5 4.5"></path><path d="M10.5 8v5"></path><path d="M8 10.5h5"></path></svg>`;
export const OPTIONS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 6h10a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h6a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zm0 7h2a1 1 0 1 0 0-2H7a1 1 0 0 0 0 2zM4 5l2 2 2-2H4zm0 7l2 2 2-2H4zm0 7l2 2 2-2H4z"/></svg>';

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
    options: isEn ? "QR options" : "Opciones QR",
    search: isEn ? "Search QR by machine title" : "Buscar QR por titulo de maquina",
    searchPlaceholder: isEn ? "Search by title..." : "Buscar por titulo...",
    remove: isEn ? "Remove from print sheet" : "Quitar de la hoja",
    size: isEn ? "QR size" : "Tamaño QR",
    frame: isEn ? "Frame" : "Marco",
    backNames: isEn ? "Back names" : "Nombre reverso",
    sectionNavAria: isEn ? "Sections" : "Secciones",
    navDashboard: "Dashboard",
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

export const createQrOptionsMenu = ({ text, frameEnabled, backNamesEnabled, onFrameChange, onBackNamesChange }) => {
  const wrap = document.createElement("div");
  wrap.className = "qr-print-options-menu";
  const button = createQrIconButton("qr-print-options-menu-toggle", text.options, OPTIONS_ICON);
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  const panel = document.createElement("div");
  panel.className = "qr-print-options-menu-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;

  const close = () => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };
  const addToggle = (labelText, enabled, onToggle) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "qr-print-options-menu-item";
    option.setAttribute("role", "menuitemcheckbox");
    option.setAttribute("aria-checked", enabled ? "true" : "false");
    const check = document.createElement("span");
    check.className = "qr-print-options-menu-check";
    check.textContent = enabled ? "\u2713" : "";
    const label = document.createElement("span");
    label.textContent = labelText;
    option.append(check, label);
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle(!enabled);
      close();
    });
    panel.appendChild(option);
  };
  addToggle(text.frame, frameEnabled, onFrameChange);
  addToggle(text.backNames, backNamesEnabled, onBackNamesChange);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const handleDocumentClick = (event) => {
    if (!wrap.isConnected) {
      document.removeEventListener("click", handleDocumentClick);
      return;
    }
    if (!wrap.contains(event.target)) close();
  };
  document.addEventListener("click", handleDocumentClick);
  wrap.append(button, panel);
  return wrap;
};
