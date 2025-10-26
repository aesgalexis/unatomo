/* =======================================================================
   mobile_dots.css — Dots como ELEMENTO de la sección (ni fixed ni sticky)
   Pantallas: #screen2 (acerca), #screen3 (servicios), #screen4 (tecno), #screen5 (soft)
   ======================================================================= */

@media (max-width: 1200px) {

  /* Contenedores de dots: elemento normal del flujo, centrado */
  #screen2 .dots-acerca,
  #screen3 .dots,
  #screen4 .dots,
  #screen5 .dots {
    position: static !important;   /* clave: sin fixed/sticky */
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 6px !important;

    height: 44px;                  /* reserva espacio estable bajo las tarjetas */
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;

    opacity: 1 !important;
    pointer-events: auto !important;
  }

  /* Dots individuales */
  #screen2 .dots-acerca .dot,
  #screen3 .dots .dot,
  #screen4 .dots .dot,
  #screen5 .dots .dot {
    width: 6px !important;
    height: 6px !important;
    border-radius: 50% !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    appearance: none !important;
    -webkit-appearance: none !important;
    background: currentColor !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  /* Colores por tema (como en el resto del sitio) */
  :root[data-theme="light"] #screen2 .dots-acerca .dot,
  :root[data-theme="light"] #screen3 .dots .dot,
  :root[data-theme="light"] #screen4 .dots .dot,
  :root[data-theme="light"] #screen5 .dots .dot { color: hsl(0 0% 15% / 0.55) !important; }

  :root[data-theme="light"] #screen2 .dots-acerca .dot[aria-current="true"],
  :root[data-theme="light"] #screen3 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen4 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen5 .dots .dot[aria-current="true"],
  :root[data-theme="light"] #screen2 .dots-acerca .dot.active,
  :root[data-theme="light"] #screen3 .dots .dot.active,
  :root[data-theme="light"] #screen4 .dots .dot.active,
  :root[data-theme="light"] #screen5 .dots .dot.active { color: hsl(0 0% 0%); }

  :root[data-theme="dark"] #screen2 .dots-acerca .dot,
  :root[data-theme="dark"] #screen3 .dots .dot,
  :root[data-theme="dark"] #screen4 .dots .dot,
  :root[data-theme="dark"] #screen5 .dots .dot { color: hsl(0 0% 85% / 0.55) !important; }

  :root[data-theme="dark"] #screen2 .dots-acerca .dot[aria-current="true"],
  :root[data-theme="dark"] #screen3 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen4 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen5 .dots .dot[aria-current="true"],
  :root[data-theme="dark"] #screen2 .dots-acerca .dot.active,
  :root[data-theme="dark"] #screen3 .dots .dot.active,
  :root[data-theme="dark"] #screen4 .dots .dot.active,
  :root[data-theme="dark"] #screen5 .dots .dot.active { color: hsl(0 0% 100%); }

  /* Fallback si NO hay data-theme (seguir el sistema) */
  @media (prefers-color-scheme: light) {
    :root:not([data-theme]) #screen2 .dots-acerca .dot,
    :root:not([data-theme]) #screen3 .dots .dot,
    :root:not([data-theme]) #screen4 .dots .dot,
    :root:not([data-theme]) #screen5 .dots .dot { color: hsl(0 0% 15% / 0.55); }
    :root:not([data-theme]) #screen2 .dots-acerca .dot[aria-current="true"],
    :root:not([data-theme]) #screen3 .dots .dot[aria-current="true"],
    :root:not([data-theme]) #screen4 .dots .dot[aria-current="true"],
    :root:not([data-theme]) #screen5 .dots .dot[aria-current="true"] { color: hsl(0 0% 0%); }
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) #screen2 .dots-acerca .dot,
    :root:not([data-theme]) #screen3 .dots .dot,
    :root:not([data-theme]) #screen4 .dots .dot,
    :root:not([data-theme]) #screen5 .dots .dot { color: hsl(0 0% 85% / 0.55); }
    :root:not([data-theme]) #screen2 .dots-acerca .dot[aria-current="true"],
    :root:not([data-theme]) #screen3 .dots .dot[aria-current="true"],
    :root:not([data-theme]) #screen4 .dots .dot[aria-current="true"],
    :root:not([data-theme]) #screen5 .dots .dot[aria-current="true"] { color: hsl(0 0% 100%); }
  }
}
